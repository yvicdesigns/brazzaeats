import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/supabase/client'
import { useAuthStore } from '@/hooks/useAuth'

const ACCUEIL_PAR_ROLE = {
  admin:      '/admin/dashboard',
  restaurant: '/restaurant/dashboard',
  livreur:    '/livreur/dashboard',
  client:     '/',
}

// ══════════════════════════════════════════════════════════
// Choisir un nouveau mot de passe — ouverte par le lien
// « Réinitialiser le mot de passe » reçu par e-mail (l'utilisateur
// est déjà connecté par ce lien) ou par un utilisateur connecté.
// ══════════════════════════════════════════════════════════
export default function NouveauMotDePasse() {
  const navigate = useNavigate()
  const { user, role, loading } = useAuthStore()
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  const erreur =
    mdp.length > 0 && mdp.length < 8 ? 'Au moins 8 caractères'
    : confirmation.length > 0 && confirmation !== mdp ? 'Les deux mots de passe ne correspondent pas'
    : null

  async function valider(e) {
    e.preventDefault()
    if (mdp.length < 8 || mdp !== confirmation) return
    setEnvoi(true)
    const { error } = await supabase.auth.updateUser({ password: mdp })
    setEnvoi(false)
    if (error) { toast.error(error.message || 'Impossible de changer le mot de passe'); return }
    toast.success('Mot de passe enregistré')
    navigate(ACCUEIL_PAR_ROLE[role] ?? '/', { replace: true })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">Lien expiré</h1>
          <p className="text-sm text-gray-600 mb-6">Ce lien n'est plus valable. Demandez un nouvel e-mail de réinitialisation.</p>
          <Link to="/login" className="text-brand-500 font-bold">Retour à la connexion</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <form onSubmit={valider} className="w-full max-w-sm flex flex-col gap-4" noValidate>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-sm text-gray-600 mt-1">Compte : <span className="font-semibold text-gray-900">{user.email}</span></p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-gray-700">Nouveau mot de passe</span>
          <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-brand-400">
            <input type={visible ? 'text' : 'password'} autoComplete="new-password" value={mdp}
                   onChange={e => setMdp(e.target.value)}
                   className="flex-1 px-3 py-3 text-base bg-transparent focus:outline-none min-w-0" />
            <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Masquer' : 'Afficher'}
                    className="w-11 h-11 flex items-center justify-center text-gray-500">
              {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-gray-700">Confirmer</span>
          <input type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation}
                 onChange={e => setConfirmation(e.target.value)}
                 className="rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </label>

        {erreur && <p className="text-sm font-semibold text-terracotta-600" role="alert">{erreur}</p>}

        <button type="submit" disabled={envoi || mdp.length < 8 || mdp !== confirmation}
                className="h-[52px] rounded-xl bg-gray-900 text-white font-extrabold flex items-center justify-center gap-2 disabled:opacity-50">
          {envoi && <Loader2 className="w-5 h-5 animate-spin" />}
          Enregistrer le mot de passe
        </button>
      </form>
    </div>
  )
}
