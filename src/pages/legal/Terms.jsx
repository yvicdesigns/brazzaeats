import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ══════════════════════════════════════════════════════════
// Conditions d'utilisation
// ⚠️ Texte de départ — à remplacer par le vrai texte légal de Zandofood.
// ══════════════════════════════════════════════════════════
export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link to="/register" className="p-2 -ml-2 text-gray-700">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">Conditions d'utilisation</h1>
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Texte provisoire — à remplacer par les conditions d'utilisation officielles de Zandofood.
        </p>
        <p>
          En créant un compte et en utilisant l'application Zandofood, vous acceptez les présentes
          conditions d'utilisation. Zandofood met en relation des clients, des restaurants
          partenaires et des livreurs indépendants à Brazzaville.
        </p>
        <p>
          Vous êtes responsable de l'exactitude des informations fournies lors de votre
          inscription (nom, numéro de téléphone, adresses de livraison) ainsi que de la
          confidentialité de votre mot de passe.
        </p>
        <p>
          Les prix, délais de livraison et disponibilités affichés sont indicatifs et peuvent
          varier selon le restaurant. Le paiement peut s'effectuer en espèces à la livraison ou
          par Mobile Money directement auprès du restaurant.
        </p>
        <p>
          Zandofood se réserve le droit de suspendre un compte en cas d'utilisation frauduleuse
          ou abusive de la plateforme.
        </p>
      </div>
    </div>
  )
}
