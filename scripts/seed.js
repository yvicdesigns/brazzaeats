// ============================================================
// BrazzaEats — Script de seed des données de test
// Usage : node scripts/seed.js
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://oecjihnwisuieriswcvh.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY2ppaG53aXN1aWVyaXN3Y3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5OTk5NCwiZXhwIjoyMDkwMjc1OTk0fQ.0njmLASl1tGmV1fVw-vR15KT1mAoZIacjUUkhTSOqXI'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const PASSWORD = 'BrazzaEats2024!'

// ── Utilisateurs à créer ──────────────────────────────────
const USERS = [
  { id: 'a0000000-0000-0000-0000-000000000001', email: 'admin@brazzaeats.test',       role: 'admin',      nom: 'Administrateur BrazzaEats',  telephone: '+242066000001', daysAgo: 60 },
  { id: 'a0000000-0000-0000-0000-000000000002', email: 'mamiwata@brazzaeats.test',     role: 'restaurant', nom: 'Mami Wata SARL',             telephone: '+242066000002', daysAgo: 45 },
  { id: 'a0000000-0000-0000-0000-000000000003', email: 'tantine@brazzaeats.test',      role: 'restaurant', nom: 'Tantine Céleste Entreprise', telephone: '+242066000003', daysAgo: 40 },
  { id: 'a0000000-0000-0000-0000-000000000004', email: 'brazzagrill@brazzaeats.test',  role: 'restaurant', nom: 'Brazza Grill Moungali',      telephone: '+242066000004', daysAgo: 30 },
  { id: 'a0000000-0000-0000-0000-000000000005', email: 'josue@brazzaeats.test',        role: 'client',     nom: 'Josué Nkounkou',            telephone: '+242066111111', daysAgo: 20 },
  { id: 'a0000000-0000-0000-0000-000000000006', email: 'grace@brazzaeats.test',        role: 'client',     nom: 'Grâce Malonga',             telephone: '+242066222222', daysAgo: 15 },
  { id: 'a0000000-0000-0000-0000-000000000007', email: 'fiston@brazzaeats.test',       role: 'livreur',    nom: 'Fiston Massamba',           telephone: '+242066333333', daysAgo: 25 },
]

// ── Helpers ───────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function log(msg)  { console.log(`  ✓  ${msg}`) }
function warn(msg) { console.warn(`  ⚠  ${msg}`) }
function err(msg)  { console.error(`  ✗  ${msg}`) }

// ── Étape 0 : supprimer les comptes Auth sans les bons IDs
async function cleanupWrongUsers() {
  console.log('\n── Nettoyage des anciens comptes ──')
  const EXPECTED_IDS = new Set(USERS.map(u => u.id))
  const EMAILS       = new Set(USERS.map(u => u.email))

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 })
  if (error) { warn(`listUsers : ${error.message}`); return }

  for (const u of (data?.users ?? [])) {
    if (EMAILS.has(u.email) && !EXPECTED_IDS.has(u.id)) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id)
      if (delErr) warn(`delete ${u.email} : ${delErr.message}`)
      else log(`Supprimé ${u.email} (mauvais UUID ${u.id})`)
    }
  }
}

// ── Étape 1 : créer les comptes Auth avec UUID fixe via HTTP
async function createAuthUsers() {
  console.log('\n── Création des comptes Auth ──')
  for (const u of USERS) {
    // Vérifier si l'utilisateur existe déjà avec le bon ID
    const { data: existing } = await supabase.auth.admin.getUserById(u.id)
    if (existing?.user?.id === u.id) {
      log(`${u.email} existe déjà avec le bon ID — ignoré`)
      continue
    }

    // Appel direct à l'API GoTrue admin (supporte le champ "id")
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        id:            u.id,
        email:         u.email,
        password:      PASSWORD,
        email_confirm: true,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      if (json.msg?.includes('already') || json.code === 'email_exists') {
        warn(`${u.email} existe déjà — ignoré`)
      } else {
        err(`${u.email} : ${json.msg ?? JSON.stringify(json)}`)
      }
    } else {
      log(`${u.email} (${u.role}) → ${json.id}`)
    }
  }
}

// ── Étape 2 : créer / mettre à jour les profils ──────────
async function upsertProfiles() {
  console.log('\n── Upsert des profils ──')
  const rows = USERS.map(u => ({
    id:         u.id,
    role:       u.role,
    nom:        u.nom,
    telephone:  u.telephone,
    created_at: daysAgo(u.daysAgo),
  }))
  const { error } = await supabase.from('profiles').upsert(rows, { onConflict: 'id' })
  if (error) err(`profiles : ${error.message}`)
  else log(`${rows.length} profils insérés/mis à jour`)
}

// ── Étape 3 : restaurants ─────────────────────────────────
async function upsertRestaurants() {
  console.log('\n── Upsert des restaurants ──')
  const rows = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      owner_id: 'a0000000-0000-0000-0000-000000000002',
      nom: 'Le Mami Wata',
      description: 'Cuisine congolaise traditionnelle au cœur de Poto-Poto. Spécialités maison : Saka-Saka au poisson fumé, Fufu artisanal, Ntaba en sauce.',
      adresse: 'Avenue des Trois Martyrs, Poto-Poto, Brazzaville',
      latitude: -4.2634, longitude: 15.2429,
      horaires: {"lundi":{"ouverture":"08:00","fermeture":"22:00"},"mardi":{"ouverture":"08:00","fermeture":"22:00"},"mercredi":{"ouverture":"08:00","fermeture":"22:00"},"jeudi":{"ouverture":"08:00","fermeture":"22:00"},"vendredi":{"ouverture":"08:00","fermeture":"23:00"},"samedi":{"ouverture":"09:00","fermeture":"23:00"},"dimanche":{"ouverture":"10:00","fermeture":"21:00"}},
      commission_rate: 10, statut: 'actif', note_moyenne: 4.6,
      created_at: daysAgo(45),
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      owner_id: 'a0000000-0000-0000-0000-000000000003',
      nom: 'Chez Tantine Céleste',
      description: 'La cuisine de maman comme à la maison. Plats mijotés, Maboke du fleuve et Poulet DG authentique à Bacongo.',
      adresse: 'Rue Boundji, Bacongo, Brazzaville',
      latitude: -4.3021, longitude: 15.2612,
      horaires: {"lundi":{"ouverture":"09:00","fermeture":"21:00"},"mardi":{"ouverture":"09:00","fermeture":"21:00"},"mercredi":{"ouverture":"09:00","fermeture":"21:00"},"jeudi":{"ouverture":"09:00","fermeture":"21:00"},"vendredi":{"ouverture":"09:00","fermeture":"22:00"},"samedi":{"ouverture":"09:00","fermeture":"22:00"},"dimanche":{"ferme":true}},
      commission_rate: 10, statut: 'actif', note_moyenne: 4.8,
      created_at: daysAgo(40),
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      owner_id: 'a0000000-0000-0000-0000-000000000004',
      nom: 'Brazza Grill',
      description: 'Le meilleur braisé de Moungali. Poulet DG signature, Ndolé au crabe, grillades au charbon de bois et bières fraîches.',
      adresse: 'Boulevard Denis Sassou Nguesso, Moungali, Brazzaville',
      latitude: -4.2478, longitude: 15.2801,
      horaires: {"lundi":{"ouverture":"11:00","fermeture":"23:00"},"mardi":{"ouverture":"11:00","fermeture":"23:00"},"mercredi":{"ouverture":"11:00","fermeture":"23:00"},"jeudi":{"ouverture":"11:00","fermeture":"23:00"},"vendredi":{"ouverture":"11:00","fermeture":"00:00"},"samedi":{"ouverture":"10:00","fermeture":"00:00"},"dimanche":{"ouverture":"10:00","fermeture":"22:00"}},
      commission_rate: 12, statut: 'actif', note_moyenne: 4.4,
      created_at: daysAgo(30),
    },
  ]
  const { error } = await supabase.from('restaurants').upsert(rows, { onConflict: 'id' })
  if (error) err(`restaurants : ${error.message}`)
  else log(`${rows.length} restaurants insérés/mis à jour`)
}

// ── Étape 4 : catégories de menu ──────────────────────────
async function upsertMenuCategories() {
  console.log('\n── Upsert des catégories de menu ──')
  const rows = [
    // Le Mami Wata
    { id: 'c1100000-0000-0000-0000-000000000001', restaurant_id: 'b0000000-0000-0000-0000-000000000001', nom: 'Plats principaux', ordre: 1, visible: true },
    { id: 'c1100000-0000-0000-0000-000000000002', restaurant_id: 'b0000000-0000-0000-0000-000000000001', nom: 'Accompagnements',  ordre: 2, visible: true },
    { id: 'c1100000-0000-0000-0000-000000000003', restaurant_id: 'b0000000-0000-0000-0000-000000000001', nom: 'Boissons',         ordre: 3, visible: true },
    // Tantine Céleste
    { id: 'c2200000-0000-0000-0000-000000000001', restaurant_id: 'b0000000-0000-0000-0000-000000000002', nom: 'Plats mijotés',    ordre: 1, visible: true },
    { id: 'c2200000-0000-0000-0000-000000000002', restaurant_id: 'b0000000-0000-0000-0000-000000000002', nom: 'Grillades',        ordre: 2, visible: true },
    { id: 'c2200000-0000-0000-0000-000000000003', restaurant_id: 'b0000000-0000-0000-0000-000000000002', nom: 'Desserts & Jus',   ordre: 3, visible: true },
    // Brazza Grill
    { id: 'c3300000-0000-0000-0000-000000000001', restaurant_id: 'b0000000-0000-0000-0000-000000000003', nom: 'Grillades',             ordre: 1, visible: true },
    { id: 'c3300000-0000-0000-0000-000000000002', restaurant_id: 'b0000000-0000-0000-0000-000000000003', nom: 'Plats congolais',       ordre: 2, visible: true },
    { id: 'c3300000-0000-0000-0000-000000000003', restaurant_id: 'b0000000-0000-0000-0000-000000000003', nom: 'Boissons & Desserts',   ordre: 3, visible: true },
  ]
  const { error } = await supabase.from('menu_categories').upsert(rows, { onConflict: 'id' })
  if (error) err(`menu_categories : ${error.message}`)
  else log(`${rows.length} catégories insérées/mises à jour`)
}

// ── Étape 5 : articles du menu ────────────────────────────
async function upsertMenuItems() {
  console.log('\n── Upsert des articles du menu ──')
  const R1 = 'b0000000-0000-0000-0000-000000000001'
  const R2 = 'b0000000-0000-0000-0000-000000000002'
  const R3 = 'b0000000-0000-0000-0000-000000000003'

  const rows = [
    // ── Le Mami Wata ─────────────────────────────────────
    { id:'d1100000-0000-0000-0000-000000000001', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000001', nom:'Saka-Saka au poisson fumé',   description:'Feuilles de manioc pilées longuement mijotées avec du poisson fumé du Pool, huile de palme rouge et épices locales. Servi avec fufu maison.', prix:3500, disponible:true, temps_preparation:20 },
    { id:'d1100000-0000-0000-0000-000000000002', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000001', nom:'Poisson braisé entier',        description:'Tilapia frais du fleuve Congo braisé au feu de bois, mariné aux oignons, piment doux et citron vert. Servi avec plantain braisé.', prix:5500, disponible:true, temps_preparation:30 },
    { id:'d1100000-0000-0000-0000-000000000003', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000001', nom:'Poulet braisé (quart)',        description:"Quart de poulet fermier braisé au charbon, sauce moambe maison aux noix de palme fraîches. Accompagnement au choix.", prix:4500, disponible:true, temps_preparation:25 },
    { id:'d1100000-0000-0000-0000-000000000004', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000001', nom:'Ntaba en sauce tomate',        description:'Viande de chèvre mijotée en sauce tomate épicée avec gingembre frais, ail et herbes aromatiques du Congo. Fondante et parfumée.', prix:6500, disponible:true, temps_preparation:40 },
    { id:'d1100000-0000-0000-0000-000000000005', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000002', nom:'Fufu de manioc',               description:'Fufu traditionnel préparé à la minute, texture lisse et homogène.', prix:1000, disponible:true, temps_preparation:10 },
    { id:'d1100000-0000-0000-0000-000000000006', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000002', nom:'Riz blanc parfumé',            description:'Riz long grain cuit à la vapeur.', prix:800, disponible:true, temps_preparation:5 },
    { id:'d1100000-0000-0000-0000-000000000007', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000002', nom:'Alloco (plantain frit)',       description:"Tranches de banane plantain mûre frites à l'huile de palme, dorées et caramélisées.", prix:1500, disponible:true, temps_preparation:10 },
    { id:'d1100000-0000-0000-0000-000000000008', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000003', nom:'Jus de maracuja maison',       description:'Jus de fruit de la passion pressé à la commande, légèrement sucré.', prix:1500, disponible:true, temps_preparation:5 },
    { id:'d1100000-0000-0000-0000-000000000009', restaurant_id:R1, categorie_id:'c1100000-0000-0000-0000-000000000003', nom:"Eau minérale 1,5L",            description:'Eau minérale naturelle plate.', prix:500, disponible:true, temps_preparation:2 },
    // ── Tantine Céleste ──────────────────────────────────
    { id:'d2200000-0000-0000-0000-000000000001', restaurant_id:R2, categorie_id:'c2200000-0000-0000-0000-000000000001', nom:'Moambe de poulet entier',      description:'Poulet fermier entier cuisiné dans la sauce moambe aux noix de palme fraîches, accompagné de riz blanc et légumes sautés.', prix:6000, disponible:true, temps_preparation:45 },
    { id:'d2200000-0000-0000-0000-000000000002', restaurant_id:R2, categorie_id:'c2200000-0000-0000-0000-000000000001', nom:'Maboke de poisson du Congo',   description:'Capitaine du fleuve Congo enveloppé dans des feuilles de bananier fraîches avec tomates, oignons et piment. Cuit à la braise, saveur unique.', prix:5000, disponible:true, temps_preparation:35 },
    { id:'d2200000-0000-0000-0000-000000000003', restaurant_id:R2, categorie_id:'c2200000-0000-0000-0000-000000000001', nom:'Liboke de viande bœuf',        description:'Bœuf mariné aux herbes locales et cuit en liboke (feuilles de bananier). Chair tendre, jus parfumé absorbé naturellement.', prix:5500, disponible:true, temps_preparation:40 },
    { id:'d2200000-0000-0000-0000-000000000004', restaurant_id:R2, categorie_id:'c2200000-0000-0000-0000-000000000002', nom:'Brochettes de bœuf (5 pièces)',description:'5 brochettes de bœuf mariné au poivre blanc, piment rouge et oignons, grillées au charbon de bois. Servies avec sauce pimentée.', prix:3000, disponible:true, temps_preparation:20 },
    { id:'d2200000-0000-0000-0000-000000000005', restaurant_id:R2, categorie_id:'c2200000-0000-0000-0000-000000000002', nom:'Poulet DG',                    description:'Le classique des grandes occasions : poulet sauté avec plantain mûr, carottes, haricots verts, poivrons et épices secrètes de Tantine.', prix:7500, disponible:true, temps_preparation:45 },
    { id:'d2200000-0000-0000-0000-000000000006', restaurant_id:R2, categorie_id:'c2200000-0000-0000-0000-000000000003', nom:'Beignets de banane plantain',  description:'Beignets dorés de banane plantain mûre, saupoudrés de sucre vanillé. Dessert traditionnel réconfortant.', prix:1500, disponible:true, temps_preparation:15 },
    { id:'d2200000-0000-0000-0000-000000000007', restaurant_id:R2, categorie_id:'c2200000-0000-0000-0000-000000000003', nom:'Jus de gingembre citronné',    description:'Gingembre frais pressé, légèrement sucré avec citron vert. Digestif naturel et rafraîchissant.', prix:1000, disponible:true, temps_preparation:5 },
    // ── Brazza Grill ─────────────────────────────────────
    { id:'d3300000-0000-0000-0000-000000000001', restaurant_id:R3, categorie_id:'c3300000-0000-0000-0000-000000000001', nom:'Poulet DG Brazza Grill',       description:'Notre version signature : poulet entier grillé puis sauté avec plantain, légumes du marché et notre sauce secrète maison.', prix:8000, disponible:true, temps_preparation:45 },
    { id:'d3300000-0000-0000-0000-000000000002', restaurant_id:R3, categorie_id:'c3300000-0000-0000-0000-000000000001', nom:'Tilapia grillé (demi)',         description:'Demi-tilapia braisé entier au feu de bois, sauce tomate-oignon pimentée maison. Servi avec alloco.', prix:4500, disponible:true, temps_preparation:25 },
    { id:'d3300000-0000-0000-0000-000000000003', restaurant_id:R3, categorie_id:'c3300000-0000-0000-0000-000000000001', nom:'Côtes de porc grillées',       description:'300g de côtes de porc marinées à la sauce soja locale et piment frais, grillées lentement au charbon.', prix:5000, disponible:true, temps_preparation:30 },
    { id:'d3300000-0000-0000-0000-000000000004', restaurant_id:R3, categorie_id:'c3300000-0000-0000-0000-000000000002', nom:'Ndolé au crabe',               description:'Feuilles amères de ndolé longuement mijotées avec crabes frais, crevettes séchées et cacahuètes grillées. Saveur authentique.', prix:6000, disponible:true, temps_preparation:40 },
    { id:'d3300000-0000-0000-0000-000000000005', restaurant_id:R3, categorie_id:'c3300000-0000-0000-0000-000000000002', nom:'Saka-Saka viandes fumées',     description:'Feuilles de manioc aux viandes fumées mélangées (poisson, bœuf). La recette transmise de génération en génération.', prix:4000, disponible:true, temps_preparation:30 },
    { id:'d3300000-0000-0000-0000-000000000006', restaurant_id:R3, categorie_id:'c3300000-0000-0000-0000-000000000003', nom:'Primus 65cl',                  description:'La bière nationale congolaise, bien fraîche.', prix:1500, disponible:true, temps_preparation:2 },
    { id:'d3300000-0000-0000-0000-000000000007', restaurant_id:R3, categorie_id:'c3300000-0000-0000-0000-000000000003', nom:'Jus de bissap (hibiscus)',     description:"Infusion d'hibiscus rouge sucrée, parfumée à la menthe fraîche. Servie bien froide.", prix:1000, disponible:true, temps_preparation:3 },
  ]
  const { error } = await supabase.from('menu_items').upsert(rows, { onConflict: 'id' })
  if (error) err(`menu_items : ${error.message}`)
  else log(`${rows.length} articles insérés/mis à jour`)
}

// ── Étape 6 : commandes + lignes ──────────────────────────
async function upsertOrders() {
  console.log('\n── Upsert des commandes ──')
  const orders = [
    { id:'e0000000-0000-0000-0000-000000000001', client_id:'a0000000-0000-0000-0000-000000000005', restaurant_id:'b0000000-0000-0000-0000-000000000001', livreur_id:'a0000000-0000-0000-0000-000000000007', type:'livraison', statut:'livrée',         montant_total:10500, frais_livraison:1000, commission:1050, mode_paiement:'mobile_money', adresse_livraison:{rue:"Avenue de la Paix",quartier:"Poto-Poto",ville:"Brazzaville",indication:"Face à l'école primaire, portail bleu"}, notes:"Merci de ne pas trop pimenter le Saka-Saka", created_at:daysAgo(3) },
    { id:'e0000000-0000-0000-0000-000000000002', client_id:'a0000000-0000-0000-0000-000000000006', restaurant_id:'b0000000-0000-0000-0000-000000000002', livreur_id:'a0000000-0000-0000-0000-000000000007', type:'livraison', statut:'livrée',         montant_total:15500, frais_livraison:1500, commission:1550, mode_paiement:'cash',         adresse_livraison:{rue:"Rue Lumumba",quartier:"Bacongo",ville:"Brazzaville",indication:"Maison jaune à côté de la pharmacie Sainte-Anne"}, notes:null, created_at:daysAgo(1) },
    { id:'e0000000-0000-0000-0000-000000000003', client_id:'a0000000-0000-0000-0000-000000000005', restaurant_id:'b0000000-0000-0000-0000-000000000003', livreur_id:null,                                  type:'livraison', statut:'en_préparation', montant_total:15000, frais_livraison:1000, commission:1800, mode_paiement:'mobile_money', adresse_livraison:{rue:"Avenue des Trois Martyrs",quartier:"Poto-Poto",ville:"Brazzaville",indication:"Immeuble Madeleine, 2ème étage porte 4"}, notes:'Pas trop cuit le tilapia svp', created_at:new Date(Date.now()-25*60000).toISOString() },
    { id:'e0000000-0000-0000-0000-000000000004', client_id:'a0000000-0000-0000-0000-000000000006', restaurant_id:'b0000000-0000-0000-0000-000000000001', livreur_id:null,                                  type:'retrait',   statut:'en_attente',     montant_total:7000,  frais_livraison:0,    commission:700,  mode_paiement:'cash',         adresse_livraison:null, notes:'Je passerai récupérer vers 13h00', created_at:new Date(Date.now()-5*60000).toISOString() },
    { id:'e0000000-0000-0000-0000-000000000006', client_id:'a0000000-0000-0000-0000-000000000005', restaurant_id:'b0000000-0000-0000-0000-000000000002', livreur_id:null,                                  type:'livraison', statut:'prête',           montant_total:12500, frais_livraison:1500, commission:1250, mode_paiement:'mobile_money', adresse_livraison:{rue:"Avenue Matsoua",quartier:"Bacongo",ville:"Brazzaville",indication:"Près du marché Total, maison rouge"}, notes:null, created_at:new Date(Date.now()-10*60000).toISOString() },
    { id:'e0000000-0000-0000-0000-000000000007', client_id:'a0000000-0000-0000-0000-000000000006', restaurant_id:'b0000000-0000-0000-0000-000000000001', livreur_id:null,                                  type:'livraison', statut:'prête',           montant_total:8500,  frais_livraison:1000, commission:850,  mode_paiement:'cash',         adresse_livraison:{rue:"Rue Louvain",quartier:"Ouenzé",ville:"Brazzaville",indication:"Entrée du quartier, 2ème maison à gauche"}, notes:'Sonner au portail bleu', created_at:new Date(Date.now()-8*60000).toISOString() },
    { id:'e0000000-0000-0000-0000-000000000005', client_id:'a0000000-0000-0000-0000-000000000005', restaurant_id:'b0000000-0000-0000-0000-000000000002', livreur_id:null,                                  type:'livraison', statut:'annulée',        montant_total:10500, frais_livraison:1000, commission:1050, mode_paiement:'mobile_money', adresse_livraison:{rue:"Boulevard du 15 Août",quartier:"Moungali",ville:"Brazzaville",indication:"N/A"}, notes:'Annulée : adresse de livraison incorrecte', created_at:daysAgo(5) },
  ]
  const { error: oErr } = await supabase.from('orders').upsert(orders, { onConflict: 'id' })
  if (oErr) { err(`orders : ${oErr.message}`); return }
  log(`${orders.length} commandes insérées/mises à jour`)

  const items = [
    // Commande 1
    { order_id:'e0000000-0000-0000-0000-000000000001', menu_item_id:'d1100000-0000-0000-0000-000000000001', quantite:2, prix_unitaire:3500, sous_total:7000 },
    { order_id:'e0000000-0000-0000-0000-000000000001', menu_item_id:'d1100000-0000-0000-0000-000000000005', quantite:2, prix_unitaire:1000, sous_total:2000 },
    { order_id:'e0000000-0000-0000-0000-000000000001', menu_item_id:'d1100000-0000-0000-0000-000000000008', quantite:1, prix_unitaire:1500, sous_total:1500 },
    // Commande 2
    { order_id:'e0000000-0000-0000-0000-000000000002', menu_item_id:'d2200000-0000-0000-0000-000000000005', quantite:1, prix_unitaire:7500, sous_total:7500 },
    { order_id:'e0000000-0000-0000-0000-000000000002', menu_item_id:'d2200000-0000-0000-0000-000000000002', quantite:1, prix_unitaire:5000, sous_total:5000 },
    { order_id:'e0000000-0000-0000-0000-000000000002', menu_item_id:'d2200000-0000-0000-0000-000000000007', quantite:2, prix_unitaire:1000, sous_total:2000 },
    { order_id:'e0000000-0000-0000-0000-000000000002', menu_item_id:'d2200000-0000-0000-0000-000000000006', quantite:1, prix_unitaire:1500, sous_total:1500 },
    // Commande 3
    { order_id:'e0000000-0000-0000-0000-000000000003', menu_item_id:'d3300000-0000-0000-0000-000000000001', quantite:1, prix_unitaire:8000, sous_total:8000 },
    { order_id:'e0000000-0000-0000-0000-000000000003', menu_item_id:'d3300000-0000-0000-0000-000000000004', quantite:1, prix_unitaire:6000, sous_total:6000 },
    { order_id:'e0000000-0000-0000-0000-000000000003', menu_item_id:'d3300000-0000-0000-0000-000000000006', quantite:2, prix_unitaire:1500, sous_total:3000 },
    // Commande 4
    { order_id:'e0000000-0000-0000-0000-000000000004', menu_item_id:'d1100000-0000-0000-0000-000000000002', quantite:1, prix_unitaire:5500, sous_total:5500 },
    { order_id:'e0000000-0000-0000-0000-000000000004', menu_item_id:'d1100000-0000-0000-0000-000000000007', quantite:1, prix_unitaire:1500, sous_total:1500 },
    // Commande 5
    { order_id:'e0000000-0000-0000-0000-000000000005', menu_item_id:'d2200000-0000-0000-0000-000000000004', quantite:2, prix_unitaire:3000, sous_total:6000 },
    { order_id:'e0000000-0000-0000-0000-000000000005', menu_item_id:'d2200000-0000-0000-0000-000000000006', quantite:3, prix_unitaire:1500, sous_total:4500 },
    // Commande 6 (prête — Tantine)
    { order_id:'e0000000-0000-0000-0000-000000000006', menu_item_id:'d2200000-0000-0000-0000-000000000001', quantite:1, prix_unitaire:8000, sous_total:8000 },
    { order_id:'e0000000-0000-0000-0000-000000000006', menu_item_id:'d2200000-0000-0000-0000-000000000003', quantite:1, prix_unitaire:4500, sous_total:4500 },
    // Commande 7 (prête — Mami Wata)
    { order_id:'e0000000-0000-0000-0000-000000000007', menu_item_id:'d1100000-0000-0000-0000-000000000003', quantite:1, prix_unitaire:6000, sous_total:6000 },
    { order_id:'e0000000-0000-0000-0000-000000000007', menu_item_id:'d1100000-0000-0000-0000-000000000006', quantite:1, prix_unitaire:2500, sous_total:2500 },
  ]
  const { error: iErr } = await supabase.from('order_items').insert(items)
  if (iErr) warn(`order_items (peut-être déjà présents) : ${iErr.message}`)
  else log(`${items.length} lignes de commande insérées`)
}

// ── Étape 7 : livraisons ──────────────────────────────────
async function upsertDeliveries() {
  console.log('\n── Upsert des livraisons ──')
  const rows = [
    { order_id:'e0000000-0000-0000-0000-000000000001', livreur_id:'a0000000-0000-0000-0000-000000000007', statut:'livrée', position_actuelle:{lat:-4.2601,lng:15.2451}, heure_prise_en_charge:new Date(Date.now()-3*86400000+20*60000).toISOString(), heure_livraison:new Date(Date.now()-3*86400000+55*60000).toISOString(), created_at:daysAgo(3) },
    { order_id:'e0000000-0000-0000-0000-000000000002', livreur_id:'a0000000-0000-0000-0000-000000000007', statut:'livrée', position_actuelle:{lat:-4.3010,lng:15.2598}, heure_prise_en_charge:new Date(Date.now()-1*86400000+30*60000).toISOString(), heure_livraison:new Date(Date.now()-1*86400000+70*60000).toISOString(), created_at:daysAgo(1) },
  ]
  // Pas de contrainte UNIQUE sur order_id → on supprime puis on réinsère
  const orderIds = rows.map(r => r.order_id)
  await supabase.from('deliveries').delete().in('order_id', orderIds)
  const { error } = await supabase.from('deliveries').insert(rows)
  if (error) err(`deliveries : ${error.message}`)
  else log(`${rows.length} livraisons insérées`)
}

// ── Étape 8 : avis ────────────────────────────────────────
async function upsertReviews() {
  console.log('\n── Upsert des avis ──')
  const rows = [
    { client_id:'a0000000-0000-0000-0000-000000000005', restaurant_id:'b0000000-0000-0000-0000-000000000001', order_id:'e0000000-0000-0000-0000-000000000001', note:5, commentaire:"Excellent ! Le Saka-Saka était divin, exactement comme ma grand-mère le préparait à Dolisie. Livraison rapide, plat encore bien chaud à la réception. Je recommande à 100%.", created_at:new Date(Date.now()-3*86400000+2*3600000).toISOString() },
    { client_id:'a0000000-0000-0000-0000-000000000006', restaurant_id:'b0000000-0000-0000-0000-000000000002', order_id:'e0000000-0000-0000-0000-000000000002', note:5, commentaire:"Le Poulet DG de Tantine Céleste est sans conteste le meilleur de Brazzaville ! Le Maboke était parfait, le poisson fondant et très parfumé. La prochaine fois je prends le double.", created_at:new Date(Date.now()-1*86400000+3*3600000).toISOString() },
  ]
  const { error } = await supabase.from('reviews').upsert(rows, { onConflict: 'order_id' })
  if (error) err(`reviews : ${error.message}`)
  else log(`${rows.length} avis insérés/mis à jour`)
}

// ── Étape 9 : promotions ──────────────────────────────────
async function upsertPromotions() {
  console.log('\n── Upsert des promotions ──')
  const rows = [
    { restaurant_id:'b0000000-0000-0000-0000-000000000001', code:'MAMIWATA15',    type:'pourcentage', valeur:15,   date_debut:'2026-01-01', date_fin:'2026-06-30', actif:true },
    { restaurant_id:'b0000000-0000-0000-0000-000000000002', code:'TANTINE1000',   type:'montant_fixe', valeur:1000, date_debut:'2026-04-01', date_fin:'2026-04-30', actif:true },
    { restaurant_id:'b0000000-0000-0000-0000-000000000003', code:'BRAZZAWEEKEND', type:'pourcentage', valeur:10,   date_debut:'2026-01-01', date_fin:'2026-12-31', actif:true },
  ]
  const { error } = await supabase.from('promotions').upsert(rows, { onConflict: 'code' })
  if (error) err(`promotions : ${error.message}`)
  else log(`${rows.length} promotions insérées/mises à jour`)
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log('🍽️  BrazzaEats — Seed des données de test\n')
  await cleanupWrongUsers()
  await createAuthUsers()
  await upsertProfiles()
  await upsertRestaurants()
  await upsertMenuCategories()
  await upsertMenuItems()
  await upsertOrders()
  await upsertDeliveries()
  await upsertReviews()
  await upsertPromotions()
  console.log('\n✅  Seed terminé !\n')
  console.log('Comptes disponibles (mot de passe : BrazzaEats2024!) :')
  USERS.forEach(u => console.log(`  ${u.role.padEnd(12)} ${u.email}`))
}

main().catch(e => { console.error(e); process.exit(1) })
