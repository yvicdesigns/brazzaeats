import { supabase } from '@/supabase/client'
import { supabaseAdmin } from '@/supabase/adminClient'

// ============================================================
// ADMIN — requêtes Supabase
// Toutes ces fonctions nécessitent le rôle 'admin' (RLS)
// ============================================================

// ── KPIs globaux ───────────────────────────────────────────

/**
 * Récupère en parallèle les KPIs globaux de la plateforme :
 * - Nombre total de commandes
 * - Revenu total (montants livrées)
 * - Commission totale collectée
 * - Nombre d'utilisateurs par rôle
 */
export async function getAdminStats() {
  try {
    // Bornes temporelles
    const now = new Date()

    const debutJour = new Date(now); debutJour.setHours(0,0,0,0)

    const jourSemaine  = (now.getDay() + 6) % 7
    const debutSemaine = new Date(now); debutSemaine.setDate(now.getDate() - jourSemaine); debutSemaine.setHours(0,0,0,0)
    const debutSemPasse = new Date(debutSemaine); debutSemPasse.setDate(debutSemaine.getDate() - 7)
    const finSemPasse   = new Date(debutSemaine); finSemPasse.setMilliseconds(-1)

    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)

    // 7 derniers jours pour le graphique
    const debut7j = new Date(now); debut7j.setDate(now.getDate() - 6); debut7j.setHours(0,0,0,0)

    const [
      { count: totalCommandes },
      { data: commandesLivrees },
      { count: totalClients },
      { count: totalLivreurs },
      { count: totalRestaurants },
      { count: commandesActives },
      { data: cmdJour },
      { data: cmdSemaine },
      { data: cmdSemPassee },
      { data: cmdMois },
      { data: cmd7j },
    ] = await Promise.all([
      // Totaux all-time
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('montant_total, commission').eq('statut', 'livrée'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'livreur'),
      supabase.from('restaurants').select('id', { count: 'exact', head: true }),

      // Commandes actives en ce moment
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .in('statut', ['en_attente','acceptée','en_préparation','prête','en_livraison']),

      // Aujourd'hui
      supabase.from('orders').select('montant_total, commission')
        .eq('statut', 'livrée').gte('created_at', debutJour.toISOString()),

      // Cette semaine
      supabase.from('orders').select('montant_total, commission')
        .eq('statut', 'livrée').gte('created_at', debutSemaine.toISOString()),

      // Semaine passée (pour comparaison)
      supabase.from('orders').select('montant_total, commission')
        .eq('statut', 'livrée')
        .gte('created_at', debutSemPasse.toISOString())
        .lte('created_at', finSemPasse.toISOString()),

      // Ce mois
      supabase.from('orders').select('montant_total, commission')
        .eq('statut', 'livrée').gte('created_at', debutMois.toISOString()),

      // 7 derniers jours — pour graphique (toutes commandes sauf annulées)
      supabase.from('orders').select('created_at, montant_total, statut, restaurant_id, restaurant:restaurants(nom)')
        .neq('statut', 'annulée').gte('created_at', debut7j.toISOString()),
    ])

    const somme = (arr) => ({
      revenu:     (arr ?? []).reduce((s, o) => s + (o.montant_total ?? 0), 0),
      commission: (arr ?? []).reduce((s, o) => s + (o.commission    ?? 0), 0),
      nb:         (arr ?? []).length,
    })

    const sJour     = somme(cmdJour)
    const sSemaine  = somme(cmdSemaine)
    const sSemPasse = somme(cmdSemPassee)
    const sMois     = somme(cmdMois)

    const tendancePct = sSemPasse.revenu > 0
      ? Math.round(((sSemaine.revenu - sSemPasse.revenu) / sSemPasse.revenu) * 100)
      : null

    // Top restaurants cette semaine
    const parResto = {}
    ;(cmdSemaine ?? []).forEach(o => {
      const id = o.restaurant_id
      if (!id) return
      if (!parResto[id]) parResto[id] = { nom: o.restaurant?.nom ?? id, ca: 0, nb: 0 }
      parResto[id].ca += o.montant_total ?? 0
      parResto[id].nb += 1
    })

    // Récupérer les noms depuis cmd7j si cmdSemaine n'a pas le restaurant
    const topRestaurants = Object.entries(parResto)
      .sort((a, b) => b[1].ca - a[1].ca)
      .slice(0, 3)
      .map(([id, v]) => ({ id, ...v }))

    return {
      data: {
        // All-time
        totalCommandes:   totalCommandes   ?? 0,
        revenuTotal:      somme(commandesLivrees).revenu,
        commissionTotal:  somme(commandesLivrees).commission,
        totalClients:     totalClients     ?? 0,
        totalLivreurs:    totalLivreurs    ?? 0,
        totalRestaurants: totalRestaurants ?? 0,
        // En temps réel
        commandesActives: commandesActives ?? 0,
        // Périodes
        jour:     sJour,
        semaine:  sSemaine,
        mois:     sMois,
        tendancePct,
        // Graphique
        cmd7j: cmd7j ?? [],
        topRestaurants,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Récupère les N dernières commandes toutes plateformes confondues,
 * avec le nom du restaurant et du client.
 */
export async function getRecentOrders(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        statut,
        montant_total,
        frais_livraison,
        commission,
        created_at,
        restaurant:restaurants(nom),
        client:profiles!orders_client_id_fkey(nom)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Récupère toutes les commandes actives (non terminées) de la plateforme.
 */
/**
 * Récupère l'historique paginé de toutes les commandes.
 * @param {{ statut, dateDebut, dateFin, recherche, page, pageSize }} opts
 */
export async function getAllOrders({
  statut    = 'tous',
  dateDebut = null,
  dateFin   = null,
  recherche = '',
  page      = 0,
  pageSize  = 20,
} = {}) {
  try {
    let q = supabase
      .from('orders')
      .select(`
        id,
        statut,
        montant_total,
        frais_livraison,
        commission,
        mode_paiement,
        type,
        created_at,
        restaurant:restaurants(id, nom),
        client:profiles!orders_client_id_fkey(nom, telephone)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (statut !== 'tous') q = q.eq('statut', statut)
    if (dateDebut)         q = q.gte('created_at', new Date(dateDebut).toISOString())
    if (dateFin) {
      const fin = new Date(dateFin)
      fin.setHours(23, 59, 59, 999)
      q = q.lte('created_at', fin.toISOString())
    }

    const { data, error, count } = await q
    if (error) throw error

    // Filtre client-side sur le nom si recherche
    const liste = recherche
      ? (data ?? []).filter(o =>
          (o.restaurant?.nom ?? '').toLowerCase().includes(recherche.toLowerCase()) ||
          (o.client?.nom ?? '').toLowerCase().includes(recherche.toLowerCase())
        )
      : (data ?? [])

    return { data: liste, total: count ?? 0, error: null }
  } catch (err) {
    return { data: [], total: 0, error: err.message }
  }
}

export async function getActiveOrders() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        statut,
        montant_total,
        frais_livraison,
        commission,
        created_at,
        restaurant:restaurants(nom),
        client:profiles!orders_client_id_fkey(nom, telephone),
        livreur:profiles!orders_livreur_id_fkey(nom, telephone)
      `)
      .in('statut', ['en_attente', 'acceptée', 'en_préparation', 'prête', 'en_livraison'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Annule une commande (admin uniquement).
 */
export async function annulerCommande(id) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ statut: 'annulée' })
      .eq('id', id)
      .select('id, statut')
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ── Restaurants ────────────────────────────────────────────

/**
 * Récupère tous les restaurants avec leur propriétaire.
 * Triés : en_attente en premier (à valider), puis par nom.
 */
export async function getAllRestaurants() {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        nom,
        adresse,
        statut,
        note_moyenne,
        commission_rate,
        created_at,
        owner_id,
        owner:profiles!restaurants_owner_id_fkey(nom, telephone)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Met à jour le statut d'un restaurant (actif / suspendu / en_attente).
 */
export async function updateRestaurantStatus(id, statut) {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .update({ statut })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Mise à jour complète d'un restaurant par l'admin (nom, adresse, commission).
 */
export async function adminUpdateRestaurant(id, updates) {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Supprime un restaurant et son compte auth associé.
 * Supprime : restaurant → profil → compte auth (dans cet ordre).
 * @param {string} restaurantId
 * @param {string} ownerId — UUID du propriétaire pour supprimer le compte auth
 */
export async function deleteRestaurant(restaurantId, ownerId) {
  try {
    // 1. Supprimer le restaurant
    const { error: restoError } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurantId)
    if (restoError) throw restoError

    // 2. Supprimer le profil
    await supabase.from('profiles').delete().eq('id', ownerId)

    // 3. Supprimer le compte auth (nécessite service_role)
    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(ownerId)
    }

    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Met à jour le taux de commission d'un restaurant (en %).
 */
export async function updateCommissionRate(id, commissionRate) {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .update({ commission_rate: commissionRate })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Crée un compte restaurant complet :
 *   1. Crée le compte auth (email = phone fake)
 *   2. Upsert le profil avec rôle 'restaurant'
 *   3. Insère le restaurant en statut 'en_attente'
 */
export async function createRestaurant({ nom, adresse, telephone, motDePasse, commissionRate = 10 }) {
  if (!supabaseAdmin) {
    return { data: null, error: 'Clé service_role manquante (VITE_SUPABASE_SERVICE_KEY)' }
  }
  try {
    const email = `p${telephone.replace(/[^0-9]/g, '')}@brazzaeats.local`

    // 1. Créer le compte auth via Admin API — ne change PAS la session admin courante
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password:      motDePasse,
      email_confirm: true,  // pas besoin de vérification email
      user_metadata: { nom, telephone, role: 'restaurant' },
    })
    if (authError) throw authError

    const userId = authData.user?.id
    if (!userId) throw new Error('Impossible de créer le compte')

    // 2. Upsert profil (via supabaseAdmin pour bypasser RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, nom, telephone, role: 'restaurant' }, { onConflict: 'id' })
    if (profileError) throw profileError

    // 3. Créer le restaurant en statut en_attente
    const { data: resto, error: restoError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        owner_id:        userId,
        nom,
        adresse:         adresse || null,
        statut:          'en_attente',
        commission_rate: commissionRate,
      })
      .select()
      .single()
    if (restoError) throw restoError

    return { data: resto, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ── Livreurs ───────────────────────────────────────────────

export async function getAllLivreurs() {
  try {
    const { data, error } = await supabase
      .from('livreurs')
      .select('*, profile:profiles(id, nom, telephone)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

export async function createLivreur({ nom, telephone, motDePasse, vehicule = 'moto', zone = null }) {
  if (!supabaseAdmin) {
    return { data: null, error: 'Clé service_role manquante (VITE_SUPABASE_SERVICE_KEY)' }
  }
  try {
    const email = `p${telephone.replace(/[^0-9]/g, '')}@brazzaeats.local`

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password:      motDePasse,
      email_confirm: true,
      user_metadata: { nom, telephone, role: 'livreur' },
    })
    if (authError) throw authError

    const userId = authData.user?.id
    if (!userId) throw new Error('Impossible de créer le compte')

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, nom, telephone, role: 'livreur' }, { onConflict: 'id' })
    if (profileError) throw profileError

    const { data: livreur, error: livreurError } = await supabaseAdmin
      .from('livreurs')
      .insert({ id: userId, statut: 'en_attente', vehicule, zone })
      .select()
      .single()
    if (livreurError) throw livreurError

    return { data: { ...livreur, profile: { id: userId, nom, telephone } }, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Statistiques individuelles d'un livreur.
 * @param {string} profileId — l'id du profil (= livreur_id dans orders)
 */
export async function getLivreurStats(profileId) {
  try {
    const debut30j = new Date()
    debut30j.setDate(debut30j.getDate() - 29)
    debut30j.setHours(0, 0, 0, 0)

    const [
      { data: livrees },
      { data: annulees },
      { data: cmd30j },
    ] = await Promise.all([
      // Toutes les commandes livrées par ce livreur (all-time)
      supabase
        .from('orders')
        .select('montant_total, frais_livraison, commission, created_at')
        .eq('livreur_id', profileId)
        .eq('statut', 'livrée'),

      // Commandes annulées après attribution à ce livreur
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('livreur_id', profileId)
        .eq('statut', 'annulée'),

      // Livraisons des 30 derniers jours pour le graphique
      supabase
        .from('orders')
        .select('created_at')
        .eq('livreur_id', profileId)
        .eq('statut', 'livrée')
        .gte('created_at', debut30j.toISOString()),
    ])

    const nb           = livrees?.length ?? 0
    const caGenere     = (livrees ?? []).reduce((s, o) => s + (o.montant_total ?? 0) + (o.frais_livraison ?? 0), 0)
    const commissions  = (livrees ?? []).reduce((s, o) => s + (o.commission ?? 0), 0)
    const derniereDate = livrees?.length
      ? livrees.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
      : null

    // Livraisons par jour sur 30j
    const par30j = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i)); d.setHours(0,0,0,0)
      return { date: d, nb: 0 }
    })
    ;(cmd30j ?? []).forEach(c => {
      const dc = new Date(c.created_at); dc.setHours(0,0,0,0)
      const idx = par30j.findIndex(j => j.date.getTime() === dc.getTime())
      if (idx >= 0) par30j[idx].nb++
    })

    return {
      data: { nb, caGenere, commissions, derniereDate, nbAnnulees: annulees ?? 0, par30j },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

export async function updateLivreurStatus(id, statut) {
  try {
    const { data, error } = await supabase
      .from('livreurs')
      .update({ statut })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

export async function deleteLivreur(id) {
  if (!supabaseAdmin) return { error: 'Clé service_role manquante' }
  try {
    await supabaseAdmin.from('livreurs').delete().eq('id', id)
    await supabaseAdmin.from('profiles').delete().eq('id', id)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Change le mot de passe d'un utilisateur (restaurant, livreur, etc.)
 * Nécessite la clé service_role dans VITE_SUPABASE_SERVICE_KEY.
 * @param {string} userId — UUID auth de l'utilisateur
 * @param {string} newPassword — nouveau mot de passe (min 6 chars)
 */
export async function adminChangePassword(userId, newPassword) {
  if (!supabaseAdmin) {
    return { error: 'Clé service_role manquante (VITE_SUPABASE_SERVICE_KEY)' }
  }
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Met à jour le profil (nom, téléphone) du propriétaire d'un restaurant.
 * Si le téléphone change, met aussi à jour l'email auth (faux email).
 * @param {string} ownerId — UUID du propriétaire
 * @param {{ nom, telephone }} updates
 */
export async function adminUpdateOwnerProfile(ownerId, { nom, telephone }) {
  try {
    // 1. Mettre à jour le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ nom, telephone })
      .eq('id', ownerId)
    if (profileError) throw profileError

    // 2. Si téléphone modifié → mettre à jour l'email auth
    if (telephone && supabaseAdmin) {
      const fakeEmail = `p${telephone.replace(/[^0-9]/g, '')}@brazzaeats.local`
      await supabaseAdmin.auth.admin.updateUserById(ownerId, { email: fakeEmail })
      // On ne bloque pas si ça échoue (l'identifiant de connexion reste l'ancien)
    }

    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

// ── Utilisateurs ───────────────────────────────────────────

/**
 * Récupère tous les utilisateurs, avec filtre optionnel par rôle.
 * @param {string|null} role — 'client' | 'livreur' | 'restaurant' | null (tous)
 */
export async function getAllUsers(role = null) {
  try {
    let query = supabase
      .from('profiles')
      .select('id, nom, telephone, role, actif, solde, created_at')
      .order('created_at', { ascending: false })

    if (role) query = query.eq('role', role)

    const { data, error } = await query
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Active ou désactive un compte utilisateur.
 * Agit sur profiles.actif. Côté RLS, un profil inactif
 * ne peut plus se connecter aux ressources protégées.
 */
export async function toggleUserActive(id, actif) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ actif })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Crédite le solde d'un client via la fonction RPC sécurisée.
 */
export async function crediterSoldeClient(clientId, montant) {
  try {
    const { error } = await supabase.rpc('crediter_solde', {
      p_client_id: clientId,
      p_montant:   montant,
    })
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Récupère le solde actuel d'un client.
 */
export async function getSoldeClient(clientId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('solde, nom')
      .eq('id', clientId)
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ── Avis / Reviews ─────────────────────────────────────────

/**
 * Récupère tous les avis avec restaurant et client.
 */
export async function getAllReviews({ masque } = {}) {
  try {
    let q = supabase
      .from('reviews')
      .select('*, restaurant:restaurants(nom), client:profiles!client_id(nom)')
      .order('created_at', { ascending: false })
    if (masque !== undefined) q = q.eq('masque', masque)
    const { data, error } = await q
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Masque ou démasque un avis.
 */
export async function toggleReviewMasque(id, masque) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({ masque })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ── Versements restaurants ─────────────────────────────────

/**
 * Récupère tous les versements, avec le nom du restaurant.
 * @param {{ statut?: 'en_attente'|'versé' }} options
 */
export async function getVersements({ statut } = {}) {
  try {
    let q = supabase
      .from('versements')
      .select('*, restaurant:restaurants(id, nom)')
      .order('periode_fin', { ascending: false })
    if (statut) q = q.eq('statut', statut)
    const { data, error } = await q
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Récupère les versements d'un restaurant spécifique.
 */
export async function getVersementsRestaurant(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('versements')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('periode_fin', { ascending: false })
      .limit(10)
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Génère automatiquement les versements de la semaine précédente
 * pour tous les restaurants ayant des commandes livrées.
 * Ignore les restaurants déjà traités pour cette période.
 */
export async function genererVersementsSemaine() {
  try {
    // Calculer lundi et dimanche de la semaine passée
    const now = new Date()
    const jourSemaine = (now.getDay() + 6) % 7 // 0=lundi
    const lundiCourant = new Date(now)
    lundiCourant.setDate(now.getDate() - jourSemaine)
    lundiCourant.setHours(0, 0, 0, 0)

    const lundiPasse = new Date(lundiCourant)
    lundiPasse.setDate(lundiCourant.getDate() - 7)
    const dimanchePasse = new Date(lundiCourant)
    dimanchePasse.setDate(lundiCourant.getDate() - 1)
    dimanchePasse.setHours(23, 59, 59, 999)

    const periodeDebut = lundiPasse.toISOString().split('T')[0]
    const periodeFin   = dimanchePasse.toISOString().split('T')[0]

    // Récupérer toutes les commandes livrées de la semaine passée
    const { data: commandes, error: cmdErr } = await supabase
      .from('orders')
      .select('restaurant_id, montant_total, commission')
      .eq('statut', 'livrée')
      .gte('created_at', lundiPasse.toISOString())
      .lte('created_at', dimanchePasse.toISOString())

    if (cmdErr) throw cmdErr
    if (!commandes?.length) return { data: 0, error: null }

    // Agréger par restaurant
    const parRestaurant = {}
    commandes.forEach(o => {
      if (!parRestaurant[o.restaurant_id]) {
        parRestaurant[o.restaurant_id] = { ca_brut: 0, commission: 0, nb_commandes: 0 }
      }
      parRestaurant[o.restaurant_id].ca_brut      += o.montant_total ?? 0
      parRestaurant[o.restaurant_id].commission   += o.commission ?? 0
      parRestaurant[o.restaurant_id].nb_commandes += 1
    })

    // Vérifier quels restaurants ont déjà un versement pour cette période
    const { data: existants } = await supabase
      .from('versements')
      .select('restaurant_id')
      .eq('periode_debut', periodeDebut)
      .eq('periode_fin', periodeFin)

    const dejaCrees = new Set((existants ?? []).map(v => v.restaurant_id))

    // Insérer les nouveaux versements
    const lignes = Object.entries(parRestaurant)
      .filter(([id]) => !dejaCrees.has(id))
      .map(([restaurant_id, stats]) => ({
        restaurant_id,
        periode_debut: periodeDebut,
        periode_fin:   periodeFin,
        ca_brut:       Math.round(stats.ca_brut),
        commission:    Math.round(stats.commission),
        montant_net:   Math.round(stats.ca_brut - stats.commission),
        nb_commandes:  stats.nb_commandes,
        statut:        'en_attente',
      }))

    if (!lignes.length) return { data: 0, error: null }

    const { error: insErr } = await supabase.from('versements').insert(lignes)
    if (insErr) throw insErr

    return { data: lignes.length, error: null }
  } catch (err) {
    return { data: 0, error: err.message }
  }
}

/**
 * Marque un versement comme "versé".
 */
export async function marquerVerse(id) {
  try {
    const { data, error } = await supabase
      .from('versements')
      .update({ statut: 'versé', date_versement: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ── Paramètres plateforme ──────────────────────────────────

/**
 * Récupère les paramètres globaux de la plateforme.
 * La table platform_settings contient une seule ligne (id = 1).
 *
 * Prérequis schéma :
 *   CREATE TABLE platform_settings (
 *     id               INTEGER PRIMARY KEY DEFAULT 1,
 *     nom_plateforme   TEXT    DEFAULT 'Zandofood',
 *     contact_support  TEXT    DEFAULT '',
 *     commission_defaut NUMERIC DEFAULT 10,
 *     frais_livraison_base INTEGER DEFAULT 1000,
 *     updated_at       TIMESTAMPTZ DEFAULT now()
 *   );
 *   INSERT INTO platform_settings DEFAULT VALUES;
 */
// ── Codes promo plateforme ─────────────────────────────────

export async function getPromoCodes() {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

export async function createPromoCode(donnees) {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .insert(donnees)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

export async function togglePromoCodeActif(id, actif) {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .update({ actif })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

export async function deletePromoCode(id) {
  try {
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

export async function getPlatformSettings() {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Met à jour les paramètres globaux de la plateforme.
 * @param {{ nom_plateforme?, contact_support?, commission_defaut?, frais_livraison_base? }} updates
 */
export async function updatePlatformSettings(updates) {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}
