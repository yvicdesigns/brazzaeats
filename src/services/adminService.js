import { supabase } from '@/supabase/client'

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
    const [
      { count: totalCommandes },
      { data: commandesLivrees },
      { count: totalClients },
      { count: totalLivreurs },
      { count: totalRestaurants },
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true }),

      supabase
        .from('orders')
        .select('montant_total, frais_livraison, commission')
        .eq('statut', 'livrée'),

      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'client'),

      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'livreur'),

      supabase
        .from('restaurants')
        .select('id', { count: 'exact', head: true }),
    ])

    const revenuTotal     = (commandesLivrees ?? []).reduce(
      (s, o) => s + (o.montant_total ?? 0) + (o.frais_livraison ?? 0), 0
    )
    const commissionTotal = (commandesLivrees ?? []).reduce(
      (s, o) => s + (o.commission ?? 0), 0
    )

    return {
      data: {
        totalCommandes:   totalCommandes   ?? 0,
        revenuTotal,
        commissionTotal,
        totalClients:     totalClients     ?? 0,
        totalLivreurs:    totalLivreurs    ?? 0,
        totalRestaurants: totalRestaurants ?? 0,
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
  try {
    const email = `p${telephone.replace(/[^0-9]/g, '')}@brazzaeats.local`

    // 1. Créer le compte auth via Admin API (service role requis côté Supabase Edge Function)
    // Fallback : signUp classique (email non confirmé, statut en_attente protège quand même)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom, telephone, role: 'restaurant' } },
    })
    if (authError) throw authError

    const userId = authData.user?.id
    if (!userId) throw new Error('Impossible de créer le compte')

    // 2. Upsert profil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, nom, telephone, role: 'restaurant' }, { onConflict: 'id' })
    if (profileError) throw profileError

    // 3. Créer le restaurant en statut en_attente
    const { data: resto, error: restoError } = await supabase
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

// ── Utilisateurs ───────────────────────────────────────────

/**
 * Récupère tous les utilisateurs, avec filtre optionnel par rôle.
 * @param {string|null} role — 'client' | 'livreur' | 'restaurant' | null (tous)
 */
export async function getAllUsers(role = null) {
  try {
    let query = supabase
      .from('profiles')
      .select('id, nom, telephone, role, actif, created_at')
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

// ── Paramètres plateforme ──────────────────────────────────

/**
 * Récupère les paramètres globaux de la plateforme.
 * La table platform_settings contient une seule ligne (id = 1).
 *
 * Prérequis schéma :
 *   CREATE TABLE platform_settings (
 *     id               INTEGER PRIMARY KEY DEFAULT 1,
 *     nom_plateforme   TEXT    DEFAULT 'BrazzaEats',
 *     contact_support  TEXT    DEFAULT '',
 *     commission_defaut NUMERIC DEFAULT 10,
 *     frais_livraison_base INTEGER DEFAULT 1000,
 *     updated_at       TIMESTAMPTZ DEFAULT now()
 *   );
 *   INSERT INTO platform_settings DEFAULT VALUES;
 */
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
