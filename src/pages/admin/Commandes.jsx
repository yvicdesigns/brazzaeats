import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag, Loader2, RefreshCw, Clock,
  Phone, Store, User, Bike, XCircle, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getActiveOrders, annulerCommande } from '@/services/adminService'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'

const ORDRE_STATUTS = ['en_attente', 'acceptée', 'en_préparation', 'prête', 'en_livraison']

// ── Calcul temps écoulé ────────────────────────────────────
function tempsEcoule(isoDate) {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  if (diff < 60)  return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60).toString().padStart(2, '0')}`
}

// ── Couleur urgence (> 30min en attente = rouge) ───────────
function urgenceClass(statut, isoDate) {
  if (statut !== 'en_attente') return ''
  const min = (Date.now() - new Date(isoDate).getTime()) / 60000
  return min > 30 ? 'border-l-4 border-red-400' : min > 15 ? 'border-l-4 border-yellow-400' : ''
}

// ── Modal confirmation annulation ─────────────────────────
function ModalAnnulation({ commande, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Annuler cette commande ?</h3>
            <p className="text-sm text-gray-500 mt-1">
              {commande.restaurant?.nom} · {formatCurrency((commande.montant_total ?? 0) + (commande.frais_livraison ?? 0))}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold"
          >
            Garder
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold
                       disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Carte commande ─────────────────────────────────────────
function CarteCommande({ commande, onAnnuler, actionLoading }) {
  const [detail, setDetail] = useState(false)
  const cfg = STATUTS_COMMANDE[commande.statut] ?? {}
  const urgent = urgenceClass(commande.statut, commande.created_at)

  return (
    <div className={`border-t border-gray-50 first:border-0 ${urgent}`}>
      <button
        onClick={() => setDetail(d => !d)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Dot statut */}
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.couleurDot ?? 'bg-gray-300'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-800 truncate">
              {commande.restaurant?.nom ?? '—'}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.couleur ?? ''}`}>
              {cfg.label ?? commande.statut}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {commande.client?.nom ?? 'Client inconnu'}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-800 tabular-nums">
            {formatCurrency((commande.montant_total ?? 0) + (commande.frais_livraison ?? 0))}
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-0.5 justify-end mt-0.5">
            <Clock className="w-3 h-3" />
            {tempsEcoule(commande.created_at)}
          </p>
        </div>
      </button>

      {detail && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-2">
          <div className="pt-3 space-y-1.5">
            {commande.client?.telephone && (
              <p className="text-xs text-gray-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                {commande.client.nom} · <span className="font-medium">{commande.client.telephone}</span>
              </p>
            )}
            {commande.livreur ? (
              <p className="text-xs text-gray-600 flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-brand-400" />
                {commande.livreur.nom}
                {commande.livreur.telephone && (
                  <span className="font-medium">· {commande.livreur.telephone}</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5" />
                Aucun livreur assigné
              </p>
            )}
            {commande.commission > 0 && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                Commission : {formatCurrency(commande.commission)}
              </p>
            )}
          </div>

          <button
            onClick={() => onAnnuler(commande)}
            disabled={actionLoading}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                       bg-red-50 border border-red-200 text-red-600 text-xs font-bold
                       hover:bg-red-100 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <XCircle className="w-3.5 h-3.5" />
            Annuler cette commande
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Commandes Admin
// ══════════════════════════════════════════════════════════
export default function AdminCommandes() {
  const [commandes,      setCommandes]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [actionLoading,  setActionLoading]  = useState(false)
  const [filtreStatut,   setFiltreStatut]   = useState('tous')
  const [aAnnuler,       setAAnnuler]       = useState(null)
  const [dernierRefresh, setDernierRefresh] = useState(null)

  const charger = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await getActiveOrders()
    if (error) toast.error('Impossible de charger les commandes')
    else setCommandes(data)
    setDernierRefresh(new Date())
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    charger()
    // Auto-refresh toutes les 30 secondes
    const timer = setInterval(() => charger(true), 30 * 1000)
    return () => clearInterval(timer)
  }, [charger])

  async function confirmerAnnulation() {
    setActionLoading(true)
    const { error } = await annulerCommande(aAnnuler.id)
    setActionLoading(false)
    setAAnnuler(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setCommandes(prev => prev.filter(c => c.id !== aAnnuler.id))
    toast.success('Commande annulée')
  }

  // Grouper par statut dans l'ordre du flux
  const parStatut = {}
  ;(filtreStatut === 'tous' ? ORDRE_STATUTS : [filtreStatut]).forEach(s => {
    parStatut[s] = commandes.filter(c => c.statut === s)
  })

  const total = commandes.length

  // Labels des filtres avec compteur
  const FILTRES = [
    { key: 'tous', label: `Tous (${total})` },
    ...ORDRE_STATUTS.map(s => ({
      key: s,
      label: `${STATUTS_COMMANDE[s]?.label ?? s} (${commandes.filter(c => c.statut === s).length})`,
    })),
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Commandes actives</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {total} commande{total > 1 ? 's' : ''} en cours
          {dernierRefresh && (
            <span className="ml-2 text-gray-400">
              · Mis à jour {dernierRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </p>
      </header>

      <div className="px-4 pt-4 space-y-4">

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTRES.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltreStatut(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                filtreStatut === f.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => charger()}
            disabled={loading}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl
                       bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-card text-center text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm font-medium">Aucune commande active</p>
            <p className="text-xs mt-1">La plateforme est calme pour le moment.</p>
          </div>
        ) : (
          Object.entries(parStatut).map(([statut, liste]) => {
            if (liste.length === 0) return null
            const cfg = STATUTS_COMMANDE[statut] ?? {}
            return (
              <div key={statut}>
                {filtreStatut === 'tous' && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${cfg.couleurDot ?? 'bg-gray-300'}`} />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {cfg.label ?? statut} · {liste.length}
                    </p>
                  </div>
                )}
                <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                  {liste.map(cmd => (
                    <CarteCommande
                      key={cmd.id}
                      commande={cmd}
                      onAnnuler={setAAnnuler}
                      actionLoading={actionLoading && aAnnuler?.id === cmd.id}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {aAnnuler && (
        <ModalAnnulation
          commande={aAnnuler}
          onClose={() => setAAnnuler(null)}
          onConfirm={confirmerAnnulation}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
