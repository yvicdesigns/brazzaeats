import { create } from 'zustand'
import { supabase } from '@/supabase/client'

// ------------------------------------------------------------
// Store Zustand — état d'authentification global (singleton)
// Partagé entre tous les composants sans Provider React
// ------------------------------------------------------------
// ── Génère un email interne à partir d'un numéro de téléphone ─
function phoneToFakeEmail(telephone) {
  const digits = telephone.replace(/[^0-9]/g, '')
  return `p${digits}@brazzaeats.local`
}

const useAuthStore = create((set, get) => ({
  // ── État ────────────────────────────────────────────────
  session:  null,   // Session Supabase brute
  user:     null,   // auth.users (id, email…)
  profile:  null,   // Table profiles (nom, role, telephone…)
  role:     null,   // Raccourci : profile.role
  loading:  true,   // true pendant la vérification initiale
  error:    null,

  // ── Résout un identifiant (email | téléphone | username) vers un email Supabase ─
  _resolveIdentifier: async (identifier) => {
    const s = identifier.trim()

    // Email classique
    if (s.includes('@')) return s

    // Numéro de téléphone (+242… ou 06…)
    if (/^[+\d][\d\s\-()]{5,}$/.test(s)) {
      return phoneToFakeEmail(s)
    }

    // Username → chercher le téléphone dans profiles
    const { data } = await supabase
      .from('profiles')
      .select('telephone')
      .eq('username', s)
      .maybeSingle()

    if (data?.telephone) return phoneToFakeEmail(data.telephone)

    // Dernier recours : retourner tel quel
    return s
  },

  // ── Chargement du profil depuis la table profiles ───────
  _fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      set({ profile: data, role: data.role })
    } catch (err) {
      console.error('[useAuth] Erreur chargement profil :', err.message)
      set({ profile: null, role: null })
    }
  },

  // ── Connexion : email, téléphone ou username ────────────
  login: async (identifier, password) => {
    set({ error: null })
    try {
      const email = await get()._resolveIdentifier(identifier)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      set({ error: err.message })
      return { data: null, error: err }
    }
  },

  // ── Inscription + création du profil ────────────────────
  register: async ({ nom, telephone, username, password, role = 'client' }) => {
    set({ error: null })
    try {
      // Email interne dérivé du numéro de téléphone
      const email = phoneToFakeEmail(telephone)

      // 1. Créer le compte dans auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nom, telephone, role } },
      })
      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error('Identifiant utilisateur introuvable après inscription.')

      // 2. Créer la ligne dans la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, nom, telephone, username: username?.trim() || null, role },
          { onConflict: 'id' }
        )
      if (profileError) throw profileError

      return { data: authData, error: null }
    } catch (err) {
      set({ error: err.message })
      return { data: null, error: err }
    }
  },

  // ── Déconnexion ──────────────────────────────────────────
  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, role: null, error: null })
  },

  // ── Réinitialisation mot de passe ────────────────────────
  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  },

  // ── Mise à jour profil ───────────────────────────────────
  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return { error: new Error('Non authentifié') }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      set({ profile: data, role: data.role })
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  },
}))

// ------------------------------------------------------------
// Initialisation Auth — singleton avec nettoyage HMR
// getSession() pour la session existante + onAuthStateChange
// pour les événements suivants (login, logout, token refresh).
// import.meta.hot.dispose supprime l'ancienne souscription
// avant chaque rechargement HMR pour éviter les doublons.
// ------------------------------------------------------------

let _subscription = null

async function bootstrapAuth() {
  // Nettoyage de l'éventuelle souscription précédente (HMR)
  if (_subscription) {
    _subscription.data.subscription.unsubscribe()
    _subscription = null
  }

  // 1. Charger la session existante depuis localStorage
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    useAuthStore.setState({ loading: false })
  } else {
    useAuthStore.setState({ session, user: session.user })
    await useAuthStore.getState()._fetchProfile(session.user.id)
    useAuthStore.setState({ loading: false })
  }

  // 2. Écouter les changements suivants (login, logout, refresh…)
  _subscription = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION') return  // déjà géré ci-dessus

    if (session) {
      useAuthStore.setState({ session, user: session.user, loading: true })
      await useAuthStore.getState()._fetchProfile(session.user.id)
      useAuthStore.setState({ loading: false })
    } else {
      useAuthStore.setState({
        session: null,
        user:    null,
        profile: null,
        role:    null,
        loading: false,
      })
    }
  })
}

bootstrapAuth()

// Nettoyage Vite HMR : désabonner avant que le module soit remplacé
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (_subscription) {
      _subscription.data.subscription.unsubscribe()
      _subscription = null
    }
  })
}

// ------------------------------------------------------------
// Hook public : useAuth()
// Simple lecture du store — l'initialisation est déjà faite.
// ------------------------------------------------------------
export function useAuth() {
  return useAuthStore()
}

// Export du store nu pour les services qui en ont besoin hors composant
export { useAuthStore }
