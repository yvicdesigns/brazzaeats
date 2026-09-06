import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'

// ══════════════════════════════════════════════════════════
// Page Succès — mot de passe modifié
// ══════════════════════════════════════════════════════════
export default function PasswordChanged() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center
                      ring-8 ring-green-50 mb-6">
        <Check className="w-10 h-10 text-green-600" strokeWidth={2.5} />
      </div>
      <h2 className="text-xl font-black text-gray-900">Mot de passe modifié !</h2>
      <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">
        Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
      </p>
      <button
        onClick={() => navigate('/login', { replace: true })}
        className="w-full max-w-sm bg-brand-500 text-white rounded-xl py-3.5 font-bold text-sm mt-8
                   hover:bg-brand-600 transition-colors min-h-[52px]"
      >
        Se connecter
      </button>
    </div>
  )
}
