-- « J'ai reçu ma commande » côté client, et confirmation automatique si
-- personne ne confirme.
--   livree_at          : heure à laquelle la commande est passée « livrée »
--   recue_confirmee_at : heure à laquelle le client a appuyé « J'ai reçu »
--   livree_auto        : true si c'est la confirmation automatique qui l'a livrée

alter table public.orders add column if not exists livree_at          timestamptz;
alter table public.orders add column if not exists recue_confirmee_at timestamptz;
alter table public.orders add column if not exists livree_auto        boolean not null default false;

-- Historique : on reprend la dernière mise à jour des commandes déjà livrées
update public.orders set livree_at = updated_at where statut = 'livrée' and livree_at is null;

-- livree_at se remplit tout seul, quel que soit celui qui livre
create or replace function public.dater_livraison()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.statut = 'livrée' and old.statut is distinct from 'livrée' then
    new.livree_at := coalesce(new.livree_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dater_livraison on public.orders;
create trigger trg_dater_livraison
  before update on public.orders
  for each row execute function public.dater_livraison();

-- Le client confirme la réception de SA commande en livraison.
--  · prête / en livraison → la commande passe « livrée »
--  · déjà livrée (le livreur a confirmé) → on note seulement la confirmation
create or replace function public.confirmer_reception(p_order_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_cmd orders%rowtype;
begin
  select * into v_cmd from orders where id = p_order_id for update;
  if not found or v_cmd.client_id is distinct from auth.uid() then
    raise exception 'Commande introuvable';
  end if;
  if v_cmd.type <> 'livraison' then
    raise exception 'Seules les commandes en livraison se confirment';
  end if;
  if v_cmd.statut in ('prête', 'en_livraison') then
    update orders set statut = 'livrée', recue_confirmee_at = now() where id = p_order_id;
  elsif v_cmd.statut = 'livrée' then
    update orders set recue_confirmee_at = coalesce(recue_confirmee_at, now()) where id = p_order_id;
  else
    raise exception 'Cette commande ne peut pas encore être confirmée';
  end if;
  return 'livrée';
end;
$$;

revoke all on function public.confirmer_reception(uuid) from public, anon;
grant execute on function public.confirmer_reception(uuid) to authenticated;

-- Confirmation automatique : une commande partie avec le livreur depuis plus
-- de 2 heures, que ni le livreur ni le client n'a confirmée, passe « livrée ».
-- (Les commandes « prête » ne sont jamais livrées automatiquement : le
-- livreur ne les a pas encore récupérées.)
create or replace function public.livrer_commandes_oubliees()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_n integer;
begin
  update orders
     set statut = 'livrée', livree_auto = true
   where statut = 'en_livraison'
     and updated_at < now() - interval '2 hours';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.livrer_commandes_oubliees() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'livrer_commandes_oubliees';
select cron.schedule('livrer_commandes_oubliees', '*/15 * * * *', 'select public.livrer_commandes_oubliees()');
