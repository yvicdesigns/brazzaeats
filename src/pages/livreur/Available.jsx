import { useState, useEffect, useCallback } from 'react'
import { MapPin, Clock, Loader2, RefreshCw, Navigation, Bike } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  getAvailableOrders,
  acceptDelivery,
  updatePosition,
  getActiveDelivery,
} from '@/services/livreurService'
import { formatCurrency } from '@/utils/formatCurrency'

// ── Durée depuis création ──────────────────────────────────
function dureeDepuis(isoDate) {
  const diff = Math.floor((Date.now() - new Date(isoDate)) / 60000)
  if (diff < 1)  return "À l'instant"
  if (diff < 60) return `Il y a ${diff} min`
  return `Il y a ${Math.floor(diff / 60)} h`
}

// ── Carte commande disponible ──────────────────────────────
function CarteCommande({ commande, onAccepter, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      {/* En-tête restaurant */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-gray-800 truncate">{commande.restaurant?.nom}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {commande.restaurant?.adresse ?? 'Adresse non renseignée'}
              </span>
            </p>
          </div>
          <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {dureeDepuis(commande.created_at)}
          </span>
        </div>
      </div>

      {/* Corps */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Adresse de livraison */}
        <div>
          <p className="text-xs text-gray-400 font-medium">Livrer à</p>
          <p className="text-sm text-gray-700 font-medium mt-0.5">
            {commande.adresse_livraison
              ? `${commande.adresse_livraison.rue ?? ''}, ${commande.adresse_livraison.quartier ?? ''}`.replace(/^, |, $/, '') || '—'
              : '—'
            }
          </p>
        </div>

        {/* Gain livreur */}
        <div className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2">
          <p className="text-xs text-green-700 font-medium">Votre gain</p>
          <p className="font-black text-green-700 tabular-nums text-sm">
            {formatCurrency(commande.frais_livraison ?? 0)}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => onAccepter(commande.id)}
          disabled={loading}
          className="w-full bg-brand-500 text-white rounded-xl py-3.5 text-sm font-bold
                     hover:bg-brand-600 transition-colors disabled:opacity-60
                     flex items-center justify-center gap-2 min-h-[52px]"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Bike className="w-4 h-4" />
          }
          Accepter cette livraison
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Commandes disponibles
// ══════════════════════════════════════════════════════════
export default function Available() {
  const { user } = useAuth()

  const [commandes,       setCommandes]       = useState([])
  const [commandeActive,  setCommandeActive]  = useState(null) // livraison déjà en cours
  const [loading,         setLoading]         = useState(true)
  const [acceptantId,     setAcceptantId]     = useState(null) // id en cours d'acceptation
  const [positionLoading, setPositionLoading] = useState(false)

  // ── Chargement ─────────────────────────────────────────
  const charger = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const [{ data: disponibles }, { data: active }] = await Promise.all([
      getAvailableOrders(),
      getActiveDelivery(user.id),
    ])
    setCommandes(disponibles ?? [])
    setCommandeActive(active ?? null)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { charger() }, [charger])

  // ── Accepter une livraison ─────────────────────────────
  async function handleAccepter(orderId) {
    if (!user?.id) return
    setAcceptantId(orderId)
    const { data, error } = await acceptDelivery(orderId, user.id)
    setAcceptantId(null)

    if (error) {
      toast.error("Impossible d'accepter : " + error)
      // La commande a peut-être déjà été prise : rafraîchir
      charger()
      return
    }

    toast.success('Livraison acceptée ! En route 🛵')
    setCommandeActive(data)
    setCommandes(prev => prev.filter(c => c.id !== orderId))
  }

  // ── Mettre à jour la position GPS (simulée) ────────────
  async function handleUpdatePosition() {
    if (!commandeActive) return
    setPositionLoading(true)

    // Coordonnées simulées autour du centre de Brazzaville
    const position = {
      lat: -4.2769 + (Math.random() - 0.5) * 0.05,
      lng: 15.2714 + (Math.random() - 0.5) * 0.05,
    }

    const { error } = await updatePosition(commandeActive.id, position)
    setPositionLoading(false)

    if (error) { toast.error('Erreur position : ' + error); return }
    toast.success(
      `Position mise à jour (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Livreur</p>
            <h1 className="text-xl font-black text-gray-900 mt-0.5">Commandes disponibles</h1>
            {!commandeActive && (
              <p className="text-xs text-gray-500 mt-0.5">
                {commandes.length} commande{commandes.length !== 1 ? 's' : ''} prête
                {commandes.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={charger}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Actualiser"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">

        {/* ── Livraison en cours ───────────────────────────── */}
        {commandeActive && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bike className="w-5 h-5 text-brand-500" strokeWidth={2} />
              <p className="font-bold text-brand-700 text-sm">Livraison en cours</p>
            </div>
            <p className="text-sm text-gray-700 font-semibold">{commandeActive.restaurant?.nom}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {commandeActive.adresse_livraison
                ? `${commandeActive.adresse_livraison.rue ?? ''}, ${commandeActive.adresse_livraison.quartier ?? ''}`.replace(/^, |, $/, '') || '—'
                : '—'
              }
            </p>

            {/* Bouton mise à jour position GPS simulée */}
            <button
              onClick={handleUpdatePosition}
              disabled={positionLoading}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-white border
                         border-brand-300 text-brand-600 rounded-xl py-3 text-sm font-semibold
                         hover:bg-brand-50 transition-colors disabled:opacity-60 min-h-[48px]"
            >
              {positionLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Navigation className="w-4 h-4" />
              }
              Mettre à jour ma position
            </button>

            <p className="text-xs text-gray-400 text-center mt-2">
              Livraison active — accédez au dashboard pour la confirmer.
            </p>
          </div>
        )}

        {/* ── Liste des commandes disponibles ─────────────── */}
        {!commandeActive && commandes.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-card text-center">
            <Bike className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="font-semibold text-gray-600">Aucune commande disponible</p>
            <p className="text-sm text-gray-400 mt-1">
              Les commandes prêtes à être récupérées apparaîtront ici.
            </p>
            <button
              onClick={charger}
              className="mt-4 text-brand-500 text-sm font-semibold hover:underline"
            >
              Actualiser
            </button>
          </div>
        )}

        {!commandeActive && commandes.map(cmd => (
          <CarteCommande
            key={cmd.id}
            commande={cmd}
            onAccepter={handleAccepter}
            loading={acceptantId === cmd.id}
          />
        ))}
      </div>
    </div>
  )
}
