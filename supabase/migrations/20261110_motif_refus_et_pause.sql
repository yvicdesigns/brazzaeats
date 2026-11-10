-- Motif de refus visible par le client, et pause temporaire des commandes.

alter table public.orders      add column if not exists motif_refus   text;
alter table public.restaurants add column if not exists pause_jusqu_a timestamptz;

-- Le restaurant peut désormais renseigner le motif en même temps qu'il refuse/annule.
create or replace function public.controler_maj_commande()
returns trigger language plpgsql set search_path = public as $$
declare
  v_mode    text;
  v_externe boolean;
begin
  if current_user not in ('anon', 'authenticated') or is_admin() then
    return new;
  end if;

  if owns_restaurant(old.restaurant_id) then
    if (to_jsonb(new) - array['statut', 'temps_preparation_minutes', 'motif_refus', 'updated_at'])
       is distinct from (to_jsonb(old) - array['statut', 'temps_preparation_minutes', 'motif_refus', 'updated_at']) then
      raise exception 'Le restaurant ne peut modifier que le statut, le délai et le motif de refus';
    end if;
    if new.motif_refus is distinct from old.motif_refus and new.statut <> 'annulée' then
      raise exception 'Le motif ne s''applique qu''à une commande refusée ou annulée';
    end if;
    if new.temps_preparation_minutes is distinct from old.temps_preparation_minutes
       and old.statut <> 'en_attente' then
      raise exception 'Délai de préparation modifiable uniquement avant acceptation';
    end if;
    if new.statut is distinct from old.statut then
      if new.statut = 'annulée' and old.statut not in ('livrée', 'annulée') then
        return new;
      end if;
      select coalesce(r.mode_livraison,
                      (select ps.mode_livraison from platform_settings ps where ps.id = 1),
                      'independants')
        into v_mode from restaurants r where r.id = old.restaurant_id;
      v_externe := v_mode in ('independants', 'zando_delivery');
      if not (
           (old.statut = 'en_attente'     and new.statut = 'acceptée')
        or (old.statut = 'acceptée'       and new.statut = 'en_préparation')
        or (old.statut = 'en_préparation' and new.statut = 'prête')
        or (old.statut = 'prête'          and new.statut = 'livrée'
            and (old.type = 'retrait' or not v_externe))
        or (old.statut = 'en_livraison'   and new.statut = 'livrée')
      ) then
        raise exception 'Transition de statut non autorisée : % → %', old.statut, new.statut;
      end if;
    end if;
    return new;
  end if;

  if is_livreur() then
    if (to_jsonb(new) - array['statut', 'livreur_id', 'updated_at'])
       is distinct from (to_jsonb(old) - array['statut', 'livreur_id', 'updated_at']) then
      raise exception 'Le livreur ne peut modifier que le statut de la livraison';
    end if;
    if old.livreur_id is null and old.statut = 'prête' and old.type = 'livraison'
       and new.livreur_id = auth.uid() and new.statut = 'en_livraison' then
      return new;
    end if;
    if old.livreur_id = auth.uid() and new.livreur_id = auth.uid()
       and (new.statut = old.statut or (old.statut = 'en_livraison' and new.statut = 'livrée')) then
      return new;
    end if;
    raise exception 'Action livreur non autorisée';
  end if;

  raise exception 'Modification de commande non autorisée';
end;
$$;

-- Pendant une pause, aucun client ne peut commander (même avec une ancienne version
-- de l'app). Le restaurant lui-même garde la vente comptoir.
create or replace function public.bloquer_commande_pendant_pause()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or owns_restaurant(new.restaurant_id) then
    return new;
  end if;
  if exists (select 1 from restaurants
             where id = new.restaurant_id and pause_jusqu_a is not null and pause_jusqu_a > now()) then
    raise exception 'Ce restaurant fait une courte pause et ne prend pas de commande pour le moment';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bloquer_commande_pendant_pause on public.orders;
create trigger trg_bloquer_commande_pendant_pause
  before insert on public.orders
  for each row execute function public.bloquer_commande_pendant_pause();
