import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Loader2, MessageSquare, TriangleAlert, Check, LocateFixed } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRealtimeRow } from '@/hooks/useRealtime'
import { supabase } from '@/supabase/client'
import { getOrderById, reportOrderIssue } from '@/services/orderService'
import { formatCurrency } from '@/utils/formatCurrency'
import { contacterSupport } from '@/utils/whatsappMessage'
import { useAuth } from '@/hooks/useAuth'
import ChatModal from '@/components/shared/ChatModal'
import Modal from '@/components/ui/Modal'
import LivreurMap from '@/components/shared/LivreurMap'

// Étapes ordonnées de la timeline (hors "annulée")
const ETAPES = [
  { statut: 'en_attente',     label: 'Commande confirmée' },
  { statut: 'acceptée',       label: 'En préparation' },
  { statut: 'en_préparation', label: 'En préparation' },
  { statut: 'prête',          label: 'Commande récupérée' },
  { statut: 'en_livraison',   label: 'En route vers vous' },
  { statut: 'livrée',         label: 'Livrée' },
]
// Certaines étapes serveur partagent un même libellé visuel — on ne
// garde que la première occurrence pour la timeline affichée.
const ETAPES_AFFICHEES = ETAPES.filter((e, i) => ETAPES.findIndex(x => x.label === e.label) === i)

function indexEtapeAffichee(statut) {
  const idxReel = ETAPES.findIndex(e => e.statut === statut)
  if (idxReel === -1) return -1
  const label = ETAPES[idxReel].label
  return ETAPES_AFFICHEES.findIndex(e => e.label === label)
}

function distanceKm(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s))
}

// ── Timeline verticale ───────────────────────────────────────
function Timeline({ statutActuel }) {
  const indexActuel = indexEtapeAffichee(statutActuel)

  return (
    <div>
      {ETAPES_AFFICHEES.map((etape, index) => {
        const fait  = index < indexActuel || (index === indexActuel && statutActuel === 'livrée')
        const actif = index === indexActuel && statutActuel !== 'livrée'
        const dernier = index === ETAPES_AFFICHEES.length - 1

        return (
          <div key={etape.statut} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full shrink-0 grid place-items-center transition-all duration-300
                  ${fait ? 'bg-brand-600' : actif ? 'border-2 border-brand-600 shadow-[0_0_0_4px_theme(colors.brand.50)]' : 'bg-gray-100 border-2 border-gray-200'}`}
              >
                {fait && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                {actif && <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />}
              </div>
              {!dernier && (
                <div className={`w-0.5 flex-1 min-h-[2rem] transition-colors duration-300 ${fait ? 'bg-brand-600' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className={`${!dernier ? 'pb-5' : ''}`}>
              <p className={`text-[13px] font-bold transition-colors ${fait || actif ? 'text-gray-900' : 'text-gray-400'}`}>
                {etape.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Barre de progression linéaire du trajet ─────────────────
// Complète la carte : même avancement réel (distance parcourue vs distance
// totale restaurant → adresse), mais visualisé comme une simple barre — plus
// lisible d'un coup d'œil que la carte pour "où en est le livreur ?".
function BarreProgressionTrajet({ restaurantPos, livreurPos, destinationPos }) {
  if (!restaurantPos || !livreurPos || !destinationPos) return null

  const totalKm = distanceKm(restaurantPos, destinationPos)
  const resteKm = distanceKm(livreurPos, destinationPos)
  const progression = totalKm > 0
    ? Math.min(1, Math.max(0.02, 1 - resteKm / totalKm))
    : 0.02

  return (
    <div className="pt-1 pb-3">
      <div className="relative h-20 px-2">
        {/* Avatar du livreur — sa position horizontale reflète l'avancement réel */}
        <div
          className="absolute top-0 -translate-x-1/2 transition-[left] duration-700 ease-out"
          style={{ left: `calc(6px + (100% - 12px) * ${progression})` }}
        >
          <img
            src="/icons/livreur-avatar.png"
            alt="Livreur en route"
            className="w-16 h-auto drop-shadow-md"
          />
        </div>

        {/* Piste */}
        <div className="absolute inset-x-1.5 bottom-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progression * 100}%` }}
          />
        </div>

        {/* Points de départ / arrivée */}
        <div className="absolute left-1.5 bottom-2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-gray-800 border-2 border-white shadow" />
        <div className="absolute right-1.5 bottom-2 translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-brand-600 border-2 border-white shadow" />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 font-medium px-0.5 -mt-1">
        <span>Restaurant</span>
        <span>Chez vous</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Tracking principale
// ══════════════════════════════════════════════════════════
export default function Tracking() {
  const { id } = useParams()
  const { user } = useAuth()

  const [details,    setDetails]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [erreur,     setErreur]     = useState(null)
  const [chatOuvert, setChatOuvert] = useState(false)
  const [signalementOuvert, setSignalementOuvert] = useState(false)
  const [motifSignalement,  setMotifSignalement]  = useState('')
  const [envoiEnCours,      setEnvoiEnCours]      = useState(false)
  const [dejaSignale,       setDejaSignale]       = useState(false)
  const [livreurPos,        setLivreurPos]        = useState(null)

  const { row: update } = useRealtimeRow('orders', id)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { data, error } = await getOrderById(id)
      if (error) setErreur(error)
      else {
        setDetails(data)
        if (data?.delivery?.position_actuelle) setLivreurPos(data.delivery.position_actuelle)
      }
      setLoading(false)
    }
    charger()
  }, [id])

  useEffect(() => {
    if (update?.statut && details) {
      setDetails(prev => ({ ...prev, statut: update.statut }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update?.statut])

  // Position live du livreur — table `deliveries`, indépendante de `orders`
  useEffect(() => {
    if (!id) return
    const canal = supabase
      .channel(`delivery_position:${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `order_id=eq.${id}` },
        (payload) => {
          if (payload.new?.position_actuelle) setLivreurPos(payload.new.position_actuelle)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [id])

  const restaurantPos = useMemo(() => (
    details?.restaurant?.latitude && details?.restaurant?.longitude
      ? { lat: details.restaurant.latitude, lng: details.restaurant.longitude }
      : null
  ), [details])

  const destinationPos = useMemo(() => (
    details?.adresse_livraison?.latitude && details?.adresse_livraison?.longitude
      ? { lat: details.adresse_livraison.latitude, lng: details.adresse_livraison.longitude }
      : null
  ), [details])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

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

  const livree      = details.statut === 'livrée'
  const annulee     = details.statut === 'annulée'
  const enLivraison = details.statut === 'en_livraison'
  const refCourte   = details.id.slice(0, 8).toUpperCase()
  const afficherCarte = details.type === 'livraison' && !annulee && (restaurantPos || destinationPos)

  const tempsPrep = Math.max(
    ...(details.order_items ?? []).map(oi => oi.menu_item?.temps_preparation ?? 15),
    15
  )
  const estLivraison = details.type === 'livraison'
  const tempsTotal   = tempsPrep + (estLivraison ? 15 : 0)
  const heureCommande = new Date(details.created_at)
  const heurePrevue   = new Date(heureCommande.getTime() + tempsTotal * 60_000)

  // ETA dynamique : distance réelle livreur→domicile si on a une position live,
  // sinon estimation basée sur le temps de préparation.
  let etaLabel = heurePrevue.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  let etaSous = `Arrivée est. vers`
  if (enLivraison && livreurPos && destinationPos) {
    const km = distanceKm(livreurPos, destinationPos)
    const minutes = Math.max(1, Math.round((km / 22) * 60)) // ~22 km/h en ville
    etaLabel = minutes <= 1 ? '< 1 min' : `${minutes} min`
    etaSous = 'Arrivée estimée dans'
  }

  const statusTitle = annulee ? 'Commande annulée'
    : livree ? 'Commande livrée 🎉'
    : enLivraison ? 'Votre commande est en route'
    : details.statut === 'prête' ? 'Récupération en cours'
    : details.statut === 'en_préparation' ? 'En préparation'
    : details.statut === 'acceptée' ? 'Commande acceptée'
    : 'Commande envoyée'

  const statusSub = annulee ? 'Contactez le support si besoin'
    : livree ? "Bon appétit ! N'oubliez pas de laisser un avis"
    : details.livreur ? `${details.livreur.nom.split(' ')[0]} s'occupe de votre commande`
    : `${estLivraison ? 'Livraison' : 'Retrait'} · ${details.restaurant?.nom ?? ''}`

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── Carte (élément principal) ─────────────────────── */}
      {afficherCarte ? (
        <div className="relative">
          <LivreurMap
            restaurantPos={restaurantPos}
            destinationPos={destinationPos}
            livreurPos={enLivraison ? livreurPos : null}
            className="h-[38vh] min-h-[240px]"
          />
          <Link
            to="/mes-commandes"
            aria-label="Retour aux commandes"
            className="absolute top-4 left-4 z-[500] w-10 h-10 rounded-full bg-white shadow-card
                       flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          {enLivraison && (
            <div className="absolute top-4 right-4 z-[500] bg-white/90 backdrop-blur px-3 py-1.5
                            rounded-full shadow-card flex items-center gap-1.5">
              <LocateFixed className="w-3 h-3 text-brand-600 animate-pulse" />
              <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wide">En direct</span>
            </div>
          )}
        </div>
      ) : (
        <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
          <Link to="/mes-commandes" aria-label="Retour aux commandes">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-lg">Suivi commande</h1>
            <p className="text-xs text-gray-400">Réf. #{refCourte}</p>
          </div>
        </header>
      )}

      <div className={`bg-white rounded-t-3xl ${afficherCarte ? '-mt-5 relative z-10 shadow-card' : ''} px-4 pt-5 pb-2`}>
        {afficherCarte && <div className="w-9 h-1 rounded-full bg-gray-200 mx-auto mb-4" />}

        {/* ── Statut + ETA ──────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`font-black text-lg ${annulee ? 'text-red-600' : 'text-gray-900'}`}>{statusTitle}</h2>
            <p className="text-[13px] text-gray-500 mt-0.5 truncate">{statusSub}</p>
          </div>
          {!annulee && !livree && (
            <div className="text-right shrink-0">
              <p className="font-black text-xl text-brand-600 tabular-nums leading-none">{etaLabel}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{etaSous}</p>
            </div>
          )}
        </div>

        {enLivraison && livreurPos && (
          <BarreProgressionTrajet
            restaurantPos={restaurantPos}
            livreurPos={livreurPos}
            destinationPos={destinationPos}
          />
        )}

        {livree && (
          <button
            onClick={() => setSignalementOuvert(true)}
            disabled={dejaSignale}
            className="mt-2 text-xs font-semibold text-brand-600 underline
                       underline-offset-2 disabled:no-underline disabled:text-gray-400"
          >
            {dejaSignale ? 'Signalement envoyé ✓' : 'Un souci avec cette commande ?'}
          </button>
        )}

        {/* ── Fiche livreur ─────────────────────────────── */}
        {details.livreur && !annulee && (
          <div className="mt-4 flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-700
                            text-white grid place-items-center font-bold text-sm shrink-0 shadow-sm">
              {details.livreur.nom.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[13.5px] text-gray-900 truncate">{details.livreur.nom}</p>
              <p className="text-xs text-gray-500">🛵 Votre livreur</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href={`tel:${details.livreur.telephone}`}
                aria-label="Appeler le livreur"
                className="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center shadow-sm"
              >
                <Phone className="w-4 h-4" />
              </a>
              <button
                onClick={() => setChatOuvert(true)}
                aria-label="Envoyer un message"
                className="w-9 h-9 rounded-full bg-gray-900 text-white grid place-items-center shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <span>Commande <b className="text-gray-600 font-bold tabular-nums">#{refCourte}</b></span>
          {details.restaurant?.adresse && <span className="truncate max-w-[50%]">{details.restaurant.adresse}</span>}
        </div>

        {/* ── Timeline ──────────────────────────────────── */}
        {!annulee ? (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <Timeline statutActuel={details.statut} />
          </div>
        ) : (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-3xl mb-1">❌</p>
            <p className="text-sm text-red-600">Contactez le support pour plus d'infos.</p>
          </div>
        )}

        {/* ── Récapitulatif ─────────────────────────────── */}
        <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Résumé de la commande</h3>
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
          <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-gray-900">
            <span>Total payé</span>
            <span className="tabular-nums text-brand-700">
              {formatCurrency(details.montant_total + details.frais_livraison)}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Paiement : {details.mode_paiement === 'cash' ? 'Espèces' : 'Mobile Money'}
          </p>
        </div>

        {/* ── Actions ───────────────────────────────────── */}
        <div className="mt-5 space-y-3">
          {livree && (
            <Link
              to="/mes-commandes"
              className="block w-full text-center bg-brand-600 text-white font-bold py-4
                         rounded-xl hover:bg-brand-700 active:scale-[0.98] transition-all shadow-lg"
            >
              ⭐ Laisser un avis
            </Link>
          )}

          {!annulee && !details.livreur && (
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

          <button
            onClick={() => contacterSupport(`commande #${refCourte}`)}
            className="w-full flex items-center justify-center gap-2 bg-live-500 text-white
                       font-semibold py-3.5 rounded-xl hover:bg-live-600
                       active:scale-[0.98] transition-all"
          >
            <Phone className="w-4 h-4" />
            Contacter le support
          </button>
        </div>
      </div>

      {chatOuvert && user && (
        <ChatModal
          orderId={id}
          monRole="client"
          monId={user.id}
          titreChat={details.restaurant?.nom ?? 'Restaurant'}
          onClose={() => setChatOuvert(false)}
        />
      )}

      <Modal
        ouvert={signalementOuvert}
        onClose={() => setSignalementOuvert(false)}
        titre="Signaler un problème"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Décrivez ce qui ne va pas (rien reçu, plat manquant, erreur...).
            Notre équipe vous recontactera rapidement.
          </p>
          <textarea
            value={motifSignalement}
            onChange={e => setMotifSignalement(e.target.value)}
            placeholder="Ex : je n'ai rien reçu, le livreur n'est jamais venu..."
            rows={4}
            maxLength={1000}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          <button
            onClick={async () => {
              if (!motifSignalement.trim() || !user) return
              setEnvoiEnCours(true)
              const { error } = await reportOrderIssue(id, user.id, motifSignalement.trim())
              setEnvoiEnCours(false)
              if (error) {
                toast.error("Impossible d'envoyer le signalement.")
                return
              }
              toast.success('Signalement envoyé — notre équipe vous recontacte bientôt.')
              setDejaSignale(true)
              setSignalementOuvert(false)
              setMotifSignalement('')
            }}
            disabled={!motifSignalement.trim() || envoiEnCours}
            className="w-full flex items-center justify-center gap-2 bg-red-500 text-white
                       font-semibold py-3.5 rounded-xl hover:bg-red-600 active:scale-[0.98]
                       transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            <TriangleAlert className="w-4 h-4" />
            {envoiEnCours ? 'Envoi...' : 'Envoyer le signalement'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
