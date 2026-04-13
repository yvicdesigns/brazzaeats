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
  'Plateau de 15 ans',
  // Autres
  'Makelekele',
  'Kinsoundi',
  'Bifouiti',
]

// ------------------------------------------------------------
// Configuration tarifaire (utilisée si pas de .env)
// ------------------------------------------------------------
export const TARIFS = {
  FRAIS_LIVRAISON_BASE: Number(import.meta.env.VITE_FRAIS_LIVRAISON_BASE) || 1000, // FCFA
  COMMISSION_DEFAUT:    10, // %
  COMMANDE_MINIMUM:     1500, // FCFA
}

// ------------------------------------------------------------
// Numéro WhatsApp support (format international sans +)
// ------------------------------------------------------------
export const WHATSAPP_SUPPORT = import.meta.env.VITE_WHATSAPP_SUPPORT || '242066000001'

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
