import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ══════════════════════════════════════════════════════════
// Conditions Générales d'Utilisation (CGU)
// Dernière mise à jour : voir DATE_MAJ ci-dessous.
//
// Rédigées pour refléter fidèlement le fonctionnement réel de l'app,
// avec un accent volontaire sur la protection de l'exploitant (limitation
// de responsabilité, indemnisation, absence de garantie, utilisations
// interdites) tout en restant équilibrées et lisibles pour l'utilisateur —
// un texte trop déséquilibré peut être annulé par un juge et n'inspire pas
// confiance. À faire relire par un juriste avant le lancement commercial
// officiel, et à compléter avec le numéro RCCM/NIU une fois la société
// immatriculée (voir /mentions-legales).
// ══════════════════════════════════════════════════════════
const DATE_MAJ = '14 septembre 2026'

function Section({ titre, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-gray-900 text-[15px]">{titre}</h2>
      <div className="space-y-2 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link to="/register" className="p-2 -ml-2 text-gray-700">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">Conditions d'utilisation</h1>
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        <p className="text-xs text-gray-400">Dernière mise à jour : {DATE_MAJ}</p>

        <Section titre="1. Objet et définitions">
          <p>
            Les présentes Conditions Générales d'Utilisation (les « CGU ») régissent l'accès et
            l'utilisation de l'application et du site Zandofood (la « Plateforme »), édités par
            l'exploitant identifié dans les{' '}
            <Link to="/mentions-legales" className="text-brand-600 underline">Mentions légales</Link>{' '}
            (« Zandofood », « nous »).
          </p>
          <p>
            Zandofood met en relation, à Brazzaville, des <b>clients</b>, des{' '}
            <b>restaurants partenaires</b> et des <b>livreurs indépendants</b> (ensemble, les
            « Utilisateurs »), afin de permettre la commande et la livraison de repas.
          </p>
          <p>
            <b>Zandofood est un simple intermédiaire technique</b> : elle n'est ni un restaurant, ni
            une société de restauration, ni un transporteur, ni l'employeur d'un livreur. Le contrat
            de vente du repas se forme directement entre le client et le restaurant ; la prestation
            de livraison est assurée par un livreur indépendant. Zandofood n'est partie à aucun de
            ces deux contrats et n'en garantit ni l'exécution ni le résultat.
          </p>
        </Section>

        <Section titre="2. Acceptation des conditions">
          <p>
            La création d'un compte et l'utilisation de la Plateforme, sous quelque forme que ce
            soit, impliquent l'acceptation pleine, entière et sans réserve des présentes CGU, de la{' '}
            <Link to="/politique-confidentialite" className="text-brand-600 underline">
              Politique de confidentialité
            </Link>{' '}
            et des Mentions légales. Si vous n'acceptez pas ces documents, vous ne devez pas utiliser
            Zandofood.
          </p>
        </Section>

        <Section titre="3. Éligibilité et compte utilisateur">
          <p>
            L'utilisation de Zandofood est réservée aux personnes âgées d'au moins 16 ans, ou
            utilisant le service sous la supervision d'un parent ou tuteur pour les commandes
            passées en leur nom. En créant un compte, vous garantissez que les informations fournies
            (nom, numéro de téléphone, adresses) sont exactes, et vous vous engagez à les tenir à
            jour.
          </p>
          <p>
            Vous êtes seul responsable de la confidentialité de votre mot de passe et de{' '}
            <b>toute activité effectuée depuis votre compte</b>, qu'elle soit ou non autorisée par
            vous. Vous devez informer immédiatement le support de toute utilisation non autorisée
            suspectée.
          </p>
        </Section>

        <Section titre="4. Commandes, prix et paiement">
          <p>
            Les prix des plats, frais de livraison et délais de préparation affichés sont fixés par
            chaque restaurant (ou, pour les frais de livraison, par Zandofood) et sont donnés à
            titre indicatif ; ils peuvent varier selon la charge du restaurant ou les conditions de
            circulation. Zandofood ne garantit pas l'exactitude des informations (photos,
            descriptions, allergènes) fournies par les restaurants sur leurs propres plats.
          </p>
          <p>
            Le paiement s'effectue soit en espèces à la livraison ou au retrait, soit par Mobile
            Money (MTN Mobile Money ou Airtel Money) directement au restaurant, sur présentation
            d'une preuve de transaction que le restaurant vérifie avant d'accepter la commande. Ces
            transactions ont lieu <b>directement entre le client et le restaurant</b> : Zandofood
            n'encaisse pas elle-même ces paiements et n'est pas partie à ce flux financier.
          </p>
        </Section>

        <Section titre="5. Annulation et remboursement">
          <p>
            Une commande peut être refusée par le restaurant avant acceptation (ex. produit
            indisponible, restaurant fermé) ; elle est alors annulée sans frais pour le client.
          </p>
          <p>
            Après acceptation, l'annulation n'est plus garantie une fois la préparation commencée.
            En cas de problème avec une commande livrée, le client peut signaler l'incident depuis
            l'écran de suivi ou contacter le support. Zandofood examine chaque signalement de bonne
            foi et au cas par cas ; un remboursement, un avoir ou une nouvelle livraison{' '}
            <b>peut être proposé à titre commercial, sans que cela constitue une reconnaissance de
            responsabilité ni une garantie automatique</b>. Les paiements réglés directement au
            restaurant ou au livreur peuvent nécessiter une coordination avec la partie concernée.
          </p>
        </Section>

        <Section titre="6. Livraison">
          <p>
            Les livraisons sont assurées par des livreurs indépendants qui choisissent librement les
            courses qu'ils acceptent. Les délais affichés sont des estimations et ne constituent en
            aucun cas un engagement contractuel ferme de Zandofood.
          </p>
          <p>
            Le client doit fournir une adresse de livraison exacte et être joignable au numéro
            renseigné. Zandofood ne peut être tenue responsable d'une non-livraison ou d'un retard
            causé par une adresse erronée, une indisponibilité du client, ou tout fait qui ne lui est
            pas directement imputable.
          </p>
        </Section>

        <Section titre="7. Obligations des restaurants partenaires">
          <p>
            Les restaurants s'engagent à maintenir à jour leur menu, leurs prix et leurs horaires, à
            respecter les règles d'hygiène et de sécurité alimentaire en vigueur, à traiter les
            commandes dans un délai raisonnable, et à reverser à Zandofood la commission convenue
            sur chaque commande. Le restaurant est seul responsable de la qualité, de la salubrité et
            de la conformité des plats qu'il prépare et vend.
          </p>
        </Section>

        <Section titre="8. Obligations des livreurs partenaires">
          <p>
            Les livreurs sont des travailleurs indépendants, seuls responsables de leur véhicule,
            de leur assurance et du respect du code de la route. Zandofood n'est pas l'employeur des
            livreurs et n'exerce aucun lien de subordination : le livreur choisit librement d'accepter
            ou refuser une course. Le livreur est seul responsable de tout dommage causé à un tiers
            dans l'exercice de son activité.
          </p>
        </Section>

        <Section titre="9. Utilisations interdites">
          <p>Sans que cette liste soit exhaustive, il est interdit de :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fournir de fausses informations, usurper une identité, ou créer plusieurs comptes pour contourner une limitation ou abuser d'une promotion ;</li>
            <li>Passer des commandes frauduleuses, refuser abusivement un paiement dû, ou contester de mauvaise foi une transaction légitime ;</li>
            <li>Harceler, menacer ou abuser verbalement un restaurant, un livreur, un client ou un membre du support ;</li>
            <li>Tenter d'accéder sans autorisation aux systèmes de Zandofood, de contourner ses mesures de sécurité, ou d'en extraire les données par des moyens automatisés (aspiration, robots) ;</li>
            <li>Utiliser la Plateforme à des fins illégales, ou publier un contenu diffamatoire, injurieux, ou portant atteinte aux droits d'un tiers.</li>
          </ul>
          <p>
            Toute violation de cette section peut entraîner la suspension ou la suppression
            immédiate du compte, sans préjudice d'éventuelles poursuites.
          </p>
        </Section>

        <Section titre="10. Contenu et propriété intellectuelle">
          <p>
            Le nom « Zandofood », son logo, le design et le code de la Plateforme sont la propriété
            exclusive de son exploitant ou de ses concédants. Aucune disposition des présentes ne
            vous confère un droit sur ces éléments, en dehors du droit d'utiliser l'application
            conformément à sa destination.
          </p>
          <p>
            En publiant un contenu sur la Plateforme (avis, commentaire, photo de profil, message),
            vous garantissez en détenir les droits nécessaires et vous accordez à Zandofood une
            licence non exclusive, gratuite et mondiale pour l'héberger, l'afficher, le modérer et le
            reproduire dans le cadre du fonctionnement et de la promotion du service. Zandofood peut
            retirer ou masquer tout contenu contraire aux présentes CGU, à sa seule appréciation.
          </p>
        </Section>

        <Section titre="11. Absence de garantie">
          <p>
            La Plateforme est fournie « en l'état » et « selon disponibilité ». Dans la mesure permise
            par la loi, Zandofood <b>exclut toute garantie</b>, expresse ou implicite, quant à la
            disponibilité ininterrompue du service, l'absence d'erreurs, l'exactitude des
            informations affichées, ou l'adéquation du service à un usage particulier.
          </p>
        </Section>

        <Section titre="12. Limitation de responsabilité">
          <p>
            Zandofood n'est en aucun cas responsable des actes, omissions, retards ou manquements
            d'un restaurant ou d'un livreur, ces derniers étant des tiers indépendants agissant sous
            leur propre responsabilité. Zandofood n'est pas non plus responsable des interruptions du
            service dues à la maintenance, une panne technique, une coupure réseau ou électrique, ou
            tout autre événement échappant à son contrôle raisonnable.
          </p>
          <p>
            Dans la mesure permise par la loi, la responsabilité de Zandofood envers un Utilisateur,
            toutes causes confondues, est <b>limitée au montant de la commande concernée par la
            réclamation</b>, et exclut dans tous les cas les dommages indirects, accessoires ou
            consécutifs (perte de profit, de chance, de données ou d'opportunité), même si Zandofood
            a été informée de leur possibilité.
          </p>
        </Section>

        <Section titre="13. Indemnisation">
          <p>
            Vous acceptez d'indemniser et de tenir Zandofood, ses dirigeants et ses représentants,
            indemnes de toute réclamation, dommage, perte ou frais (y compris les honoraires
            raisonnables d'avocat) résultant : de votre violation des présentes CGU ; de votre
            utilisation abusive ou illégale de la Plateforme ; de votre violation des droits d'un
            tiers ; ou d'un contenu que vous avez publié.
          </p>
        </Section>

        <Section titre="14. Force majeure">
          <p>
            Zandofood ne peut être tenue responsable de tout manquement dû à un cas de force majeure
            ou à un événement hors de son contrôle raisonnable : catastrophe naturelle, trouble à
            l'ordre public, coupure d'électricité, de réseau internet ou téléphonique, décision d'une
            autorité publique, épidémie, grève, ou tout autre événement de même nature.
          </p>
        </Section>

        <Section titre="15. Suspension et résiliation">
          <p>
            Zandofood peut, à sa seule appréciation et sans préavis lorsque la situation le justifie
            (fraude suspectée, sécurité, non-respect des présentes CGU, non-paiement d'une commission
            due), suspendre, limiter ou résilier l'accès d'un Utilisateur à la Plateforme, sans que
            cela n'engage sa responsabilité envers l'Utilisateur concerné. Tout utilisateur peut
            demander la suppression de son propre compte à tout moment en contactant le support.
          </p>
          <p>
            Les sections relatives à la limitation de responsabilité, à l'indemnisation et au droit
            applicable survivent à la résiliation du compte, quelle qu'en soit la cause.
          </p>
        </Section>

        <Section titre="16. Modification des conditions">
          <p>
            Zandofood peut modifier les présentes CGU à tout moment ; la date de mise à jour en haut
            de cette page est actualisée en conséquence. La poursuite de l'utilisation de
            l'application après modification vaut acceptation des nouvelles conditions.
          </p>
        </Section>

        <Section titre="17. Divisibilité et intégralité de l'accord">
          <p>
            Si une clause des présentes CGU est jugée invalide ou inapplicable, les autres clauses
            demeurent pleinement en vigueur. Les présentes CGU, la Politique de confidentialité et
            les Mentions légales constituent l'intégralité de l'accord entre vous et Zandofood
            concernant l'utilisation de la Plateforme.
          </p>
        </Section>

        <Section titre="18. Droit applicable et litiges">
          <p>
            Les présentes CGU sont régies par le droit de la République du Congo. En cas de litige,
            les parties s'efforceront de trouver une solution amiable en contactant d'abord le
            support Zandofood. À défaut d'accord amiable, le litige relève de la compétence exclusive
            des juridictions de Brazzaville.
          </p>
        </Section>

        <Section titre="19. Contact">
          <p>
            Pour toute question relative aux présentes CGU : {' '}
            <a href="tel:+242064623778" className="text-brand-600 underline">+242 06 462 37 78</a>{' '}
            ou via le support intégré à l'application.
          </p>
        </Section>
      </div>
    </div>
  )
}
