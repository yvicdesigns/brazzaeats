-- =============================================================
--  Résumé de Zando Food pour Yvic droid (l'assistant du Mac du propriétaire)
--  À coller UNE fois dans Supabase > projet « zandofood » > SQL Editor, puis « Run ».
--
--  LECTURE SEULE : la fonction ne modifie rien (STABLE).
--  Elle ne renvoie que des chiffres et des noms de restaurants :
--  aucun nom de client, aucun numéro, aucune adresse, aucun message.
--  Accès protégé par un jeton : seule son empreinte (sha256) est gardée ici,
--  le jeton lui-même est dans le trousseau du Mac.
--
--  Pour tout retirer :
--    DROP FUNCTION public.agent_resume(text);
--    DROP TABLE public.agent_jetons;
-- =============================================================

CREATE TABLE IF NOT EXISTS public.agent_jetons (
  id         serial PRIMARY KEY,
  nom        text NOT NULL,
  empreinte  text NOT NULL UNIQUE,
  actif      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_jetons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_jetons FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.agent_resume(p_jeton text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  debut_jour timestamptz := date_trunc('day', now() AT TIME ZONE 'Africa/Brazzaville') AT TIME ZONE 'Africa/Brazzaville';
  debut_hier timestamptz := debut_jour - interval '1 day';
  debut_sem  timestamptz := debut_jour - interval '6 days';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agent_jetons
    WHERE actif AND empreinte = encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
  ) THEN
    RAISE EXCEPTION 'Jeton refusé.';
  END IF;

  RETURN jsonb_build_object(
    'genere_le', now(),
    'aujourdhui', (SELECT jsonb_build_object(
        'commandes', count(*),
        'livrees', count(*) FILTER (WHERE statut::text = 'livrée'),
        'annulees', count(*) FILTER (WHERE statut::text = 'annulée'),
        'chiffre_affaires', coalesce(sum(montant_total) FILTER (WHERE statut::text <> 'annulée'), 0),
        'commission', coalesce(sum(commission) FILTER (WHERE statut::text <> 'annulée'), 0),
        'frais_livraison', coalesce(sum(frais_livraison) FILTER (WHERE statut::text <> 'annulée'), 0))
      FROM orders WHERE created_at >= debut_jour),
    'hier', (SELECT jsonb_build_object(
        'commandes', count(*),
        'annulees', count(*) FILTER (WHERE statut::text = 'annulée'),
        'chiffre_affaires', coalesce(sum(montant_total) FILTER (WHERE statut::text <> 'annulée'), 0))
      FROM orders WHERE created_at >= debut_hier AND created_at < debut_jour),
    'sept_jours', (SELECT jsonb_build_object(
        'commandes', count(*),
        'annulees', count(*) FILTER (WHERE statut::text = 'annulée'),
        'chiffre_affaires', coalesce(sum(montant_total) FILTER (WHERE statut::text <> 'annulée'), 0),
        'commission', coalesce(sum(commission) FILTER (WHERE statut::text <> 'annulée'), 0))
      FROM orders WHERE created_at >= debut_sem),
    'nouveaux_clients', jsonb_build_object(
        'aujourdhui', (SELECT count(*) FROM profiles WHERE role::text = 'client' AND created_at >= debut_jour),
        'sept_jours', (SELECT count(*) FROM profiles WHERE role::text = 'client' AND created_at >= debut_sem)),

    -- Ce qui demande une action (commandes coincées, restaurants à valider, mauvais avis)
    'a_traiter', jsonb_build_object(
      'en_attente_restaurant', (SELECT count(*) FROM orders WHERE statut::text = 'en_attente'),
      'en_attente_depuis_10_min', (SELECT count(*) FROM orders WHERE statut::text = 'en_attente' AND created_at < now() - interval '10 minutes'),
      'en_preparation', (SELECT count(*) FROM orders WHERE statut::text IN ('acceptée', 'en_préparation')),
      'pretes_non_parties_20_min', (SELECT count(*) FROM orders WHERE statut::text = 'prête' AND type::text = 'livraison' AND updated_at < now() - interval '20 minutes'),
      'en_livraison', (SELECT count(*) FROM orders WHERE statut::text = 'en_livraison'),
      'preuves_mobile_money', (SELECT count(*) FROM orders WHERE mode_paiement::text = 'mobile_money' AND statut::text = 'en_attente' AND preuve_paiement_url IS NOT NULL),
      'restaurants_a_valider', (SELECT count(*) FROM restaurants WHERE statut::text = 'en_attente' AND deleted_at IS NULL),
      'mauvais_avis_7j', (SELECT count(*) FROM reviews WHERE note <= 2 AND created_at >= debut_sem)
    ),

    -- Les 8 dernières commandes (restaurant, montant, statut ; pas de client)
    'dernieres_commandes', coalesce((
      SELECT jsonb_agg(c ORDER BY c.quand DESC) FROM (
        SELECT o.id, r.nom AS restaurant, o.montant_total AS montant, o.statut::text AS statut,
               o.type::text AS type, o.mode_paiement::text AS paiement, o.created_at AS quand
        FROM orders o LEFT JOIN restaurants r ON r.id = o.restaurant_id
        ORDER BY o.created_at DESC LIMIT 8
      ) c), '[]'::jsonb),

    -- Les restaurants, avec leurs commandes sur 7 jours
    'restaurants', coalesce((
      SELECT jsonb_agg(x ORDER BY x.commandes_7j DESC) FROM (
        SELECT r.nom, r.statut::text AS statut, r.mode_livraison, r.note_moyenne,
               (SELECT count(*) FROM orders o WHERE o.restaurant_id = r.id AND o.created_at >= debut_sem) AS commandes_7j
        FROM restaurants r WHERE r.deleted_at IS NULL
      ) x), '[]'::jsonb),

    'totaux', jsonb_build_object(
      'commandes', (SELECT count(*) FROM orders),
      'clients', (SELECT count(*) FROM profiles WHERE role::text = 'client'),
      'restaurants_actifs', (SELECT count(*) FROM restaurants WHERE statut::text = 'actif' AND deleted_at IS NULL),
      'livreurs', (SELECT count(*) FROM profiles WHERE role::text = 'livreur')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.agent_resume(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agent_resume(text) TO anon, authenticated;

-- Empreinte du jeton de Yvic droid (le jeton lui-même est dans le trousseau du Mac)
INSERT INTO public.agent_jetons (nom, empreinte) VALUES ('Yvic droid (Mac)', '2600598d4503507f957e7ec413c28dafd69aff8ad555b151b5f6a82f42009219') ON CONFLICT DO NOTHING;
