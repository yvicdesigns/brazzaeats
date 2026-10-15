import { create } from 'zustand'
import { supabase } from '@/supabase/client'
import { avecDelaiMax } from '@/utils/avecDelaiMax'

// ------------------------------------------------------------
// Store Zustand — état d'authentification global (singleton)
// Partagé entre tous les composants sans Provider React
// ------------------------------------------------------------
// ── Génère un email interne à partir d'un numéro de téléphone ─
function phoneToFakeEmail(telephone) {
  const digits = telephone.replace(/[^0-9]/g, '')
  return `p${digits}@brazzaeats.local`
}

// ── Distingue une session réellement invalide/expirée d'un simple souci
// réseau — les deux se présentent comme une erreur sur _fetchProfile mais
// ne doivent pas être traités pareil (voir _fetchProfile ci-dessous).
function estErreurSessionInvalide(err) {
  const msg = (err?.message || '').toLowerCase()
  return err?.status === 401
    || err?.code === 'PGRST301'
    || msg.includes('jwt')
    || msg.includes('refresh token')
    || msg.includes('token is expired')
}

const useAuthStore = create((set, get) => ({
  // ── État ────────────────────────────────────────────────
  session:  null,   // Session Supabase brute
  user:     null,   // auth.users (id, email…)
  profile:  null,   // Table profiles (nom, role, telephone…)
  role:     null,   // Raccourci : profile.role
  loading:  true,   // true pendant la vérification initiale
  error:    null,
  // true si le dernier chargement du profil a échoué pour une raison autre
  // qu'une session invalide (souci réseau probable) — distingue ce cas d'un
  // vrai rôle non autorisé pour éviter d'afficher "Accès refusé" à tort.
  profileError: false,

  // ── Résout un identifiant (email | téléphone | username) vers un email Supabase ─
  _resolveIdentifier: async (identifier) => {
    const s = identifier.trim()

    // Email classique
    if (s.includes('@')) return s

    // Numéro de téléphone (+242… ou 06…)
    if (/^[+\d][\d\s\-()]{5,}$/.test(s)) {
      return phoneToFakeEmail(s)
    }

    // Username → chercher le téléphone dans profiles (insensible à la casse)
    const { data, error } = await supabase
      .from('profiles')
      .select('telephone')
      .ilike('username', s)
      .maybeSingle()

    if (error) console.error('[Auth] Erreur lookup username :', error.message)
    if (data?.telephone) return phoneToFakeEmail(data.telephone)

    console.warn('[Auth] Username introuvable :', s)
    // Dernier recours : retourner tel quel
    return s
  },

  // ── Chargement du profil depuis la table profiles ───────
  _fetchProfile: async (userId) => {
    // Retry jusqu'à 3 fois (race condition à l'inscription)
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 600))
      try {
        const { data, error } = await avecDelaiMax(
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
        )

        if (error) {
          console.error('[useAuth] Erreur profil :', error.message)
          if (estErreurSessionInvalide(error)) {
            // La session est réellement morte côté serveur (jeton expiré/
            // révoqué) — on nettoie tout pour renvoyer vers l'écran de
            // connexion plutôt que vers "Accès refusé", qui donnerait à
            // tort l'impression d'un problème de permissions.
            await supabase.auth.signOut().catch(() => {})
            set({ session: null, user: null, profile: null, role: null, profileError: false })
            return
          }
          // Erreur probablement réseau/transitoire (ex. juste après le
          // lancement de l'app) — on retente au lieu d'abandonner tout de
          // suite, comme pour le cas "pas encore de ligne" ci-dessous.
          continue
        }
        if (data) { set({ profile: data, role: data.role, profileError: false }); return }
      } catch (err) {
        console.error('[useAuth] Erreur profil :', err.message)
        continue
      }
    }
    // Toutes les tentatives ont échoué sans qu'il s'agisse d'une session
    // invalide (souci réseau probable, ex. juste après le lancement de
    // l'app) — profileError permet à PrivateRoute de proposer un nouvel
    // essai plutôt que de bloquer définitivement sur "Accès refusé".
    set({ profile: null, role: null, profileError: true })
  },

  // ── Connexion : email, téléphone ou username ────────────
  login: async (identifier, password) => {
    set({ error: null })
    try {
      const email = await get()._resolveIdentifier(identifier)
      console.log('[Auth] Tentative connexion avec email résolu :', email)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('[Auth] Erreur Supabase :', error.message, error.status)
        throw error
      }
      console.log('[Auth] Connexion réussie, userId :', data.user?.id)
      return { data, error: null }
    } catch (err) {
      set({ error: err.message })
      return { data: null, error: err }
    }
  },

  // ── Inscription + création du profil ────────────────────
  register: async ({ nom, telephone, username, emailContact, password, role = 'client' }) => {
    set({ error: null })
    try {
      // Email interne dérivé du numéro de téléphone (utilisé par Supabase Auth,
      // distinct de l'email de contact optionnel saisi par l'utilisateur)
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
          {
            id: userId, nom, telephone, role,
            username: username?.trim() || null,
            email:    emailContact?.trim() || null,
          },
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
    set({ session: null, user: null, profile: null, role: null, error: null, profileError: false })
  },
  // Réinitialisation du mot de passe : pas de flux en libre-service — la
  // personne contacte le support par WhatsApp (pages/auth/ForgotPassword),
  // qui réinitialise depuis l'admin (adminService.adminChangePassword).

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
  let session = null, error = null
  try {
    ;({ data: { session }, error } = await avecDelaiMax(supabase.auth.getSession()))
  } catch (err) {
    error = err
  }

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
