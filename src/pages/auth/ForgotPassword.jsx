import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { ouvrirWhatsApp } from '@/utils/whatsappMessage'
import { WHATSAPP_SUPPORT } from '@/utils/constants'

// ══════════════════════════════════════════════════════════
// Page Mot de passe oublié — réinitialisation manuelle via le support
// WhatsApp, sans dépendance SMS payante. Le support identifie le compte
// par le numéro de téléphone et le réinitialise depuis l'espace admin.
// ══════════════════════════════════════════════════════════
export default function ForgotPassword() {
  const navigate = useNavigate()
  const [telephoneLocal, setTelephoneLocal] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (telephoneLocal.length !== 9) { toast.error('Numéro invalide — 9 chiffres requis'); return }

    const telephone = `+242${telephoneLocal}`
    const message = `Bonjour Zandofood Support, j'ai oublié mon mot de passe. Mon numéro de compte est ${telephone}. Pouvez-vous le réinitialiser ?`
    ouvrirWhatsApp(WHATSAPP_SUPPORT, message)
    navigate('/login')
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
            Indiquez votre numéro et nous ouvrons WhatsApp pour que notre support réinitialise votre mot de passe.
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
              disabled={telephoneLocal.length !== 9}
              className="w-full bg-green-500 text-white rounded-xl py-3.5 font-bold text-sm
                         hover:bg-green-600 transition-colors disabled:opacity-60 min-h-[52px]
                         flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Contacter le support sur WhatsApp
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
