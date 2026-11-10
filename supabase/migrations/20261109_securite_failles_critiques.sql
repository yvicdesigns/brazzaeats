-- Failles critiques trouvées à l'audit du 2026-11-09.

-- 1. Suppression/purge de restaurant : réservées au serveur (Edge Function admin-users, cron)
revoke execute on function public.supprimer_restaurant_definitivement(uuid) from public, anon, authenticated;
revoke execute on function public.purger_restaurants_expires() from public, anon, authenticated;
grant  execute on function public.supprimer_restaurant_definitivement(uuid) to service_role;
grant  execute on function public.purger_restaurants_expires() to service_role;

-- 2. Solde : crédit réservé à l'admin ; débit uniquement sur son propre compte, montant positif
create or replace function public.crediter_solde(p_client_id uuid, p_montant numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' and not is_admin() then
    raise exception 'Crédit de solde réservé à l''administration';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'Montant invalide';
  end if;
  update profiles set solde = coalesce(solde, 0) + p_montant where id = p_client_id;
end;
$$;

create or replace function public.deduire_solde(p_client_id uuid, p_montant numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' and not is_admin()
     and p_client_id is distinct from auth.uid() then
    raise exception 'Débit non autorisé';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'Montant invalide';
  end if;
  update profiles set solde = greatest(0, coalesce(solde, 0) - p_montant) where id = p_client_id;
end;
$$;

revoke execute on function public.crediter_solde(uuid, numeric) from public, anon;
revoke execute on function public.deduire_solde(uuid, numeric)  from public, anon;
grant  execute on function public.crediter_solde(uuid, numeric) to authenticated, service_role;
grant  execute on function public.deduire_solde(uuid, numeric)  to authenticated, service_role;

-- 3 + 4. Profils : un utilisateur ne peut ni s'inscrire avec un autre rôle que client,
-- ni modifier lui-même rôle / solde / points / actif. Les fonctions SECURITY DEFINER
-- (current_user = propriétaire) et service_role restent autorisées.
create or replace function public.proteger_colonnes_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.role is distinct from 'client' then
      raise exception 'Inscription autorisée uniquement en tant que client';
    end if;
    new.solde := 0;
    new.points_fidelite := 0;
    new.actif := true;
  else
    if new.role is distinct from old.role
       or new.solde is distinct from old.solde
       or new.points_fidelite is distinct from old.points_fidelite
       or new.actif is distinct from old.actif then
      raise exception 'Modification non autorisée de colonnes protégées';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_colonnes_profil on public.profiles;
create trigger trg_proteger_colonnes_profil
  before insert or update on public.profiles
  for each row execute function public.proteger_colonnes_profil();

-- Lecture publique des profils : seule la connexion par nom d'utilisateur en a besoin
-- (avant authentification). On limite anon aux deux colonnes utiles en attendant que
-- toutes les versions installées utilisent la fonction resoudre_username ci-dessous.
revoke select on public.profiles from anon;
grant  select (username, telephone) on public.profiles to anon;

create or replace function public.resoudre_username(p_username text)
returns text language sql stable security definer set search_path = public as $$
  select telephone from profiles where lower(username) = lower(trim(p_username)) limit 1;
$$;
grant execute on function public.resoudre_username(text) to anon, authenticated;
