-- Adresse courte et lisible de chaque restaurant : zandofood.com/r/<slug>
-- Utilisée par le QR code et les liens partagés. Une fois imprimée, elle ne
-- doit plus changer : seul l'admin peut la modifier.

alter table public.restaurants add column if not exists slug text;

create or replace function public.slugifier(p_texte text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p_texte, ''),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyoAAAAAACEEEEIIIINOOOOOUUUUY')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Slug libre à partir du nom : « le-viceto », puis « le-viceto-2 » si déjà pris
create or replace function public.slug_disponible(p_nom text, p_id uuid)
returns text language plpgsql set search_path = public as $$
declare
  v_base text := nullif(slugifier(p_nom), '');
  v_slug text;
  v_n    int  := 1;
begin
  v_base := coalesce(v_base, 'restaurant');
  v_slug := v_base;
  while exists (select 1 from restaurants where slug = v_slug and id is distinct from p_id) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end;
$$;

-- Remplit les restaurants existants
update public.restaurants r set slug = public.slug_disponible(r.nom, r.id) where r.slug is null;

alter table public.restaurants alter column slug set not null;
create unique index if not exists restaurants_slug_key on public.restaurants (slug);

-- Création : slug automatique. Modification : réservée à l'admin.
create or replace function public.gerer_slug_restaurant()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.slug is null or new.slug = '' then
      new.slug := slug_disponible(new.nom, new.id);
    else
      new.slug := slugifier(new.slug);
    end if;
    return new;
  end if;
  if new.slug is distinct from old.slug then
    if current_user in ('anon', 'authenticated') and not is_admin() then
      new.slug := old.slug;
    else
      new.slug := slug_disponible(new.slug, new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gerer_slug_restaurant on public.restaurants;
create trigger trg_gerer_slug_restaurant
  before insert or update on public.restaurants
  for each row execute function public.gerer_slug_restaurant();
