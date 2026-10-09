import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ══════════════════════════════════════════════════════════
// Mentions légales
// ⚠️ [Nom du responsable] et [Adresse] sont des champs à remplir avec les
// informations réelles avant publication — voir le bandeau ci-dessous.
// Zandofood n'étant pas encore immatriculée (RCCM/NIU) au moment de la
// rédaction, cette page identifie l'exploitant à titre individuel ; le
// numéro d'immatriculation sera ajouté dès que la société sera créée.
// ══════════════════════════════════════════════════════════
function Section({ titre, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-gray-900 text-[15px]">{titre}</h2>
      <div className="space-y-2 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

export default function LegalNotice() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link to="/register" className="p-2 -ml-2 text-gray-700">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">Mentions légales</h1>
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          À compléter avant mise en ligne : le nom du responsable et l'adresse ci-dessous sont des
          exemples à remplacer par vos informations réelles. Le numéro RCCM/NIU sera ajouté une
          fois Zandofood immatriculée.
        </p>

        <Section titre="Éditeur de l'application">
          <p>
            L'application et le site Zandofood sont édités par :{' '}
            <b>[Nom complet du responsable]</b>, exploitant à titre individuel, domicilié à{' '}
            <b>[Adresse à Brazzaville, République du Congo]</b>.
          </p>
          <p>
            Contact :{' '}
            <a href="tel:+242064623778" className="text-brand-600 underline">+242 06 462 37 78</a>
            {' '}— [adresse email de contact à ajouter].
          </p>
          <p className="text-xs text-gray-400">
            Zandofood est en cours de constitution en société ; le numéro d'immatriculation (RCCM)
            et le numéro d'identifiant unique (NIU) seront ajoutés à cette page dès leur obtention.
          </p>
        </Section>

        <Section titre="Hébergement">
          <p>
            Le site web est hébergé par Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789,
            États-Unis). La base de données et les fonctions serveur sont hébergées par Supabase
            Inc.
          </p>
        </Section>

        <Section titre="Propriété intellectuelle">
          <p>
            Le nom « Zandofood », son logo et l'ensemble des éléments graphiques, textuels et
            techniques de l'application sont la propriété de son éditeur, sauf mention contraire.
            Toute reproduction non autorisée est interdite.
          </p>
          <p>
            Les noms, logos et photos des restaurants partenaires restent la propriété de ces
            derniers, qui garantissent disposer des droits nécessaires à leur diffusion sur la
            plateforme.
          </p>
        </Section>

        <Section titre="Documents liés">
          <p>
            Cette page complète les{' '}
            <Link to="/conditions-utilisation" className="text-brand-600 underline">
              conditions d'utilisation
            </Link>{' '}
            et la{' '}
            <Link to="/politique-confidentialite" className="text-brand-600 underline">
              politique de confidentialité
            </Link>{' '}
            de Zandofood.
          </p>
        </Section>
      </div>
    </div>
  )
}
