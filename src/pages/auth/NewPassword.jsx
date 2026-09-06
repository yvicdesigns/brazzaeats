import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Lock, Eye, EyeOff, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { reinitialiserMotDePasse } from '@/services/authService'

// ── Critère de mot de passe avec coche live ─────────────────
function Critere({ valide, children }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${valide ? 'text-green-600' : 'text-gray-400'}`}>
      <Check className={`w-3.5 h-3.5 shrink-0 ${valide ? 'opacity-100' : 'opacity-30'}`} />
      {children}
    </li>
  )
}

// ══════════════════════════════════════════════════════════
// Page Nouveau mot de passe
// ══════════════════════════════════════════════════════════
export default function NewPassword() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const telephone  = state?.telephone ?? null
  const resetToken = state?.resetToken ?? null

  const [motDePasse,   setMotDePasse]   = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [mdpVisible,   setMdpVisible]   = useState(false)
  const [envoi,        setEnvoi]        = useState(false)

  useEffect(() => {
    if (!telephone || !resetToken) navigate('/mot-de-passe-oublie', { replace: true })
  }, [telephone, resetToken, navigate])

  if (!telephone || !resetToken) return null

  const critereLongueur   = motDePasse.length >= 8
  const critereMajChiffre = /[A-Z]/.test(motDePasse) && /[0-9]/.test(motDePasse)
  const motDePasseValide  = critereLongueur && critereMajChiffre
  const correspondent     = motDePasse.length > 0 && motDePasse === confirmation

  async function handleSubmit(e) {
    e.preventDefault()
    if (!motDePasseValide) { toast.error('Le mot de passe ne respecte pas les critères'); return }
    if (!correspondent) { toast.error('Les mots de passe ne correspondent pas'); return }

    setEnvoi(true)
    const { error } = await reinitialiserMotDePasse(telephone, resetToken, motDePasse)
    setEnvoi(false)

    if (error) { toast.error(error); return }
    navigate('/mot-de-passe-modifie', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-start justify-start px-6 pt-12 pb-8">
        <Link to="/login" aria-label="Retour" className="p-2 -ml-2 mb-6 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nouveau mot de passe</h2>
          <p className="text-sm text-gray-500 mb-6">
            Créez un mot de passe fort pour sécuriser votre compte.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={mdpVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Saisissez le nouveau mot de passe"
                  value={motDePasse}
                  onChange={e => setMotDePasse(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl pl-9 pr-10 py-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  type="button"
                  onClick={() => setMdpVisible(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={mdpVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Répétez le mot de passe"
                  value={confirmation}
                  onChange={e => setConfirmation(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              {confirmation.length > 0 && !correspondent && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <ul className="space-y-1 pt-1">
              <Critere valide={critereLongueur}>Au moins 8 caractères</Critere>
              <Critere valide={critereMajChiffre}>Une majuscule et un chiffre</Critere>
            </ul>

            <button
              type="submit"
              disabled={envoi || !motDePasseValide || !correspondent}
              className="w-full bg-brand-500 text-white rounded-xl py-3.5 font-bold text-sm mt-2
                         hover:bg-brand-600 transition-colors disabled:opacity-60 min-h-[52px]"
            >
              {envoi ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
