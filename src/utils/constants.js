// ============================================================
// Constantes globales Zandofood
// ============================================================

// ------------------------------------------------------------
// Rôles utilisateurs (miroir de l'enum PostgreSQL role_utilisateur)
// ------------------------------------------------------------
export const ROLES = {
  CLIENT:     'client',
  RESTAURANT: 'restaurant',
  LIVREUR:    'livreur',
  ADMIN:      'admin',
}

// Tableau de bord vers lequel chaque rôle est redirigé après connexion
// (et depuis lequel un rôle non-client est renvoyé s'il erre dans l'espace client)
export const REDIRECT_PAR_ROLE = {
  client:     '/',
  restaurant: '/restaurant/dashboard',
  livreur:    '/livreur/dashboard',
  admin:      '/admin/dashboard',
}

// ------------------------------------------------------------
// Statuts de commande
// Chaque statut expose : label (FR), couleur Tailwind, ordre dans le flux
// ------------------------------------------------------------
export const STATUTS_COMMANDE = {
  en_attente: {
    label:      'En attente',
    couleur:    'bg-yellow-100 text-yellow-800',
    couleurDot: 'bg-yellow-400',
    ordre:      1,
  },
  acceptée: {
    label:      'Acceptée',
    couleur:    'bg-blue-100 text-blue-800',
    couleurDot: 'bg-blue-400',
    ordre:      2,
  },
  en_préparation: {
    label:      'En préparation',
    couleur:    'bg-indigo-100 text-indigo-800',
    couleurDot: 'bg-indigo-400',
    ordre:      3,
  },
  prête: {
    label:      'Prête',
    couleur:    'bg-purple-100 text-purple-800',
    couleurDot: 'bg-purple-400',
    ordre:      4,
  },
  en_livraison: {
    label:      'En livraison',
    couleur:    'bg-orange-100 text-orange-800',
    couleurDot: 'bg-orange-400',
    ordre:      5,
  },
  livrée: {
    label:      'Livrée',
    couleur:    'bg-green-100 text-green-800',
    couleurDot: 'bg-green-500',
    ordre:      6,
  },
  annulée: {
    label:      'Annulée',
    couleur:    'bg-red-100 text-red-800',
    couleurDot: 'bg-red-400',
    ordre:      7,
  },
}

// Statuts actifs (commande non terminée)
export const STATUTS_ACTIFS = ['en_attente', 'acceptée', 'en_préparation', 'prête', 'en_livraison']

// Statuts terminaux
export const STATUTS_TERMINAUX = ['livrée', 'annulée']

// ------------------------------------------------------------
// Statuts restaurant
// ------------------------------------------------------------
export const STATUTS_RESTAURANT = {
  actif:      { label: 'Actif',       couleur: 'bg-green-100 text-green-800' },
  suspendu:   { label: 'Suspendu',    couleur: 'bg-red-100 text-red-800' },
  en_attente: { label: 'En attente',  couleur: 'bg-yellow-100 text-yellow-800' },
}

// ------------------------------------------------------------
// Modes de paiement
// ------------------------------------------------------------
export const MODES_PAIEMENT = {
  cash:         { label: 'Espèces',      icone: '💵' },
  mobile_money: { label: 'Mobile Money', icone: '📱' },
}

// ------------------------------------------------------------
// Types de commande
// ------------------------------------------------------------
export const TYPES_COMMANDE = {
  livraison: { label: 'Livraison à domicile', icone: '🛵' },
  retrait:   { label: 'Retrait en boutique',  icone: '🏪' },
}

// ------------------------------------------------------------
// Quartiers de Brazzaville
// Source : arrondissements et quartiers connus de la ville
// ------------------------------------------------------------
export const QUARTIERS_BRAZZAVILLE = [
  // Arrondissement 1 — Makélékélé
  'Makélékélé',
  'Bacongo',
  'Nganga-Lingolo',
  // Arrondissement 2 — Makélékélé
  'Moungali',
  'Ouenzé',
  // Arrondissement 3 — Poto-Poto
  'Poto-Poto',
  'Chaminade',
  'Plateau des 15 ans',
  // Arrondissement 4 — Moungali
  'Talangaï',
  'Mikalou',
  // Arrondissement 5 — Ouenzé
  'Mfilou',
  'Nkombo',
  // Arrondissement 6 — Talangaï
  'Djiri',
  'Madibou',
  // Zone Centre-ville
  'Centre-ville',
  'La Glacière',
  // Autres
  'Kinsoundi',
  'Bifouiti',
]

// ------------------------------------------------------------
// Coordonnées approximatives du centre de chaque quartier — utilisées
// UNIQUEMENT en secours quand la géolocalisation GPS n'arrive pas à
// identifier le quartier via OpenStreetMap (voir Checkout.jsx,
// localiserAdresse). Plusieurs quartiers de Brazzaville ne sont pas
// cartographiés comme zones distinctes sur OpenStreetMap — vérifié le
// 14/09/2026 en interrogeant Nominatim pour chacun des 18 quartiers :
// Chaminade, Centre-ville, La Glacière, Nganga-Lingolo, Mikalou et
// Bifouiti retombent systématiquement sur le nom d'un quartier voisin.
// Dans ce cas, on calcule nous-mêmes le quartier le plus proche de la
// position GPS réelle du client, plutôt que de dépendre uniquement du
// service externe.
//
// Kinsoundi est volontairement ABSENT : OpenStreetMap ne connaît qu'un
// hameau homonyme situé dans le Pool, à 70km de Brazzaville — une
// coordonnée aussi peu fiable serait pire qu'aucune (ça orienterait
// vers un mauvais endroit sans que personne ne s'en rende compte). Le
// client à Kinsoundi doit sélectionner son quartier manuellement tant
// qu'on n'a pas une coordonnée vérifiée sur place.
export const QUARTIER_CENTRES = {
  'Makélékélé':         { lat: -4.2915008, lng: 15.2338680 },
  'Bacongo':            { lat: -4.2935218, lng: 15.2620062 },
  'Nganga-Lingolo':     { lat: -4.2712506, lng: 15.1435350 },
  'Moungali':           { lat: -4.2433802, lng: 15.2669867 },
  'Ouenzé':             { lat: -4.2436991, lng: 15.2840585 },
  'Poto-Poto':          { lat: -4.2726398, lng: 15.2775717 },
  'Chaminade':          { lat: -4.2687523, lng: 15.2712415 },
  'Plateau des 15 ans': { lat: -4.2594572, lng: 15.2627400 },
  'Talangaï':           { lat: -4.2223134, lng: 15.2953989 },
  'Mikalou':            { lat: -4.2039400, lng: 15.2682363 },
  'Mfilou':             { lat: -4.2177160, lng: 15.2188006 },
  'Nkombo':             { lat: -4.1918608, lng: 15.2467040 },
  'Djiri':              { lat: -4.1604818, lng: 15.2742446 },
  'Madibou':            { lat: -4.3120598, lng: 15.1837685 },
  'Centre-ville':       { lat: -4.2749795, lng: 15.2648018 },
  'La Glacière':        { lat: -4.2927714, lng: 15.2696026 },
  'Bifouiti':           { lat: -4.3011866, lng: 15.2284879 },
}

// ------------------------------------------------------------
// Configuration tarifaire (utilisée si pas de .env)
// ------------------------------------------------------------
export const TARIFS = {
  FRAIS_LIVRAISON_BASE: Number(import.meta.env.VITE_FRAIS_LIVRAISON_BASE) || 1000, // FCFA
  COMMISSION_DEFAUT:    10, // %
  COMMANDE_MINIMUM:     1500, // FCFA
}

// ------------------------------------------------------------
// Opérateurs Mobile Money — préfixes réels (Congo-Brazzaville)
// ------------------------------------------------------------
export const PREFIXE_OPERATEUR = { MTN: '06', Airtel: '05' }

// ------------------------------------------------------------
// Numéro WhatsApp support (format international sans +)
// ------------------------------------------------------------
export const WHATSAPP_SUPPORT = import.meta.env.VITE_WHATSAPP_SUPPORT || '242066000001'

// ------------------------------------------------------------
// Types de véhicule livreur (création admin + profil livreur)
// ------------------------------------------------------------
export const VEHICULES_LIVREUR = ['moto', 'vélo', 'voiture', 'à pied']

// ------------------------------------------------------------
// Villes du Congo couvertes par Zandofood
// ------------------------------------------------------------
export const VILLES_CONGO = [
  { nom: 'Brazzaville',  emoji: '🏙️' },
  { nom: 'Pointe-Noire', emoji: '🌊' },
  { nom: 'Dolisie',      emoji: '🌿' },
  { nom: 'Nkayi',        emoji: '🌱' },
  { nom: 'Impfondo',     emoji: '🌳' },
  { nom: 'Ouesso',       emoji: '🌿' },
  { nom: 'Madingou',     emoji: '🌾' },
  { nom: 'Sibiti',       emoji: '🏔️' },
  { nom: 'Gamboma',      emoji: '🌾' },
  { nom: 'Owando',       emoji: '🌿' },
]
