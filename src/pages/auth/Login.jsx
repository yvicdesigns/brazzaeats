import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, AtSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth, useAuthStore } from '@/hooks/useAuth'

// ── Redirection par rôle ──────────────────────────────────
const REDIRECT_PAR_ROLE = {
  client:     '/',
  restaurant: '/restaurant/dashboard',
  livreur:    '/livreur/dashboard',
  admin:      '/admin/dashboard',
}

// ══════════════════════════════════════════════════════════
// Page Login
// ══════════════════════════════════════════════════════════
export default function Login() {
  const navigate = useNavigate()
  const { login, resetPassword, user, role, loading: authLoading } = useAuth()

  const [identifier,    setIdentifier]    = useState('')
  const [password,      setPassword]      = useState('')
  const [mdpVisible,    setMdpVisible]    = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [resetEnCours,  setResetEnCours]  = useState(false)
  const [resetId,       setResetId]       = useState('')

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!authLoading && user) {
      navigate(REDIRECT_PAR_ROLE[role ?? 'client'] ?? '/', { replace: true })
    }
  }, [user, role, authLoading, navigate])

  // ── Connexion ──────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!identifier.trim() || !password) return

    setSubmitting(true)
    try {
      // Timeout 15s pour éviter un spinner infini si Supabase ne répond pas
      const loginPromise = login(identifier.trim(), password)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé, réessayez')), 15000)
      )
      const { error } = await Promise.race([loginPromise, timeoutPromise])

      if (error) {
        const msg = error.message?.includes('Invalid login credentials')
          ? 'Identifiant ou mot de passe incorrect'
          : error.message?.includes('Email not confirmed')
            ? 'Compte non confirmé — vérifiez vos emails'
            : error.message ?? 'Erreur de connexion'
        toast.error(msg)
        return
      }

      // Attendre que le profil soit chargé (max 2s)
      let role = useAuthStore.getState().role
      for (let i = 0; i < 4 && !role; i++) {
        await new Promise(r => setTimeout(r, 500))
        role = useAuthStore.getState().role
      }
      navigate(REDIRECT_PAR_ROLE[role ?? 'client'] ?? '/', { replace: true })
    } catch (err) {
      toast.error(err.message ?? 'Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Réinitialisation mot de passe ──────────────────────
  async function handleReset(e) {
    e.preventDefault()
    const id = resetId.trim()
    if (!id) { toast.error('Entrez votre identifiant'); return }

    // Seule la réinitialisation par email est supportée
    if (!id.includes('@')) {
      toast.error('Entrez votre email pour réinitialiser le mot de passe')
      return
    }

    const { error } = await resetPassword(id)
    if (error) { toast.error('Erreur : ' + error.message); return }
    toast.success('Email de réinitialisation envoyé !')
    setResetEnCours(false)
    setResetId('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center
                          mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Zandofood</h1>
          <p className="text-sm text-gray-500 mt-1">Commandez à Brazzaville</p>
        </div>

        <div className="w-full max-w-sm">

          {!resetEnCours ? (
            /* ── Mode connexion ── */
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Connexion</h2>

              {/* Identifiant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone, username ou email
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="+242… · monusername · email@…"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 text-sm
                               focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={mdpVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl pl-9 pr-10 py-3 text-sm
                               focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button
                    type="button"
                    onClick={() => setMdpVisible(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                               hover:text-gray-600 transition-colors"
                    aria-label={mdpVisible ? 'Masquer' : 'Afficher'}
                  >
                    {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mot de passe oublié */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setResetEnCours(true)}
                  className="text-xs text-brand-500 hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Bouton connexion */}
              <button
                type="submit"
                disabled={submitting || !identifier.trim() || !password}
                className="w-full bg-brand-500 text-white rounded-xl py-3.5 font-bold text-sm
                           hover:bg-brand-600 transition-colors disabled:opacity-60
                           flex items-center justify-center gap-2 min-h-[52px]"
              >
                {submitting && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          ) : (
            /* ── Mode réinitialisation ── */
            <form onSubmit={handleReset} className="space-y-4">
              <button
                type="button"
                onClick={() => setResetEnCours(false)}
                className="text-xs text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
              >
                ← Retour à la connexion
              </button>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Mot de passe oublié</h2>
              <p className="text-sm text-gray-500 mb-4">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={resetId}
                  onChange={e => setResetId(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-brand-500 text-white rounded-xl py-3.5 font-bold text-sm
                           hover:bg-brand-600 transition-colors min-h-[52px]"
              >
                Envoyer le lien
              </button>
            </form>
          )}

          {/* Lien inscription */}
          {!resetEnCours && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-brand-500 font-semibold hover:underline">
                S'inscrire
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
