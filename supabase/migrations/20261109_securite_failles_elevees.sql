-- Failles élevées trouvées à l'audit du 2026-11-09 + correctif de la migration précédente.
-- Les fonctions de trigger sont SECURITY INVOKER : current_user doit refléter l'appelant
-- (anon/authenticated) et non le propriétaire, sinon les contrôles ne s'appliquent jamais.

-- 0. Correctif : la protection des profils ne s'appliquait pas (SECURITY DEFINER)
alter function public.proteger_colonnes_profil() security invoker;

-- 1. Restaurants : commission, note, propriétaire, mode de livraison et validation
--    réservés à l'admin. Le propriétaire garde son interrupteur ouvert/fermé,
--    sauf si l'admin l'a suspendu.
alter table public.restaurants
  add column if not exists suspendu_par_admin boolean not null default false;

create or replace function public.proteger_colonnes_restaurant()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if is_admin() then
    if tg_op = 'UPDATE' and new.statut is distinct from old.statut then
      new.suspendu_par_admin := (new.statut = 'suspendu');
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Création de restaurant réservée à l''administration';
  end if;
  if new.owner_id           is distinct from old.owner_id
     or new.commission_rate is distinct from old.commission_rate
     or new.note_moyenne    is distinct from old.note_moyenne
     or new.mode_livraison  is distinct from old.mode_livraison
     or new.suspendu_par_admin is distinct from old.suspendu_par_admin then
    raise exception 'Modification réservée à l''administration';
  end if;
  if new.statut is distinct from old.statut then
    if old.statut not in ('actif', 'suspendu') or new.statut not in ('actif', 'suspendu') then
      raise exception 'Validation du restaurant réservée à l''administration';
    end if;
    if new.statut = 'actif' and old.suspendu_par_admin then
      raise exception 'Restaurant suspendu par l''administration — contactez le support';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_colonnes_restaurant on public.restaurants;
create trigger trg_proteger_colonnes_restaurant
  before insert or update on public.restaurants
  for each row execute function public.proteger_colonnes_restaurant();

-- 2. Commandes : le restaurant ne change que le statut (transitions de l'app) et le
--    délai avant acceptation ; le livreur ne fait qu'accepter puis livrer.
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
    if (to_jsonb(new) - array['statut', 'temps_preparation_minutes', 'updated_at'])
       is distinct from (to_jsonb(old) - array['statut', 'temps_preparation_minutes', 'updated_at']) then
      raise exception 'Le restaurant ne peut modifier que le statut et le délai de préparation';
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

drop trigger if exists trg_controler_maj_commande on public.orders;
create trigger trg_controler_maj_commande
  before update on public.orders
  for each row execute function public.controler_maj_commande();

-- 3. Avis : le client ne modifie que sa note/son commentaire, le restaurant ne fait
--    que répondre ou masquer.
create or replace function public.controler_maj_avis()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or is_admin() then
    return new;
  end if;
  if old.client_id = auth.uid() then
    if (to_jsonb(new) - array['note', 'commentaire', 'updated_at'])
       is distinct from (to_jsonb(old) - array['note', 'commentaire', 'updated_at']) then
      raise exception 'Seuls la note et le commentaire sont modifiables';
    end if;
    return new;
  end if;
  if owns_restaurant(old.restaurant_id) then
    if (to_jsonb(new) - array['reponse_restaurant', 'masque', 'updated_at'])
       is distinct from (to_jsonb(old) - array['reponse_restaurant', 'masque', 'updated_at']) then
      raise exception 'Le restaurant peut seulement répondre à un avis ou le masquer';
    end if;
    return new;
  end if;
  raise exception 'Modification d''avis non autorisée';
end;
$$;

drop trigger if exists trg_controler_maj_avis on public.reviews;
create trigger trg_controler_maj_avis
  before update on public.reviews
  for each row execute function public.controler_maj_avis();

-- Doublons non-SECURITY DEFINER de trg_recalculer_note_restaurant : ils écrivaient
-- note_moyenne avec les droits de l'utilisateur et seraient désormais bloqués.
drop trigger if exists trigger_maj_note      on public.reviews;
drop trigger if exists trigger_update_rating on public.reviews;

-- 4. Stockage : chacun n'écrit que dans le dossier de son restaurant / de son compte.
create or replace function public.peut_ecrire_media_restaurant(p_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin()
      or p_id = auth.uid()::text
      or exists (select 1 from restaurants where id::text = p_id and owner_id = auth.uid());
$$;
grant execute on function public.peut_ecrire_media_restaurant(text) to authenticated;

drop policy if exists "menu-images: upload restaurant"       on storage.objects;
drop policy if exists "menu-images: update restaurant"       on storage.objects;
drop policy if exists "restaurant-images: upload restaurant" on storage.objects;
drop policy if exists "restaurant-images: update restaurant" on storage.objects;
drop policy if exists "restaurant_video_upload"              on storage.objects;
drop policy if exists "restaurant_video_update"              on storage.objects;
drop policy if exists "payment-proofs: upload client"        on storage.objects;

create policy "menu-images: écriture propriétaire" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu-images'
              and public.peut_ecrire_media_restaurant((storage.foldername(name))[1]));
create policy "menu-images: remplacement propriétaire" on storage.objects
  for update to authenticated
  using      (bucket_id = 'menu-images'
              and public.peut_ecrire_media_restaurant((storage.foldername(name))[1]))
  with check (bucket_id = 'menu-images'
              and public.peut_ecrire_media_restaurant((storage.foldername(name))[1]));

create policy "restaurant-images: écriture propriétaire" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'restaurant-images'
              and (storage.foldername(name))[1] in ('logos', 'covers', 'videos', 'previews')
              and public.peut_ecrire_media_restaurant(split_part(storage.filename(name), '.', 1)));
create policy "restaurant-images: remplacement propriétaire" on storage.objects
  for update to authenticated
  using      (bucket_id = 'restaurant-images'
              and (storage.foldername(name))[1] in ('logos', 'covers', 'videos', 'previews')
              and public.peut_ecrire_media_restaurant(split_part(storage.filename(name), '.', 1)))
  with check (bucket_id = 'restaurant-images'
              and (storage.foldername(name))[1] in ('logos', 'covers', 'videos', 'previews')
              and public.peut_ecrire_media_restaurant(split_part(storage.filename(name), '.', 1)));

create policy "payment-proofs: upload dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs'
              and (storage.foldername(name))[1] = auth.uid()::text);
