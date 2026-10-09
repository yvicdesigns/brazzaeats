import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ══════════════════════════════════════════════════════════
// Politique de confidentialité
// Rédigée pour refléter précisément les données réellement collectées
// par l'app (voir code : geolocation, photos de preuve de paiement,
// notifications push, stockage local du panier). À faire relire par un
// juriste avant le lancement officiel.
// ══════════════════════════════════════════════════════════
const DATE_MAJ = '7 septembre 2026'

function Section({ titre, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-gray-900 text-[15px]">{titre}</h2>
      <div className="space-y-2 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link to="/register" className="p-2 -ml-2 text-gray-700">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">Politique de confidentialité</h1>
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        <p className="text-xs text-gray-400">Dernière mise à jour : {DATE_MAJ}</p>

        <Section titre="1. Données que nous collectons">
          <p>Selon votre usage de l'application, Zandofood collecte :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <b>Informations de compte</b> — nom, numéro de téléphone (identifiant de connexion),
              et email si vous le renseignez.
            </li>
            <li>
              <b>Adresses de livraison</b> — quartier, rue, indications, et position GPS si vous
              choisissez de la partager (recommandé pour une livraison plus précise).
            </li>
            <li>
              <b>Position en temps réel du livreur</b> — pendant qu'une course est en cours, pour
              afficher le trajet et le temps d'arrivée estimé au client concerné par cette commande.
            </li>
            <li>
              <b>Historique de commandes</b> — plats commandés, montants, dates, avis laissés.
            </li>
            <li>
              <b>Preuve de paiement Mobile Money</b> — capture d'écran du SMS de confirmation,
              envoyée volontairement par le client au restaurant pour valider un paiement.
            </li>
            <li>
              <b>Photo de profil</b> — si vous choisissez d'en ajouter une.
            </li>
            <li>
              <b>Messages</b> — échangés dans la messagerie intégrée avec un livreur (pendant une
              course) ou avec le support Zandofood.
            </li>
            <li>
              <b>Identifiant de notification push</b> — pour vous envoyer des alertes (nouvelle
              commande, changement de statut), si vous autorisez les notifications.
            </li>
          </ul>
        </Section>

        <Section titre="2. Pourquoi nous les utilisons">
          <p>
            Ces données servent exclusivement à faire fonctionner le service : traiter vos
            commandes, permettre au restaurant et au livreur de vous localiser, vous tenir informé
            de l'avancement de votre commande, assurer le support client, et améliorer
            l'application.
          </p>
        </Section>

        <Section titre="3. Avec qui vos données sont partagées">
          <p>
            Vos informations ne sont partagées qu'avec les parties strictement nécessaires à
            l'exécution d'une commande donnée :
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Le <b>restaurant</b> concerné voit votre nom, téléphone et adresse de livraison.</li>
            <li>
              Le <b>livreur</b> assigné voit votre nom, téléphone et adresse pour la durée de la
              course.
            </li>
          </ul>
          <p>
            Zandofood ne vend, ne loue et ne partage jamais vos données avec des tiers à des fins
            commerciales ou publicitaires.
          </p>
          <p>
            Nous utilisons des prestataires techniques pour faire fonctionner la plateforme
            (hébergement du site, base de données, envoi de SMS de vérification, cartographie via
            OpenStreetMap) : ces prestataires traitent les données uniquement pour le compte de
            Zandofood et dans ce cadre technique, jamais pour leur propre usage.
          </p>
        </Section>

        <Section titre="4. Conservation des données">
          <p>
            Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la
            suppression de votre compte et de vos données à tout moment (voir section 6) ; certaines
            informations liées à des commandes passées peuvent être conservées à des fins comptables
            ou légales pendant la durée requise par la loi.
          </p>
        </Section>

        <Section titre="5. Stockage local sur votre appareil">
          <p>
            Votre panier en cours et certaines préférences (volume des notifications, etc.) sont
            enregistrés localement sur votre appareil (stockage local du navigateur ou de
            l'application), afin de les retrouver d'une session à l'autre. Ces informations restent
            sur votre appareil et ne sont pas transmises à Zandofood.
          </p>
        </Section>

        <Section titre="6. Vos droits">
          <p>
            Vous pouvez à tout moment consulter, corriger ou demander la suppression de vos
            données, ainsi que retirer votre consentement à la géolocalisation ou aux notifications
            (via les réglages de votre appareil), en contactant le support Zandofood :{' '}
            <a href="tel:+242064623778" className="text-brand-600 underline">+242 06 462 37 78</a>.
          </p>
        </Section>

        <Section titre="7. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques raisonnables pour protéger vos données
            (accès restreint par compte et par rôle, connexions chiffrées). Aucun système n'étant
            infaillible, nous vous invitons à ne jamais partager votre mot de passe.
          </p>
        </Section>

        <Section titre="8. Mineurs">
          <p>
            Zandofood n'est pas destiné aux enfants de moins de 16 ans utilisant le service sans
            supervision d'un parent ou tuteur.
          </p>
        </Section>

        <Section titre="9. Modifications">
          <p>
            Cette politique peut être mise à jour ; la date en haut de page est actualisée en
            conséquence. En cas de changement important, nous vous en informerons via
            l'application.
          </p>
        </Section>
      </div>
    </div>
  )
}
