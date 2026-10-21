import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Phone, User, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

// Restaurant vers lequel ce stand pointe — Zandofood utilise The Takeaway
// de Brazza pour cette conférence (voir conversation du 2026-10-21).
const RESTAURANT_ID = 'b844fe1d-5ef6-43ce-b64d-4fa6fc0a52c4'
const VILLE_CLE = 'zandofood-ville'

function motDePasseAleatoire() {
  // Jamais affiché ni saisi par la personne — juste ce qu'exige Supabase Auth.
  // Généré ici plutôt que côté serveur : pas besoin d'une fonction dédiée,
  // l'inscription classique (useAuth.register) fait déjà tout le travail.
  return crypto.randomUUID() + crypto.randomUUID()
}

export default function Stand() {
  const navigate = useNavigate()
  const { register: registerUser, user, loading: authLoading } = useAuth()

  const [nom, setNom] = useState('')
  const [telephoneLocal, setTelephoneLocal] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const telephoneValide = /^\d{9}$/.test(telephoneLocal)
  const pretAEnvoyer = nom.trim().length >= 2 && telephoneValide && !submitting

  // Déjà connecté sur cet appareil (ex. revisite le lien) → direct au menu.
  useEffect(() => {
    if (!authLoading && user) {
      navigate(`/restaurant/${RESTAURANT_ID}`, { replace: true })
    }
  }, [user, authLoading, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    if (!pretAEnvoyer) return

    setSubmitting(true)
    try {
      localStorage.setItem(VILLE_CLE, 'Brazzaville')

      const { error } = await registerUser({
        nom: nom.trim(),
        telephone: `+242${telephoneLocal}`,
        username: null,
        emailContact: null,
        password: motDePasseAleatoire(),
        role: 'client',
      })

      if (error) {
        if (error.message?.includes('already registered')) {
          toast.error('Ce numéro a déjà un compte — connectez-vous normalement.')
          navigate('/login')
          return
        }
        toast.error(error.message ?? 'Une erreur est survenue, réessayez.')
        return
      }

      navigate(`/restaurant/${RESTAURANT_ID}`, { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-12 pb-8">
      <img src="/logo-zando.svg" alt="Zandofood" className="w-56 max-w-[70vw] mb-6" />

      <div className="w-full max-w-sm text-center mb-7">
        <h1 className="font-['Unbounded'] font-extrabold text-xl text-gray-900 leading-snug">
          The Takeaway de Brazza vous souhaite la bienvenue
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          Entrez votre prénom et votre numéro, vous êtes sur le menu en quelques secondes.
        </p>
      </div>

      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Votre prénom</label>
          <div className="flex items-center rounded-xl border border-gray-300 overflow-hidden
                           focus-within:ring-2 focus-within:ring-brand-400">
            <span className="pl-3.5 pr-2 text-gray-400"><User className="w-4.5 h-4.5" /></span>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Josué"
              className="flex-1 py-3 pr-3.5 text-sm outline-none"
              autoComplete="given-name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
          <div className="flex items-center rounded-xl border border-gray-300 overflow-hidden
                           focus-within:ring-2 focus-within:ring-brand-400">
            <span className="pl-3.5 pr-2 flex items-center gap-1.5 text-gray-500 text-sm font-medium shrink-0">
              <Phone className="w-4 h-4" /> +242
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={telephoneLocal}
              onChange={(e) => setTelephoneLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="06 123 4567"
              className="flex-1 py-3 pr-3.5 text-sm outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!pretAEnvoyer}
          className="w-full bg-brand-600 text-white rounded-xl py-3.5 font-bold text-sm
                     hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50
                     flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Un instant…' : 'Voir le menu et commander'}
        </button>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          En continuant, vous acceptez nos{' '}
          <Link to="/conditions-utilisation" className="text-brand-600 underline">conditions d'utilisation</Link>.
          Déjà un compte ? <Link to="/login" className="text-brand-600 font-semibold">Connectez-vous</Link>.
        </p>
      </form>
    </div>
  )
}
