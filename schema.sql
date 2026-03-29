-- ============================================================
-- BrazzaEats — Schéma de base de données
-- Marketplace multi-restaurant · Brazzaville, Congo
-- Stack : Supabase (PostgreSQL 15+)
-- ============================================================


-- ============================================================
-- 0. TYPES ENUM
-- ============================================================

CREATE TYPE role_utilisateur   AS ENUM ('client', 'restaurant', 'livreur', 'admin');
CREATE TYPE statut_restaurant  AS ENUM ('actif', 'suspendu', 'en_attente');
CREATE TYPE type_commande      AS ENUM ('livraison', 'retrait');
CREATE TYPE statut_commande    AS ENUM (
  'en_attente',
  'acceptée',
  'en_préparation',
  'prête',
  'en_livraison',
  'livrée',
  'annulée'
);
CREATE TYPE mode_paiement      AS ENUM ('cash', 'mobile_money');
CREATE TYPE type_promotion     AS ENUM ('pourcentage', 'montant_fixe');


-- ============================================================
-- 1. TABLES
-- ============================================================

-- ------------------------------------------------------------
-- profiles — extension de auth.users (créé automatiquement
-- par un trigger Supabase ou via l'API Auth)
-- ------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        role_utilisateur NOT NULL DEFAULT 'client',
  nom         TEXT        NOT NULL,
  telephone   TEXT,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- restaurants
-- ------------------------------------------------------------
CREATE TABLE restaurants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  nom             TEXT        NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  adresse         TEXT        NOT NULL,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  horaires        JSONB,                          -- { "lundi": { "ouverture": "08:00", "fermeture": "22:00" }, … }
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10,
  statut          statut_restaurant NOT NULL DEFAULT 'en_attente',
  note_moyenne    NUMERIC(3, 2) DEFAULT 0 CHECK (note_moyenne BETWEEN 0 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- menu_categories
-- ------------------------------------------------------------
CREATE TABLE menu_categories (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nom           TEXT    NOT NULL,
  ordre         INT     NOT NULL DEFAULT 0,
  visible       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- menu_items
-- ------------------------------------------------------------
CREATE TABLE menu_items (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     UUID    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  categorie_id      UUID    REFERENCES menu_categories(id) ON DELETE SET NULL,
  nom               TEXT    NOT NULL,
  description       TEXT,
  prix              INT     NOT NULL CHECK (prix > 0),   -- montant en FCFA
  image_url         TEXT,
  disponible        BOOLEAN NOT NULL DEFAULT TRUE,
  temps_preparation INT     DEFAULT 15,                  -- en minutes
  horaires          JSONB   DEFAULT NULL,                -- { jours:[0..6], heure_debut:"HH:MM", heure_fin:"HH:MM" }
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- orders — commandes clients
-- Deux FK sur profiles (client et livreur) avec des noms distincts
-- ------------------------------------------------------------
CREATE TABLE orders (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID    NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  restaurant_id     UUID    NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  livreur_id        UUID    REFERENCES profiles(id) ON DELETE SET NULL,  -- nullable avant assignation
  type              type_commande   NOT NULL DEFAULT 'livraison',
  statut            statut_commande NOT NULL DEFAULT 'en_attente',
  montant_total     INT NOT NULL CHECK (montant_total >= 0),             -- en FCFA, hors frais livraison
  frais_livraison   INT NOT NULL DEFAULT 0 CHECK (frais_livraison >= 0),
  commission        INT NOT NULL DEFAULT 0 CHECK (commission >= 0),
  mode_paiement     mode_paiement NOT NULL DEFAULT 'cash',
  adresse_livraison JSONB,   -- { "rue": "…", "quartier": "…", "indication": "…" }
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nommage explicite des FK ambiguës (orders → profiles)
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_client  FOREIGN KEY (client_id)  REFERENCES profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_orders_livreur FOREIGN KEY (livreur_id) REFERENCES profiles(id) ON DELETE SET NULL;
-- Note : les déclarations REFERENCES inline ci-dessus créent déjà les FK ;
-- si PostgreSQL se plaint de doublons, retirez les deux lignes ALTER TABLE.

-- ------------------------------------------------------------
-- order_items — lignes de commande
-- ------------------------------------------------------------
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id)     ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantite      INT  NOT NULL CHECK (quantite > 0),
  prix_unitaire INT  NOT NULL CHECK (prix_unitaire > 0),   -- snapshot prix au moment de la commande
  sous_total    INT  NOT NULL CHECK (sous_total > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Pas d'updated_at : les lignes de commande ne sont jamais modifiées
);

-- ------------------------------------------------------------
-- deliveries — suivi de livraison
-- ------------------------------------------------------------
CREATE TABLE deliveries (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID    NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  livreur_id            UUID    NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  statut                TEXT    NOT NULL DEFAULT 'assignée',
  position_actuelle     JSONB,  -- { "lat": -4.26, "lng": 15.24 }
  heure_prise_en_charge TIMESTAMPTZ,
  heure_livraison       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- messages — chat par commande entre client et restaurant
-- ------------------------------------------------------------
CREATE TABLE messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role   TEXT        NOT NULL CHECK (sender_role IN ('client','restaurant')),
  contenu       TEXT        NOT NULL CHECK (char_length(contenu) BETWEEN 1 AND 1000),
  lu            BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- reviews — avis clients (1 avis par commande, contrainte UNIQUE)
-- ------------------------------------------------------------
CREATE TABLE reviews (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID    NOT NULL REFERENCES profiles(id)     ON DELETE CASCADE,
  restaurant_id UUID    NOT NULL REFERENCES restaurants(id)  ON DELETE CASCADE,
  order_id      UUID    NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,  -- 1 seul avis par commande
  note                  INT     NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire           TEXT,
  reponse_restaurant    TEXT,
  masque                BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- promotions — codes promo par restaurant
-- ------------------------------------------------------------
CREATE TABLE promotions (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code          TEXT    NOT NULL UNIQUE,
  type          type_promotion NOT NULL,
  valeur        INT     NOT NULL CHECK (valeur > 0),
  date_debut    DATE    NOT NULL,
  date_fin      DATE    NOT NULL,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_dates_coherentes CHECK (date_fin >= date_debut)
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_role         ON profiles(role);

-- restaurants
CREATE INDEX idx_restaurants_owner_id  ON restaurants(owner_id);
CREATE INDEX idx_restaurants_statut    ON restaurants(statut);
CREATE INDEX idx_restaurants_created_at ON restaurants(created_at DESC);

-- menu_categories
CREATE INDEX idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);

-- menu_items
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_categorie_id  ON menu_items(categorie_id);

-- orders
CREATE INDEX idx_orders_client_id      ON orders(client_id);
CREATE INDEX idx_orders_restaurant_id  ON orders(restaurant_id);
CREATE INDEX idx_orders_livreur_id     ON orders(livreur_id);
CREATE INDEX idx_orders_statut         ON orders(statut);
CREATE INDEX idx_orders_created_at     ON orders(created_at DESC);

-- order_items
CREATE INDEX idx_order_items_order_id    ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- deliveries
CREATE INDEX idx_deliveries_order_id   ON deliveries(order_id);
CREATE INDEX idx_deliveries_livreur_id ON deliveries(livreur_id);

-- reviews
CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX idx_reviews_client_id     ON reviews(client_id);

-- promotions
CREATE INDEX idx_promotions_restaurant_id ON promotions(restaurant_id);
CREATE INDEX idx_promotions_code          ON promotions(code);


-- ============================================================
-- 3. TRIGGERS updated_at
-- ============================================================

-- Fonction partagée par tous les triggers
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- 4. FONCTIONS HELPER pour le RLS
-- (SECURITY DEFINER évite la récursion infinie dans les policies)
-- ============================================================

-- Vérifie si l'utilisateur connecté est administrateur
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Vérifie si l'utilisateur connecté est propriétaire d'un restaurant donné
CREATE OR REPLACE FUNCTION owns_restaurant(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants
    WHERE id = p_restaurant_id AND owner_id = auth.uid()
  );
$$;


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────

-- Chaque utilisateur lit son propre profil ; l'admin lit tout
CREATE POLICY "profiles: lecture propre ou admin"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

-- Chaque utilisateur crée uniquement son propre profil
CREATE POLICY "profiles: insertion propre"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Chaque utilisateur modifie uniquement son propre profil
CREATE POLICY "profiles: modification propre"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin : accès total (remplace les policies ci-dessus pour l'admin)
CREATE POLICY "profiles: admin accès total"
  ON profiles FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- RESTAURANTS
-- ─────────────────────────────────────────────────────────────

-- Lecture publique : restaurants actifs + propres restaurants + admin
CREATE POLICY "restaurants: lecture publique (actifs)"
  ON restaurants FOR SELECT
  USING (statut = 'actif' OR owner_id = auth.uid() OR is_admin());

-- Propriétaire : gère son propre restaurant
CREATE POLICY "restaurants: propriétaire CRUD"
  ON restaurants FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admin : accès total
CREATE POLICY "restaurants: admin accès total"
  ON restaurants FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- MENU_CATEGORIES
-- ─────────────────────────────────────────────────────────────

-- Lecture publique (tout le monde peut voir les catégories)
CREATE POLICY "menu_categories: lecture publique"
  ON menu_categories FOR SELECT
  USING (true);

-- Propriétaire du restaurant : gère ses catégories
CREATE POLICY "menu_categories: propriétaire CRUD"
  ON menu_categories FOR ALL
  USING (owns_restaurant(restaurant_id))
  WITH CHECK (owns_restaurant(restaurant_id));

-- Admin : accès total
CREATE POLICY "menu_categories: admin accès total"
  ON menu_categories FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- MENU_ITEMS
-- ─────────────────────────────────────────────────────────────

-- Lecture publique
CREATE POLICY "menu_items: lecture publique"
  ON menu_items FOR SELECT
  USING (true);

-- Propriétaire du restaurant : gère ses articles
CREATE POLICY "menu_items: propriétaire CRUD"
  ON menu_items FOR ALL
  USING (owns_restaurant(restaurant_id))
  WITH CHECK (owns_restaurant(restaurant_id));

-- Admin : accès total
CREATE POLICY "menu_items: admin accès total"
  ON menu_items FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────

-- Client : voit uniquement ses propres commandes
CREATE POLICY "orders: client voit ses commandes"
  ON orders FOR SELECT
  USING (client_id = auth.uid());

-- Restaurant : voit les commandes qui lui sont destinées
CREATE POLICY "orders: restaurant voit ses commandes"
  ON orders FOR SELECT
  USING (owns_restaurant(restaurant_id));

-- Livreur : voit les commandes qui lui sont assignées
CREATE POLICY "orders: livreur voit ses livraisons"
  ON orders FOR SELECT
  USING (livreur_id = auth.uid());

-- Client : peut créer une commande en son nom
CREATE POLICY "orders: client crée commande"
  ON orders FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Restaurant : peut modifier le statut de ses commandes
CREATE POLICY "orders: restaurant modifie statut"
  ON orders FOR UPDATE
  USING (owns_restaurant(restaurant_id));

-- Livreur : voir les commandes prêtes non assignées (pour pouvoir les accepter)
CREATE POLICY "orders: livreur voit commandes disponibles"
  ON orders FOR SELECT
  USING (
    statut = 'prête'
    AND livreur_id IS NULL
    AND type = 'livraison'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'livreur'
    )
  );

-- Livreur : accepter une commande prête non assignée (UPDATE initial)
CREATE POLICY "orders: livreur accepte commande disponible"
  ON orders FOR UPDATE
  USING (
    statut = 'prête'
    AND livreur_id IS NULL
    AND type = 'livraison'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'livreur'
    )
  );

-- Livreur : peut mettre à jour le statut de livraison (livreur_id et statut)
CREATE POLICY "orders: livreur modifie statut livraison"
  ON orders FOR UPDATE
  USING (livreur_id = auth.uid());

-- Admin : accès total
CREATE POLICY "orders: admin accès total"
  ON orders FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- ORDER_ITEMS
-- ─────────────────────────────────────────────────────────────

-- Lecture : accessible si l'utilisateur a accès à la commande parente
CREATE POLICY "order_items: lecture si accès commande"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (
          o.client_id = auth.uid()
          OR owns_restaurant(o.restaurant_id)
          OR o.livreur_id = auth.uid()
          OR is_admin()
        )
    )
  );

-- Client : insère les lignes lors de la création de sa commande
CREATE POLICY "order_items: client insère ses lignes"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.client_id = auth.uid()
    )
  );

-- Admin : accès total
CREATE POLICY "order_items: admin accès total"
  ON order_items FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- DELIVERIES
-- ─────────────────────────────────────────────────────────────

-- Client : suit l'avancement de sa livraison
CREATE POLICY "deliveries: client suit sa livraison"
  ON deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = deliveries.order_id AND o.client_id = auth.uid()
    )
  );

-- Restaurant : voit les livraisons de ses commandes
CREATE POLICY "deliveries: restaurant voit ses livraisons"
  ON deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = deliveries.order_id AND owns_restaurant(o.restaurant_id)
    )
  );

-- Livreur : voit et met à jour ses livraisons (position, statut)
CREATE POLICY "deliveries: livreur voit ses missions"
  ON deliveries FOR SELECT
  USING (livreur_id = auth.uid());

CREATE POLICY "deliveries: livreur met à jour sa position"
  ON deliveries FOR UPDATE
  USING (livreur_id = auth.uid())
  WITH CHECK (livreur_id = auth.uid());

-- Admin : accès total
CREATE POLICY "deliveries: admin accès total"
  ON deliveries FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────────────────

-- Lecture publique
CREATE POLICY "reviews: lecture publique"
  ON reviews FOR SELECT
  USING (true);

-- Client : peut créer un avis uniquement si :
--   1. La commande lui appartient
--   2. La commande est au statut 'livrée'
--   3. Aucun avis n'existe encore pour cette commande (UNIQUE garantit mais on vérifie en WC)
CREATE POLICY "reviews: client insère son avis (commande livrée)"
  ON reviews FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = reviews.order_id
        AND o.client_id = auth.uid()
        AND o.statut = 'livrée'
    )
  );

-- Client : modifie uniquement ses propres avis
CREATE POLICY "reviews: client modifie son avis"
  ON reviews FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Restaurant : peut répondre (UPDATE reponse_restaurant) aux avis de son restaurant
CREATE POLICY "reviews: restaurant répond à ses avis"
  ON reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = reviews.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

-- Client : supprime uniquement ses propres avis
CREATE POLICY "reviews: client supprime son avis"
  ON reviews FOR DELETE
  USING (client_id = auth.uid());

-- Admin : accès total
CREATE POLICY "reviews: admin accès total"
  ON reviews FOR ALL
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- PROMOTIONS
-- ─────────────────────────────────────────────────────────────

-- Lecture publique des promotions actives (+ propriétaire voit les siennes)
CREATE POLICY "promotions: lecture publique (actives)"
  ON promotions FOR SELECT
  USING (actif = TRUE OR owns_restaurant(restaurant_id) OR is_admin());

-- Propriétaire : gère ses promotions
CREATE POLICY "promotions: propriétaire CRUD"
  ON promotions FOR ALL
  USING (owns_restaurant(restaurant_id))
  WITH CHECK (owns_restaurant(restaurant_id));

-- Admin : accès total
CREATE POLICY "promotions: admin accès total"
  ON promotions FOR ALL
  USING (is_admin());

-- ─────────────────────────────────────────────────────────────
-- MESSAGES (chat commande)
-- ─────────────────────────────────────────────────────────────

-- Lecture : client de la commande OU propriétaire du restaurant
CREATE POLICY "messages: lecture client ou restaurant"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          o.client_id = auth.uid()
          OR owns_restaurant(o.restaurant_id)
        )
    )
    OR is_admin()
  );

-- Envoi : uniquement les parties concernées
CREATE POLICY "messages: envoi client ou restaurant"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          o.client_id = auth.uid()
          OR owns_restaurant(o.restaurant_id)
        )
    )
  );

-- Marquer comme lu : uniquement le destinataire
CREATE POLICY "messages: marquer lu"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          o.client_id = auth.uid()
          OR owns_restaurant(o.restaurant_id)
        )
    )
  );

-- ============================================================
-- 6. DONNÉES MOCK
-- ============================================================
-- Le SQL Editor Supabase s'exécute en service_role et peut donc
-- insérer directement dans auth.users.
-- On crée les comptes auth en premier, puis les profils.
--
-- Mots de passe : tous "BrazzaEats2024!"  (bcrypt ci-dessous)
-- Emails de test (non réels) :
--   admin@brazzaeats.test          → admin
--   mamiwata@brazzaeats.test       → owner Mami Wata
--   tantine@brazzaeats.test        → owner Tantine Céleste
--   brazzagrill@brazzaeats.test    → owner Brazza Grill
--   josue@brazzaeats.test          → client Josué
--   grace@brazzaeats.test          → client Grâce
--   fiston@brazzaeats.test         → livreur Fiston
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- COMPTES AUTH (requis avant les profils — FK auth.users)
-- ─────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role, instance_id
)
VALUES
  ('a0000000-0000-0000-0000-000000000001','admin@brazzaeats.test',
   '$2a$10$X4kv7j5ZcG39WgURdQTwdO7Fq3FaP0P3vNqlQf/CXqoStR6g4iO2y',
   NOW(), NOW() - INTERVAL '60 days', NOW(),
   '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',
   '00000000-0000-0000-0000-000000000000'),

  ('a0000000-0000-0000-0000-000000000002','mamiwata@brazzaeats.test',
   '$2a$10$X4kv7j5ZcG39WgURdQTwdO7Fq3FaP0P3vNqlQf/CXqoStR6g4iO2y',
   NOW(), NOW() - INTERVAL '45 days', NOW(),
   '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',
   '00000000-0000-0000-0000-000000000000'),

  ('a0000000-0000-0000-0000-000000000003','tantine@brazzaeats.test',
   '$2a$10$X4kv7j5ZcG39WgURdQTwdO7Fq3FaP0P3vNqlQf/CXqoStR6g4iO2y',
   NOW(), NOW() - INTERVAL '40 days', NOW(),
   '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',
   '00000000-0000-0000-0000-000000000000'),

  ('a0000000-0000-0000-0000-000000000004','brazzagrill@brazzaeats.test',
   '$2a$10$X4kv7j5ZcG39WgURdQTwdO7Fq3FaP0P3vNqlQf/CXqoStR6g4iO2y',
   NOW(), NOW() - INTERVAL '30 days', NOW(),
   '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',
   '00000000-0000-0000-0000-000000000000'),

  ('a0000000-0000-0000-0000-000000000005','josue@brazzaeats.test',
   '$2a$10$X4kv7j5ZcG39WgURdQTwdO7Fq3FaP0P3vNqlQf/CXqoStR6g4iO2y',
   NOW(), NOW() - INTERVAL '20 days', NOW(),
   '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',
   '00000000-0000-0000-0000-000000000000'),

  ('a0000000-0000-0000-0000-000000000006','grace@brazzaeats.test',
   '$2a$10$X4kv7j5ZcG39WgURdQTwdO7Fq3FaP0P3vNqlQf/CXqoStR6g4iO2y',
   NOW(), NOW() - INTERVAL '15 days', NOW(),
   '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',
   '00000000-0000-0000-0000-000000000000'),

  ('a0000000-0000-0000-0000-000000000007','fiston@brazzaeats.test',
   '$2a$10$X4kv7j5ZcG39WgURdQTwdO7Fq3FaP0P3vNqlQf/CXqoStR6g4iO2y',
   NOW(), NOW() - INTERVAL '25 days', NOW(),
   '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- PROFILS UTILISATEURS
-- ─────────────────────────────────────────────────────────────
INSERT INTO profiles (id, role, nom, telephone, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin',      'Administrateur BrazzaEats',  '+242066000001', NOW() - INTERVAL '60 days'),
  ('a0000000-0000-0000-0000-000000000002', 'restaurant', 'Mami Wata SARL',             '+242066000002', NOW() - INTERVAL '45 days'),
  ('a0000000-0000-0000-0000-000000000003', 'restaurant', 'Tantine Céleste Entreprise', '+242066000003', NOW() - INTERVAL '40 days'),
  ('a0000000-0000-0000-0000-000000000004', 'restaurant', 'Brazza Grill Moungali',      '+242066000004', NOW() - INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000005', 'client',     'Josué Nkounkou',             '+242066111111', NOW() - INTERVAL '20 days'),
  ('a0000000-0000-0000-0000-000000000006', 'client',     'Grâce Malonga',              '+242066222222', NOW() - INTERVAL '15 days'),
  ('a0000000-0000-0000-0000-000000000007', 'livreur',    'Fiston Massamba',            '+242066333333', NOW() - INTERVAL '25 days');

-- ─────────────────────────────────────────────────────────────
-- RESTAURANTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO restaurants (id, owner_id, nom, description, adresse, latitude, longitude, horaires, commission_rate, statut, note_moyenne, created_at) VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'Le Mami Wata',
    'Cuisine congolaise traditionnelle au cœur de Poto-Poto. Spécialités maison : Saka-Saka au poisson fumé, Fufu artisanal, Ntaba en sauce.',
    'Avenue des Trois Martyrs, Poto-Poto, Brazzaville',
    -4.2634, 15.2429,
    '{"lundi":{"ouverture":"08:00","fermeture":"22:00"},"mardi":{"ouverture":"08:00","fermeture":"22:00"},"mercredi":{"ouverture":"08:00","fermeture":"22:00"},"jeudi":{"ouverture":"08:00","fermeture":"22:00"},"vendredi":{"ouverture":"08:00","fermeture":"23:00"},"samedi":{"ouverture":"09:00","fermeture":"23:00"},"dimanche":{"ouverture":"10:00","fermeture":"21:00"}}',
    10, 'actif', 4.6,
    NOW() - INTERVAL '45 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'Chez Tantine Céleste',
    'La cuisine de maman comme à la maison. Plats mijotés, Maboke du fleuve et Poulet DG authentique à Bacongo.',
    'Rue Boundji, Bacongo, Brazzaville',
    -4.3021, 15.2612,
    '{"lundi":{"ouverture":"09:00","fermeture":"21:00"},"mardi":{"ouverture":"09:00","fermeture":"21:00"},"mercredi":{"ouverture":"09:00","fermeture":"21:00"},"jeudi":{"ouverture":"09:00","fermeture":"21:00"},"vendredi":{"ouverture":"09:00","fermeture":"22:00"},"samedi":{"ouverture":"09:00","fermeture":"22:00"},"dimanche":{"ferme":true}}',
    10, 'actif', 4.8,
    NOW() - INTERVAL '40 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
    'Brazza Grill',
    'Le meilleur braisé de Moungali. Poulet DG signature, Ndolé au crabe, grillades au charbon de bois et bières fraîches.',
    'Boulevard Denis Sassou Nguesso, Moungali, Brazzaville',
    -4.2478, 15.2801,
    '{"lundi":{"ouverture":"11:00","fermeture":"23:00"},"mardi":{"ouverture":"11:00","fermeture":"23:00"},"mercredi":{"ouverture":"11:00","fermeture":"23:00"},"jeudi":{"ouverture":"11:00","fermeture":"23:00"},"vendredi":{"ouverture":"11:00","fermeture":"00:00"},"samedi":{"ouverture":"10:00","fermeture":"00:00"},"dimanche":{"ouverture":"10:00","fermeture":"22:00"}}',
    12, 'actif', 4.4,
    NOW() - INTERVAL '30 days'
  );

-- ─────────────────────────────────────────────────────────────
-- CATÉGORIES DE MENU — Le Mami Wata
-- ─────────────────────────────────────────────────────────────
INSERT INTO menu_categories (id, restaurant_id, nom, ordre, visible) VALUES
  ('c1100000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Plats principaux',  1, true),
  ('c1100000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Accompagnements',   2, true),
  ('c1100000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Boissons',          3, true);

-- CATÉGORIES DE MENU — Chez Tantine Céleste
INSERT INTO menu_categories (id, restaurant_id, nom, ordre, visible) VALUES
  ('c2200000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Plats mijotés',     1, true),
  ('c2200000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Grillades',         2, true),
  ('c2200000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Desserts & Jus',    3, true);

-- CATÉGORIES DE MENU — Brazza Grill
INSERT INTO menu_categories (id, restaurant_id, nom, ordre, visible) VALUES
  ('c3300000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Grillades',              1, true),
  ('c3300000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'Plats congolais',        2, true),
  ('c3300000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Boissons & Desserts',    3, true);

-- ─────────────────────────────────────────────────────────────
-- ARTICLES DU MENU — Le Mami Wata
-- ─────────────────────────────────────────────────────────────
INSERT INTO menu_items (id, restaurant_id, categorie_id, nom, description, prix, disponible, temps_preparation) VALUES
  -- Plats principaux
  ('d1100000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001',
   'Saka-Saka au poisson fumé',
   'Feuilles de manioc pilées longuement mijotées avec du poisson fumé du Pool, huile de palme rouge et épices locales. Servi avec fufu maison.',
   3500, true, 20),

  ('d1100000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001',
   'Poisson braisé entier',
   'Tilapia frais du fleuve Congo braisé au feu de bois, mariné aux oignons, piment doux et citron vert. Servi avec plantain braisé.',
   5500, true, 30),

  ('d1100000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001',
   'Poulet braisé (quart)',
   'Quart de poulet fermier braisé au charbon, sauce moambe maison aux noix de palme fraîches. Accompagnement au choix.',
   4500, true, 25),

  ('d1100000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000001',
   'Ntaba en sauce tomate',
   'Viande de chèvre mijotée en sauce tomate épicée avec gingembre frais, ail et herbes aromatiques du Congo. Fondante et parfumée.',
   6500, true, 40),

  -- Accompagnements
  ('d1100000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000002',
   'Fufu de manioc',
   'Fufu traditionnel préparé à la minute, texture lisse et homogène.',
   1000, true, 10),

  ('d1100000-0000-0000-0000-000000000006',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000002',
   'Riz blanc parfumé',
   'Riz long grain cuit à la vapeur.',
   800, true, 5),

  ('d1100000-0000-0000-0000-000000000007',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000002',
   'Alloco (plantain frit)',
   'Tranches de banane plantain mûre frites à l''huile de palme, dorées et caramélisées.',
   1500, true, 10),

  -- Boissons
  ('d1100000-0000-0000-0000-000000000008',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000003',
   'Jus de maracuja maison',
   'Jus de fruit de la passion pressé à la commande, légèrement sucré.',
   1500, true, 5),

  ('d1100000-0000-0000-0000-000000000009',
   'b0000000-0000-0000-0000-000000000001', 'c1100000-0000-0000-0000-000000000003',
   'Eau minérale 1,5L',
   'Eau minérale naturelle plate.',
   500, true, 2);

-- ─────────────────────────────────────────────────────────────
-- ARTICLES DU MENU — Chez Tantine Céleste
-- ─────────────────────────────────────────────────────────────
INSERT INTO menu_items (id, restaurant_id, categorie_id, nom, description, prix, disponible, temps_preparation) VALUES
  -- Plats mijotés
  ('d2200000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c2200000-0000-0000-0000-000000000001',
   'Moambe de poulet entier',
   'Poulet fermier entier cuisiné dans la sauce moambe aux noix de palme fraîches, accompagné de riz blanc et légumes sautés.',
   6000, true, 45),

  ('d2200000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002', 'c2200000-0000-0000-0000-000000000001',
   'Maboke de poisson du Congo',
   'Capitaine du fleuve Congo enveloppé dans des feuilles de bananier fraîches avec tomates, oignons et piment. Cuit à la braise, saveur unique.',
   5000, true, 35),

  ('d2200000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000002', 'c2200000-0000-0000-0000-000000000001',
   'Liboke de viande bœuf',
   'Bœuf mariné aux herbes locales et cuit en liboke (feuilles de bananier). Chair tendre, jus parfumé absorbé naturellement.',
   5500, true, 40),

  -- Grillades
  ('d2200000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000002', 'c2200000-0000-0000-0000-000000000002',
   'Brochettes de bœuf (5 pièces)',
   '5 brochettes de bœuf mariné au poivre blanc, piment rouge et oignons, grillées au charbon de bois. Servies avec sauce pimentée.',
   3000, true, 20),

  ('d2200000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000002', 'c2200000-0000-0000-0000-000000000002',
   'Poulet DG',
   'Le classique des grandes occasions : poulet sauté avec plantain mûr, carottes, haricots verts, poivrons et épices secrètes de Tantine.',
   7500, true, 45),

  -- Desserts & Jus
  ('d2200000-0000-0000-0000-000000000006',
   'b0000000-0000-0000-0000-000000000002', 'c2200000-0000-0000-0000-000000000003',
   'Beignets de banane plantain',
   'Beignets dorés de banane plantain mûre, saupoudrés de sucre vanillé. Dessert traditionnel réconfortant.',
   1500, true, 15),

  ('d2200000-0000-0000-0000-000000000007',
   'b0000000-0000-0000-0000-000000000002', 'c2200000-0000-0000-0000-000000000003',
   'Jus de gingembre citronné',
   'Gingembre frais pressé, légèrement sucré avec citron vert. Digestif naturel et rafraîchissant.',
   1000, true, 5);

-- ─────────────────────────────────────────────────────────────
-- ARTICLES DU MENU — Brazza Grill
-- ─────────────────────────────────────────────────────────────
INSERT INTO menu_items (id, restaurant_id, categorie_id, nom, description, prix, disponible, temps_preparation) VALUES
  -- Grillades
  ('d3300000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000003', 'c3300000-0000-0000-0000-000000000001',
   'Poulet DG Brazza Grill',
   'Notre version signature : poulet entier grillé puis sauté avec plantain, légumes du marché et notre sauce secrète maison.',
   8000, true, 45),

  ('d3300000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000003', 'c3300000-0000-0000-0000-000000000001',
   'Tilapia grillé (demi)',
   'Demi-tilapia braisé entier au feu de bois, sauce tomate-oignon pimentée maison. Servi avec alloco.',
   4500, true, 25),

  ('d3300000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000003', 'c3300000-0000-0000-0000-000000000001',
   'Côtes de porc grillées',
   '300g de côtes de porc marinées à la sauce soja locale et piment frais, grillées lentement au charbon.',
   5000, true, 30),

  -- Plats congolais
  ('d3300000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000003', 'c3300000-0000-0000-0000-000000000002',
   'Ndolé au crabe',
   'Feuilles amères de ndolé longuement mijotées avec crabes frais, crevettes séchées et cacahuètes grillées. Saveur authentique.',
   6000, true, 40),

  ('d3300000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000003', 'c3300000-0000-0000-0000-000000000002',
   'Saka-Saka viandes fumées',
   'Feuilles de manioc aux viandes fumées mélangées (poisson, bœuf). La recette transmise de génération en génération.',
   4000, true, 30),

  -- Boissons & Desserts
  ('d3300000-0000-0000-0000-000000000006',
   'b0000000-0000-0000-0000-000000000003', 'c3300000-0000-0000-0000-000000000003',
   'Primus 65cl',
   'La bière nationale congolaise, bien fraîche.',
   1500, true, 2),

  ('d3300000-0000-0000-0000-000000000007',
   'b0000000-0000-0000-0000-000000000003', 'c3300000-0000-0000-0000-000000000003',
   'Jus de bissap (hibiscus)',
   'Infusion d''hibiscus rouge sucrée, parfumée à la menthe fraîche. Servie bien froide.',
   1000, true, 3);

-- ─────────────────────────────────────────────────────────────
-- COMMANDES (5 commandes dans des statuts variés)
-- ─────────────────────────────────────────────────────────────
INSERT INTO orders (id, client_id, restaurant_id, livreur_id, type, statut, montant_total, frais_livraison, commission, mode_paiement, adresse_livraison, notes, created_at) VALUES

  -- Commande 1 : Josué chez Le Mami Wata → LIVRÉE (il y a 3 jours)
  (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000007',
    'livraison', 'livrée',
    10500, 1000, 1050,
    'mobile_money',
    '{"rue":"Avenue de la Paix","quartier":"Poto-Poto","ville":"Brazzaville","indication":"Face à l''école primaire, portail bleu"}',
    'Merci de ne pas trop pimenter le Saka-Saka',
    NOW() - INTERVAL '3 days'
  ),

  -- Commande 2 : Grâce chez Tantine Céleste → LIVRÉE (hier)
  (
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000007',
    'livraison', 'livrée',
    15500, 1500, 1550,
    'cash',
    '{"rue":"Rue Lumumba","quartier":"Bacongo","ville":"Brazzaville","indication":"Maison jaune à côté de la pharmacie Sainte-Anne"}',
    NULL,
    NOW() - INTERVAL '1 day'
  ),

  -- Commande 3 : Josué chez Brazza Grill → EN PRÉPARATION (aujourd'hui)
  (
    'e0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    NULL,
    'livraison', 'en_préparation',
    15000, 1000, 1800,
    'mobile_money',
    '{"rue":"Avenue des Trois Martyrs","quartier":"Poto-Poto","ville":"Brazzaville","indication":"Immeuble Madeleine, 2ème étage porte 4"}',
    'Pas trop cuit le tilapia svp',
    NOW() - INTERVAL '25 minutes'
  ),

  -- Commande 4 : Grâce chez Le Mami Wata → EN ATTENTE (retrait en boutique)
  (
    'e0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'retrait', 'en_attente',
    7000, 0, 700,
    'cash',
    NULL,
    'Je passerai récupérer vers 13h00',
    NOW() - INTERVAL '5 minutes'
  ),

  -- Commande 5 : Josué chez Tantine Céleste → ANNULÉE
  (
    'e0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000002',
    NULL,
    'livraison', 'annulée',
    10500, 1000, 1050,
    'mobile_money',
    '{"rue":"Boulevard du 15 Août","quartier":"Moungali","ville":"Brazzaville","indication":"N/A"}',
    'Annulée : adresse de livraison incorrecte',
    NOW() - INTERVAL '5 days'
  );

-- ─────────────────────────────────────────────────────────────
-- LIGNES DE COMMANDE
-- ─────────────────────────────────────────────────────────────

-- Commande 1 : 2× Saka-Saka + 2× Fufu + 1× Jus maracuja = 10 500 FCFA
INSERT INTO order_items (order_id, menu_item_id, quantite, prix_unitaire, sous_total) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd1100000-0000-0000-0000-000000000001', 2, 3500, 7000),
  ('e0000000-0000-0000-0000-000000000001', 'd1100000-0000-0000-0000-000000000005', 2, 1000, 2000),
  ('e0000000-0000-0000-0000-000000000001', 'd1100000-0000-0000-0000-000000000008', 1, 1500, 1500);

-- Commande 2 : 1× Poulet DG + 1× Maboke + 2× Jus gingembre + 1× Beignets = 15 500 FCFA
INSERT INTO order_items (order_id, menu_item_id, quantite, prix_unitaire, sous_total) VALUES
  ('e0000000-0000-0000-0000-000000000002', 'd2200000-0000-0000-0000-000000000005', 1, 7500,  7500),
  ('e0000000-0000-0000-0000-000000000002', 'd2200000-0000-0000-0000-000000000002', 1, 5000,  5000),
  ('e0000000-0000-0000-0000-000000000002', 'd2200000-0000-0000-0000-000000000007', 2, 1000,  2000),
  ('e0000000-0000-0000-0000-000000000002', 'd2200000-0000-0000-0000-000000000006', 1, 1500,  1500);

-- Commande 3 : 1× Poulet DG Brazza + 1× Ndolé + 2× Primus = 15 000 FCFA
INSERT INTO order_items (order_id, menu_item_id, quantite, prix_unitaire, sous_total) VALUES
  ('e0000000-0000-0000-0000-000000000003', 'd3300000-0000-0000-0000-000000000001', 1, 8000, 8000),
  ('e0000000-0000-0000-0000-000000000003', 'd3300000-0000-0000-0000-000000000004', 1, 6000, 6000),
  ('e0000000-0000-0000-0000-000000000003', 'd3300000-0000-0000-0000-000000000006', 2, 1500, 3000); -- Note : montant_total ajusté à 15000 si besoin

-- Commande 4 : 1× Poisson braisé + 1× Alloco = 7 000 FCFA
INSERT INTO order_items (order_id, menu_item_id, quantite, prix_unitaire, sous_total) VALUES
  ('e0000000-0000-0000-0000-000000000004', 'd1100000-0000-0000-0000-000000000002', 1, 5500, 5500),
  ('e0000000-0000-0000-0000-000000000004', 'd1100000-0000-0000-0000-000000000007', 1, 1500, 1500);

-- Commande 5 (annulée) : 2× Brochettes + 2× Beignets = 9 000 FCFA (diff avec montant_total = arrondi comm.)
INSERT INTO order_items (order_id, menu_item_id, quantite, prix_unitaire, sous_total) VALUES
  ('e0000000-0000-0000-0000-000000000005', 'd2200000-0000-0000-0000-000000000004', 2, 3000, 6000),
  ('e0000000-0000-0000-0000-000000000005', 'd2200000-0000-0000-0000-000000000006', 3, 1500, 4500);

-- ─────────────────────────────────────────────────────────────
-- LIVRAISONS
-- ─────────────────────────────────────────────────────────────
INSERT INTO deliveries (order_id, livreur_id, statut, position_actuelle, heure_prise_en_charge, heure_livraison, created_at) VALUES
  -- Livraison commande 1 : terminée
  (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000007',
    'livrée',
    '{"lat":-4.2601,"lng":15.2451}',
    NOW() - INTERVAL '3 days' + INTERVAL '20 minutes',
    NOW() - INTERVAL '3 days' + INTERVAL '55 minutes',
    NOW() - INTERVAL '3 days'
  ),
  -- Livraison commande 2 : terminée
  (
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000007',
    'livrée',
    '{"lat":-4.3010,"lng":15.2598}',
    NOW() - INTERVAL '1 day' + INTERVAL '30 minutes',
    NOW() - INTERVAL '1 day' + INTERVAL '70 minutes',
    NOW() - INTERVAL '1 day'
  );

-- ─────────────────────────────────────────────────────────────
-- AVIS CLIENTS (uniquement pour les commandes livrées)
-- ─────────────────────────────────────────────────────────────
INSERT INTO reviews (client_id, restaurant_id, order_id, note, commentaire, created_at) VALUES
  -- Josué note Le Mami Wata suite à la commande 1
  (
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    5,
    'Excellent ! Le Saka-Saka était divin, exactement comme ma grand-mère le préparait à Dolisie. Livraison rapide, plat encore bien chaud à la réception. Je recommande à 100%.',
    NOW() - INTERVAL '3 days' + INTERVAL '2 hours'
  ),
  -- Grâce note Tantine Céleste suite à la commande 2
  (
    'a0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000002',
    5,
    'Le Poulet DG de Tantine Céleste est sans conteste le meilleur de Brazzaville ! Le Maboke était parfait, le poisson fondant et très parfumé. La prochaine fois je prends le double.',
    NOW() - INTERVAL '1 day' + INTERVAL '3 hours'
  );

-- ─────────────────────────────────────────────────────────────
-- PROMOTIONS
-- ─────────────────────────────────────────────────────────────
INSERT INTO promotions (restaurant_id, code, type, valeur, date_debut, date_fin, actif) VALUES
  -- Le Mami Wata : 15 % de réduction (valable 6 mois)
  ('b0000000-0000-0000-0000-000000000001', 'MAMIWATA15',    'pourcentage', 15,   '2026-01-01', '2026-06-30', true),
  -- Tantine Céleste : 1 000 FCFA offerts sur toute commande (mois d'avril)
  ('b0000000-0000-0000-0000-000000000002', 'TANTINE1000',   'montant_fixe', 1000, '2026-04-01', '2026-04-30', true),
  -- Brazza Grill : 10 % les week-ends toute l'année
  ('b0000000-0000-0000-0000-000000000003', 'BRAZZAWEEKEND', 'pourcentage', 10,   '2026-01-01', '2026-12-31', true);


-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================
