import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Loader2, MessageSquare } from 'lucide-react'
import { useRealtimeRow } from '@/hooks/useRealtime'
import { getOrderById } from '@/services/orderService'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'
import { contacterSupport } from '@/utils/whatsappMessage'
import { useAuth } from '@/hooks/useAuth'
import ChatModal from '@/components/shared/ChatModal'

// Étapes ordonnées de la timeline (hors "annulée")
const ETAPES = [
  { statut: 'en_attente',     label: 'Commande envoyée',    emoji: '📋' },
  { statut: 'acceptée',       label: 'Commande acceptée',   emoji: '✅' },
  { statut: 'en_préparation', label: 'En préparation',      emoji: '👨‍🍳' },
  { statut: 'prête',          label: 'Prête à partir',      emoji: '🎉' },
  { statut: 'en_livraison',   label: 'En route vers vous',  emoji: '🛵' },
  { statut: 'livrée',         label: 'Livrée',              emoji: '🏠' },
]

// ── Composant Timeline ─────────────────────────────────────
function Timeline({ statutActuel }) {
  if (statutActuel === 'annulée') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
        <p className="text-4xl mb-2">❌</p>
        <p className="font-bold text-red-700 text-lg">Commande annulée</p>
        <p className="text-sm text-red-500 mt-1">
          Si vous avez une question, contactez notre support.
        </p>
      </div>
    )
  }

  const indexActuel = ETAPES.findIndex(e => e.statut === statutActuel)

  return (
    <div>
      {ETAPES.map((etape, index) => {
        const fait  = index <= indexActuel
        const actif = index === indexActuel
        const dernier = index === ETAPES.length - 1

        return (
          <div key={etape.statut} className="flex gap-4">
            {/* Ligne verticale + cercle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 z-10
                  ${actif
                    ? 'bg-brand-500 ring-4 ring-brand-100 shadow-md'
                    : fait
                      ? 'bg-brand-400'
                      : 'bg-gray-200'
                  }`}
              >
                {fait
                  ? <span>{etape.emoji}</span>
                  : <span className="w-2.5 h-2.5 rounded-full bg-gray-400 block" />
                }
              </div>
              {/* Connecteur vertical */}
              {!dernier && (
                <div
                  className={`w-0.5 flex-1 min-h-[2.5rem]
                    ${index < indexActuel ? 'bg-brand-300' : 'bg-gray-200'}`}
                />
              )}
            </div>

            {/* Texte de l'étape */}
            <div className={`pt-1.5 ${!dernier ? 'pb-6' : 'pb-0'}`}>
              <p className={`font-semibold text-sm ${fait ? 'text-gray-900' : 'text-gray-400'}`}>
                {etape.label}
              </p>
              {actif && (
                <p className="text-xs text-brand-500 font-medium mt-0.5 animate-pulse">
                  En cours…
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Tracking principale
// ══════════════════════════════════════════════════════════
export default function Tracking() {
  const { id } = useParams()
  const { user } = useAuth()

  // Données riches (restaurant, livreur, items) — chargées une seule fois
  const [details,    setDetails]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [erreur,     setErreur]     = useState(null)
  const [chatOuvert, setChatOuvert] = useState(false)

  // Écoute Realtime pour les mises à jour de statut uniquement
  const { row: update } = useRealtimeRow('orders', id)

  // Chargement initial des détails
  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { data, error } = await getOrderById(id)
      if (error) setErreur(error)
      else       setDetails(data)
      setLoading(false)
    }
    charger()
  }, [id])

  // Mise à jour du statut depuis le flux Realtime
  useEffect(() => {
    if (update?.statut && details) {
      setDetails(prev => ({ ...prev, statut: update.statut }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update?.statut])

  // ── Chargement ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  // ── Erreur / non trouvée ────────────────────────────────
  if (erreur || !details) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-5xl mb-4">😔</p>
        <p className="font-bold text-gray-800 mb-2">Commande introuvable</p>
        <Link to="/mes-commandes" className="text-brand-500 underline text-sm">
          Voir mes commandes
        </Link>
      </div>
    )
  }

  const infosStatut = STATUTS_COMMANDE[details.statut]
  const livree      = details.statut === 'livrée'
  const annulee     = details.statut === 'annulée'
  const refCourte   = details.id.slice(0, 8).toUpperCase()

  // Estimation de livraison
  const tempsPrep = Math.max(
    ...(details.order_items ?? []).map(oi => oi.menu_item?.temps_preparation ?? 15),
    15
  )
  const estLivraison = details.type === 'livraison'
  const tempsTotal   = tempsPrep + (estLivraison ? 15 : 0) // +15 min pour la livraison
  const heureCommande = new Date(details.created_at)
  const heurePrevue   = new Date(heureCommande.getTime() + tempsTotal * 60_000)
  const heurePrevueStr = heurePrevue.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link to="/mes-commandes" aria-label="Retour aux commandes">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 text-lg">Suivi commande</h1>
          <p className="text-xs text-gray-400">Réf. #{refCourte}</p>
        </div>
        {/* Badge statut dynamique */}
        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${infosStatut?.couleur}`}>
          {infosStatut?.label}
        </span>
      </header>

      {/* ── Bandeau état principal ───────────────────────── */}
      {!annulee && (
        <div className={`mx-4 mt-4 rounded-xl p-4
          ${livree
            ? 'bg-green-50 border border-green-200'
            : 'bg-brand-50 border border-brand-200'}`}
        >
          <p className={`font-bold text-base ${livree ? 'text-green-700' : 'text-brand-700'}`}>
            {livree ? '🎉 Votre commande est arrivée !' : '⏳ Votre commande est en cours'}
          </p>
          <p className={`text-sm mt-1 ${livree ? 'text-green-600' : 'text-brand-600'}`}>
            {livree
              ? "Profitez de votre repas ! N'oubliez pas de laisser un avis."
              : `${estLivraison ? 'Livraison' : 'Retrait'} prévu vers ${heurePrevueStr} (~${tempsTotal} min)`}
          </p>
        </div>
      )}

      {/* ── Timeline ────────────────────────────────────── */}
      <section className="mx-4 mt-4 bg-white rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-5">Progression</h2>
        <Timeline statutActuel={details.statut} />
      </section>

      {/* ── Infos restaurant ────────────────────────────── */}
      {details.restaurant && (
        <section className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
            {details.restaurant.logo_url ? (
              <img
                src={details.restaurant.logo_url}
                alt={details.restaurant.nom}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {details.restaurant.nom}
            </p>
            {details.restaurant.adresse && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {details.restaurant.adresse}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Adresse de livraison ─────────────────────────── */}
      {details.type === 'livraison' && details.adresse_livraison && (
        <section className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm flex gap-3">
          <MapPin className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-gray-800">Adresse de livraison</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {details.adresse_livraison.rue}, {details.adresse_livraison.quartier}
            </p>
            {details.adresse_livraison.indication && (
              <p className="text-xs text-gray-400 mt-0.5">
                {details.adresse_livraison.indication}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Récapitulatif tarifaire ─────────────────────── */}
      <section className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="font-semibold text-gray-800 mb-2">Récapitulatif</h2>

        {(details.order_items ?? []).map((oi, i) => (
          <div key={i} className="flex justify-between text-sm text-gray-600">
            <span className="truncate pr-2">{oi.quantite}× {oi.menu_item?.nom ?? '—'}</span>
            <span className="shrink-0 tabular-nums">{formatCurrency(oi.sous_total)}</span>
          </div>
        ))}

        {details.frais_livraison > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Frais de livraison</span>
            <span className="tabular-nums">{formatCurrency(details.frais_livraison)}</span>
          </div>
        )}

        <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
          <span>Total payé</span>
          <span className="tabular-nums">
            {formatCurrency(details.montant_total + details.frais_livraison)}
          </span>
        </div>

        <p className="text-xs text-gray-400">
          Paiement : {details.mode_paiement === 'cash' ? 'Espèces' : 'Mobile Money'}
        </p>
      </section>

      {/* ── Actions ─────────────────────────────────────── */}
      <div className="mx-4 mt-5 space-y-3">
        {/* Laisser un avis → redirige vers historique */}
        {livree && (
          <Link
            to="/mes-commandes"
            className="block w-full text-center bg-brand-500 text-white font-bold py-4
                       rounded-xl hover:bg-brand-600 active:scale-[0.98] transition-all shadow-lg"
          >
            ⭐ Laisser un avis
          </Link>
        )}

        {/* Chat avec le restaurant */}
        {!annulee && (
          <button
            onClick={() => setChatOuvert(true)}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200
                       text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-gray-50
                       active:scale-[0.98] transition-all shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-brand-500" />
            Contacter le restaurant
          </button>
        )}

        {/* Support WhatsApp */}
        <button
          onClick={() => contacterSupport(`commande #${refCourte}`)}
          className="w-full flex items-center justify-center gap-2 bg-green-500 text-white
                     font-semibold py-3.5 rounded-xl hover:bg-green-600
                     active:scale-[0.98] transition-all"
        >
          <Phone className="w-4 h-4" />
          Contacter le support
        </button>
      </div>

      {/* ── Chat modal ──────────────────────────────────────── */}
      {chatOuvert && user && (
        <ChatModal
          orderId={id}
          monRole="client"
          monId={user.id}
          titreChat={details.restaurant?.nom ?? 'Restaurant'}
          onClose={() => setChatOuvert(false)}
        />
      )}
    </div>
  )
}
