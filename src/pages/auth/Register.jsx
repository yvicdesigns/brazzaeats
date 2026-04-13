import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User, Phone, AtSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

// ── Schéma de validation ───────────────────────────────────
const schema = z.object({
  nom: z.string().min(2, 'Au moins 2 caractères').max(80),
  telephone: z
    .string()
    .regex(/^\+242[0-9]{9}$/, 'Format requis : +242XXXXXXXXX (9 chiffres après +242)'),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_.]{3,30}$/, 'Entre 3 et 30 caractères (lettres, chiffres, _ ou .)')
    .or(z.literal(''))
    .optional(),
  password: z.string().min(6, 'Au moins 6 caractères').max(72, 'Trop long'),
  confirmation: z.string(),
}).refine(d => d.password === d.confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmation'],
})

// ══════════════════════════════════════════════════════════
// Page Register
// ══════════════════════════════════════════════════════════
export default function Register() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()

  const [mdpVisible,  setMdpVisible]  = useState(false)
  const [confVisible, setConfVisible] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  // ── Inscription ────────────────────────────────────────
  async function onSubmit({ nom, telephone, username, password }) {
    const { error } = await registerUser({
      nom,
      telephone,
      username: username?.trim() || null,
      password,
      role: 'client',
    })

    if (error) {
      const msg = error.message?.includes('already registered')
        ? 'Ce numéro de téléphone est déjà utilisé'
        : error.message ?? "Erreur lors de l'inscription"
      toast.error(msg)
      return
    }

    toast.success('Compte créé ! Bienvenue sur Zandofood 🎉')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">

        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center
                          mx-auto mb-3 shadow-lg">
            <span className="text-2xl">🍽️</span>
          </div>
          <h1 className="text-xl font-black text-gray-900">Zandofood</h1>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Créer un compte</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Jean Mabiala"
                  {...register('nom')}
                  className={`w-full border rounded-xl pl-9 pr-4 py-3 text-sm
                              focus:outline-none focus:ring-2 focus:ring-brand-400
                              ${errors.nom ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom.message}</p>}
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+242066000000"
                  {...register('telephone')}
                  className={`w-full border rounded-xl pl-9 pr-4 py-3 text-sm
                              focus:outline-none focus:ring-2 focus:ring-brand-400
                              ${errors.telephone ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.telephone && (
                <p className="text-xs text-red-500 mt-1">{errors.telephone.message}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Ce numéro sera votre identifiant de connexion
              </p>
            </div>

            {/* Username (optionnel) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="jean_mabiala"
                  {...register('username')}
                  className={`w-full border rounded-xl pl-9 pr-4 py-3 text-sm
                              focus:outline-none focus:ring-2 focus:ring-brand-400
                              ${errors.username ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>
              )}
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
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full border rounded-xl pl-9 pr-10 py-3 text-sm
                              focus:outline-none focus:ring-2 focus:ring-brand-400
                              ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setMdpVisible(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors"
                >
                  {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={confVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('confirmation')}
                  className={`w-full border rounded-xl pl-9 pr-10 py-3 text-sm
                              focus:outline-none focus:ring-2 focus:ring-brand-400
                              ${errors.confirmation ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setConfVisible(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors"
                >
                  {confVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmation && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmation.message}</p>
              )}
            </div>

            {/* Bouton inscription */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-500 text-white rounded-xl py-3.5 font-bold text-sm
                         hover:bg-brand-600 transition-colors disabled:opacity-60
                         flex items-center justify-center gap-2 min-h-[52px] mt-2"
            >
              {isSubmitting && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isSubmitting ? 'Création du compte…' : "S'inscrire"}
            </button>
          </form>

          {/* Lien connexion */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-brand-500 font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
