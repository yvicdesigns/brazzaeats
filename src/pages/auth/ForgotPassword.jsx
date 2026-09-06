import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { demanderCodeSMS } from '@/services/authService'

// ══════════════════════════════════════════════════════════
// Page Mot de passe oublié — demande d'un code par SMS
// ══════════════════════════════════════════════════════════
export default function ForgotPassword() {
  const navigate = useNavigate()
  const [telephoneLocal, setTelephoneLocal] = useState('')
  const [envoi,          setEnvoi]          = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (telephoneLocal.length !== 9) { toast.error('Numéro invalide — 9 chiffres requis'); return }

    const telephone = `+242${telephoneLocal}`
    setEnvoi(true)
    const { debugCode, error } = await demanderCodeSMS(telephone)
    setEnvoi(false)

    if (error) { toast.error(error); return }

    if (debugCode) {
      // ⚠️ Mode démo — aucun fournisseur SMS n'est encore branché, le code est
      // affiché ici pour permettre de tester le parcours. À retirer une fois
      // un vrai envoi SMS en place.
      toast.success(`Mode démo — votre code est ${debugCode}`, { duration: 8000 })
    } else {
      toast.success('Code envoyé par SMS')
    }

    navigate('/verification-code', { state: { telephone } })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-start justify-start px-6 pt-12 pb-8">
        <Link to="/login" aria-label="Retour" className="p-2 -ml-2 mb-6 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Mot de passe oublié ?</h2>
          <p className="text-sm text-gray-500 mb-6">
            Pas de souci, indiquez votre numéro et nous vous enverrons un code de vérification par SMS.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de téléphone
              </label>
              <div className="flex items-center rounded-xl border border-gray-300 overflow-hidden
                               focus-within:ring-2 focus-within:ring-brand-400">
                <span className="flex items-center gap-1.5 px-3 py-3 text-sm text-gray-500
                                  bg-gray-50 border-r border-gray-200 shrink-0">
                  <Phone className="w-4 h-4 text-gray-400" />
                  +242
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={9}
                  placeholder="06 123 4567"
                  value={telephoneLocal}
                  onChange={e => setTelephoneLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="flex-1 px-3 py-3 text-sm focus:outline-none bg-white min-w-0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={envoi || telephoneLocal.length !== 9}
              className="w-full bg-brand-500 text-white rounded-xl py-3.5 font-bold text-sm
                         hover:bg-brand-600 transition-colors disabled:opacity-60 min-h-[52px]"
            >
              {envoi ? 'Envoi…' : 'Envoyer le code'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-brand-500 font-semibold hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
