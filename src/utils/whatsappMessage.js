import { formatCurrency } from './formatCurrency'
import { MODES_PAIEMENT, WHATSAPP_SUPPORT } from './constants'

/**
 * Construit le texte du message WhatsApp pré-rempli pour une commande.
 *
 * Format attendu :
 *   Bonjour [Restaurant], je souhaite commander :
 *
 *   • 2x Saka-Saka au poisson fumé — 7 000 FCFA
 *   • 1x Jus de maracuja — 1 500 FCFA
 *
 *   Total : 8 500 FCFA
 *   Adresse : Avenue de la Paix, Poto-Poto (portail bleu)
 *   Paiement : Mobile Money
 *
 * @param {object} params
 * @param {string}   params.nomRestaurant   — Nom du restaurant
 * @param {Array}    params.items           — [{nom, quantite, sous_total}]
 * @param {number}   params.montantTotal    — Montant articles en FCFA
 * @param {number}   [params.fraisLivraison] — Frais de livraison en FCFA
 * @param {object}   [params.adresse]       — { rue, quartier, indication }
 * @param {string}   params.modePaiement    — 'cash' | 'mobile_money'
 * @param {string}   [params.notes]         — Instructions spéciales
 * @returns {string} Message formaté prêt à encoder
 */
export function buildOrderMessage({
  nomRestaurant,
  items = [],
  montantTotal,
  fraisLivraison = 0,
  adresse = null,
  modePaiement,
  notes = null,
}) {
  // Ligne par article
  const lignesArticles = items
    .map(({ nom, quantite, sous_total }) =>
      `  • ${quantite}x ${nom} — ${formatCurrency(sous_total)}`
    )
    .join('\n')

  // Adresse lisible
  const adresseTexte = adresse
    ? [adresse.rue, adresse.quartier, adresse.indication]
        .filter(Boolean)
        .join(', ')
    : null

  // Total final = articles + livraison
  const totalFinal = montantTotal + fraisLivraison

  // Libellé mode de paiement
  const labelPaiement = MODES_PAIEMENT[modePaiement]?.label ?? modePaiement

  // Construction des lignes du message (on filtre les lignes vides)
  const lignes = [
    `Bonjour *${nomRestaurant}*, je souhaite commander :`,
    '',
    lignesArticles,
    '',
    `*Total articles :* ${formatCurrency(montantTotal)}`,
    fraisLivraison > 0
      ? `*Frais de livraison :* ${formatCurrency(fraisLivraison)}`
      : null,
    fraisLivraison > 0
      ? `*Total à payer :* ${formatCurrency(totalFinal)}`
      : null,
    adresseTexte
      ? `*Adresse :* ${adresseTexte}`
      : `*Mode :* Retrait en boutique`,
    `*Paiement :* ${labelPaiement}`,
    notes ? `*Instructions :* ${notes}` : null,
    '',
    '_Commande passée via Zandofood 🍽️_',
  ]

  return lignes.filter((l) => l !== null).join('\n')
}

/**
 * Ouvre WhatsApp (web ou app mobile) avec le message pré-rempli.
 *
 * @param {string} telephone  — Numéro international sans '+' (ex: "242066000001")
 * @param {string} message    — Texte du message (non encodé)
 */
export function ouvrirWhatsApp(telephone, message) {
  const numero  = telephone.replace(/\D/g, '') // supprime tous les non-chiffres
  const encoded = encodeURIComponent(message)
  const url     = `https://wa.me/${numero}?text=${encoded}`

  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Raccourci : contact support Zandofood.
 * @param {string} [sujet] — Sujet optionnel affiché dans le message
 */
export function contacterSupport(sujet = '') {
  const message = sujet
    ? `Bonjour Zandofood Support, j'ai besoin d'aide concernant : ${sujet}`
    : 'Bonjour Zandofood Support, j\'ai besoin d\'aide.'

  ouvrirWhatsApp(WHATSAPP_SUPPORT, message)
}

/**
 * Raccourci complet : construit le message ET ouvre WhatsApp en une seule
 * fonction (usage dans les pages Checkout / Tracking).
 *
 * @param {string} telephone — Numéro du restaurant
 * @param {object} commandeParams — Même signature que buildOrderMessage
 */
export function envoyerCommandeWhatsApp(telephone, commandeParams) {
  const message = buildOrderMessage(commandeParams)
  ouvrirWhatsApp(telephone, message)
}
