import { useState, useEffect, useCallback, useRef } from 'react'
import {
  History, Search, Loader2, ChevronDown, X,
  TrendingUp, ShoppingBag, Percent, CalendarRange,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllOrders } from '@/services/adminService'
import { formatCurrency, formatCurrencyShort } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'

const PAGE_SIZE = 20

// Raccourcis de période
const PERIODES = [
  { key: 'today',   label: "Aujourd'hui" },
  { key: 'week',    label: 'Cette semaine' },
  { key: 'month',   label: 'Ce mois' },
  { key: 'custom',  label: 'Personnalisé' },
]

function getPeriodeDates(key) {
  const now = new Date()
  if (key === 'today') {
    return {
      dateDebut: now.toISOString().slice(0, 10),
      dateFin:   now.toISOString().slice(0, 10),
    }
  }
  if (key === 'week') {
    const lundi = new Date(now)
    lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    return {
      dateDebut: lundi.toISOString().slice(0, 10),
      dateFin:   now.toISOString().slice(0, 10),
    }
  }
  if (key === 'month') {
    return {
      dateDebut: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      dateFin:   now.toISOString().slice(0, 10),
    }
  }
  return { dateDebut: '', dateFin: '' }
}

// ── Badge statut ───────────────────────────────────────────
function BadgeStatut({ statut }) {
  const cfg = STATUTS_COMMANDE[statut]
  if (!cfg) return <span className="text-xs text-gray-400">{statut}</span>
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.couleur}`}>
      {cfg.label}
    </span>
  )
}

// ── Formatage date ─────────────────────────────────────────
function dateFR(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Carte commande dépliable ───────────────────────────────
function CarteCommande({ cmd }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="border-t border-gray-50 first:border-0">
      <button
        onClick={() => setOuvert(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-800 truncate">
              {cmd.restaurant?.nom ?? '—'}
            </p>
            <BadgeStatut statut={cmd.statut} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {cmd.client?.nom ?? 'Client inconnu'} · {dateFR(cmd.created_at)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-800 tabular-nums">
            {formatCurrency((cmd.montant_total ?? 0) + (cmd.frais_livraison ?? 0))}
          </p>
          {cmd.commission > 0 && (
            <p className="text-xs text-green-600 font-medium tabular-nums">
              +{formatCurrency(cmd.commission)}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${ouvert ? 'rotate-180' : ''}`}
        />
      </button>

      {ouvert && (
        <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 space-y-1.5">
          <p className="text-xs text-gray-400 break-all">
            <span className="font-medium text-gray-500">ID :</span> {cmd.id}
          </p>
          {cmd.client?.telephone && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Tél :</span> {cmd.client.telephone}
            </p>
          )}
          <p className="text-xs text-gray-600">
            <span className="font-medium">Mode :</span>{' '}
            {cmd.type === 'retrait' ? 'Retrait sur place' : 'Livraison'} ·{' '}
            {cmd.mode_paiement === 'cash' ? 'Espèces' : 'Mobile Money'}
          </p>
          <div className="pt-1 flex gap-4 text-xs text-gray-500">
            <span>Sous-total : <strong className="text-gray-700">{formatCurrency(cmd.montant_total ?? 0)}</strong></span>
            <span>Frais : <strong className="text-gray-700">{formatCurrency(cmd.frais_livraison ?? 0)}</strong></span>
            <span>Commission : <strong className="text-green-700">{formatCurrency(cmd.commission ?? 0)}</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Historique Admin
// ══════════════════════════════════════════════════════════
export default function AdminHistorique() {
  const [commandes,   setCommandes]   = useState([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page,        setPage]        = useState(0)

  const [statut,      setStatut]      = useState('tous')
  const [periode,     setPeriode]     = useState('month')
  const [dateDebut,   setDateDebut]   = useState(() => getPeriodeDates('month').dateDebut)
  const [dateFin,     setDateFin]     = useState(() => getPeriodeDates('month').dateFin)
  const [recherche,   setRecherche]   = useState('')
  const rechercheRef = useRef('')

  // Agrégats calculés côté client sur les résultats chargés
  const livrees   = commandes.filter(c => c.statut === 'livrée')
  const caTotal   = livrees.reduce((s, c) => s + (c.montant_total ?? 0) + (c.frais_livraison ?? 0), 0)
  const commTotal = livrees.reduce((s, c) => s + (c.commission ?? 0), 0)

  const charger = useCallback(async (reset = true) => {
    const p = reset ? 0 : page
    if (reset) {
      setLoading(true)
      setCommandes([])
      setPage(0)
    } else {
      setLoadingMore(true)
    }

    const { data, total: t, error } = await getAllOrders({
      statut,
      dateDebut: dateDebut || null,
      dateFin:   dateFin   || null,
      recherche: rechercheRef.current,
      page:      p,
      pageSize:  PAGE_SIZE,
    })

    if (error) toast.error('Impossible de charger les commandes')
    else {
      setCommandes(prev => reset ? data : [...prev, ...data])
      setTotal(t)
      if (!reset) setPage(p + 1)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [statut, dateDebut, dateFin, page])

  // Rechargement sur changement de filtre
  useEffect(() => {
    charger(true)
  }, [statut, dateDebut, dateFin])

  // Recherche avec debounce léger
  useEffect(() => {
    rechercheRef.current = recherche
    const t = setTimeout(() => charger(true), 350)
    return () => clearTimeout(t)
  }, [recherche])

  function handlePeriode(key) {
    setPeriode(key)
    if (key !== 'custom') {
      const { dateDebut: d, dateFin: f } = getPeriodeDates(key)
      setDateDebut(d)
      setDateFin(f)
    }
  }

  const STATUTS_FILTRES = [
    { key: 'tous',    label: 'Tous' },
    { key: 'livrée',  label: 'Livrées' },
    { key: 'annulée', label: 'Annulées' },
    { key: 'en_attente',    label: 'En attente' },
    { key: 'en_livraison',  label: 'En livraison' },
  ]

  const hasMore = commandes.length < total

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Historique commandes</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {total} résultat{total > 1 ? 's' : ''}
        </p>
      </header>

      <div className="px-4 pt-4 space-y-3">

        {/* ── Raccourcis période ──────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PERIODES.map(p => (
            <button
              key={p.key}
              onClick={() => handlePeriode(p.key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                periode === p.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ── Sélecteurs de date (mode personnalisé) ───────── */}
        {periode === 'custom' && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-medium block mb-1">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={e => setDateDebut(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-medium block mb-1">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={e => setDateFin(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
              />
            </div>
          </div>
        )}

        {/* ── Filtre statut ────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUTS_FILTRES.map(s => (
            <button
              key={s.key}
              onClick={() => setStatut(s.key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statut === s.key
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Recherche ───────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Restaurant ou client…"
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          {recherche && (
            <button
              onClick={() => setRecherche('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* ── Agrégats période ─────────────────────────────── */}
        {!loading && livrees.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 shadow-card text-center">
              <div className="bg-brand-50 rounded-lg p-1.5 w-fit mx-auto mb-1">
                <ShoppingBag className="w-3.5 h-3.5 text-brand-500" strokeWidth={2} />
              </div>
              <p className="text-base font-black text-brand-700 tabular-nums">{livrees.length}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Livrées</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-card text-center">
              <div className="bg-green-50 rounded-lg p-1.5 w-fit mx-auto mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" strokeWidth={2} />
              </div>
              <p className="text-base font-black text-green-700 tabular-nums">{formatCurrencyShort(caTotal)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">CA brut</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-card text-center">
              <div className="bg-yellow-50 rounded-lg p-1.5 w-fit mx-auto mb-1">
                <Percent className="w-3.5 h-3.5 text-yellow-600" strokeWidth={2} />
              </div>
              <p className="text-base font-black text-yellow-700 tabular-nums">{formatCurrencyShort(commTotal)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Commission</p>
            </div>
          </div>
        )}

        {/* ── Liste ─────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
        ) : commandes.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-card text-center text-gray-400">
            <CalendarRange className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm font-medium">Aucune commande sur cette période</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              {commandes.map(cmd => (
                <CarteCommande key={cmd.id} cmd={cmd} />
              ))}
            </div>

            {/* ── Charger plus ─────────────────────────────── */}
            {hasMore && (
              <button
                onClick={() => charger(false)}
                disabled={loadingMore}
                className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-600
                           text-sm font-semibold hover:bg-gray-50 transition-colors
                           disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingMore
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : `Charger plus (${total - commandes.length} restantes)`
                }
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
