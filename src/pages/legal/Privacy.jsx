import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ══════════════════════════════════════════════════════════
// Politique de confidentialité
// ⚠️ Texte de départ — à remplacer par le vrai texte légal de Zandofood.
// ══════════════════════════════════════════════════════════
export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link to="/register" className="p-2 -ml-2 text-gray-700">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">Politique de confidentialité</h1>
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Texte provisoire — à remplacer par la politique de confidentialité officielle de Zandofood.
        </p>
        <p>
          Zandofood collecte les informations nécessaires au fonctionnement du service : nom,
          numéro de téléphone, adresses de livraison, et historique de commandes. Ces données
          sont utilisées pour traiter vos commandes et améliorer votre expérience.
        </p>
        <p>
          Vos informations sont partagées uniquement avec le restaurant et le livreur concernés
          par une commande, dans la mesure nécessaire à sa livraison. Zandofood ne vend jamais vos
          données à des tiers.
        </p>
        <p>
          Vous pouvez à tout moment demander la suppression de votre compte et de vos données en
          contactant le support Zandofood.
        </p>
      </div>
    </div>
  )
}
