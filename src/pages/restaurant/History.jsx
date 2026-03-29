import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, ShoppingBag, Loader2, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { getHistoriqueRevenu, getAnalyticsData } from '@/services/menuService'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'

// ── Périodes prédéfinies ────────────────────────────────────
const PERIODES = [
  { id: 'today',   label: "Aujourd'hui" },
  { id: 'week',    label: '7 jours'     },
  { id: 'month',   label: '30 jours'    },
  { id: 'quarter', label: '3 mois'      },
]

function getPeriodeDates(periodeId) {
  const fin   = new Date(); fin.setHours(23, 59, 59, 999)
  const debut = new Date(); debut.setHours(0, 0, 0, 0)
  if (periodeId === 'week')    debut.setDate(debut.getDate() - 6)
  if (periodeId === 'month')   debut.setDate(debut.getDate() - 29)
  if (periodeId === 'quarter') debut.setDate(debut.getDate() - 89)
  return { debut: debut.toISOString(), fin: fin.toISOString() }
}

// ── Graphique barres générique (SVG) ───────────────────────
function Graphique({ donnees, couleur = '#E85D26', couleurFaible = '#f9c5a8', hauteur = 80 }) {
  if (!donnees.length) return null
  const max = Math.max(...donnees.map(d => d.val), 1)
  const W   = Math.max(18, Math.floor(260 / donnees.length) - 4)
  const GAP = donnees.length > 20 ? 2 : 5
  const L   = donnees.length * (W + GAP) - GAP

  return (
    <svg viewBox={`0 0 ${L} ${hauteur + 28}`} className="w-full" style={{ maxHeight: 110 }}>
      {donnees.map((d, i) => {
        const x = i * (W + GAP)
        const h = Math.max((d.val / max) * hauteur, d.val > 0 ? 4 : 2)
        const y = hauteur - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={W} height={h} rx={3}
              fill={d.actif ? couleur : couleurFaible} />
            <text x={x + W / 2} y={hauteur + 14} textAnchor="middle"
              fontSize="8" fill={d.actif ? couleur : '#9ca3af'}
              fontWeight={d.actif ? '700' : '400'}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Graphique CA par jour ───────────────────────────────────
function GraphiqueCA({ commandes, periodeId }) {
  const nbJours       = periodeId === 'today' ? 1 : periodeId === 'week' ? 7 : periodeId === 'month' ? 30 : 90
  const nbSlots       = Math.min(nbJours, periodeId === 'quarter' ? 12 : nbJours)
  const pasJours      = periodeId === 'quarter' ? Math.ceil(nbJours / 12) : 1
  const MOIS_ABBR     = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const today         = new Date(); today.setHours(0,0,0,0)

  const slots = Array.from({ length: nbSlots }, (_, i) => {
    const d = new Date(); d.setHours(0,0,0,0)
    d.setDate(d.getDate() - (nbSlots - 1 - i) * pasJours)
    const fin = new Date(d); fin.setDate(fin.getDate() + pasJours - 1)
    const label = nbJours <= 7
      ? ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]
      : nbJours <= 30 ? `${d.getDate()}` : MOIS_ABBR[d.getMonth()]
    return { debut: d, fin, val: 0, label, actif: d.getTime() === today.getTime() }
  })

  commandes.filter(c => c.statut === 'livrée').forEach(c => {
    const dc = new Date(c.created_at); dc.setHours(0,0,0,0)
    const idx = slots.findIndex(s => dc >= s.debut && dc <= s.fin)
    if (idx >= 0) slots[idx].val += (c.montant_total ?? 0) + (c.frais_livraison ?? 0)
  })

  return <Graphique donnees={slots} />
}

// ── Badge statut ────────────────────────────────────────────
function BadgeStatut({ statut }) {
  const info = STATUTS_COMMANDE[statut] ?? { label: statut, couleur: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${info.couleur}`}>
      {info.label}
    </span>
  )
}

// ── Ligne commande repliable ────────────────────────────────
function LigneCommande({ commande }) {
  const [ouvert, setOuvert] = useState(false)
  const montant  = (commande.montant_total ?? 0) + (commande.frais_livraison ?? 0)
  const date     = new Date(commande.created_at)
  const dateStr  = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const heureStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOuvert(v => !v)}
      >
        <div className="shrink-0 text-center w-10">
          <p className="text-xs font-bold text-gray-700">{dateStr}</p>
          <p className="text-[10px] text-gray-400">{heureStr}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {commande.client?.nom ?? 'Client'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <BadgeStatut statut={commande.statut} />
            <span className="text-xs text-gray-400">{commande.type === 'livraison' ? '🛵' : '🏪'}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-sm font-bold tabular-nums
            ${commande.statut === 'annulée' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {formatCurrency(montant)}
          </p>
          {ouvert
            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto mt-0.5" />
            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto mt-0.5" />}
        </div>
      </button>
      {ouvert && (
        <div className="px-4 pb-3 space-y-1 bg-gray-50">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Sous-total</span>
            <span className="tabular-nums">{formatCurrency(commande.montant_total ?? 0)}</span>
          </div>
          {(commande.frais_livraison ?? 0) > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Frais livraison</span>
              <span className="tabular-nums">{formatCurrency(commande.frais_livraison)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-semibold text-gray-700 pt-1 border-t border-gray-200">
            <span>Total encaissé</span>
            <span className="tabular-nums">{formatCurrency(montant)}</span>
          </div>
          <p className="text-[10px] text-gray-400 pt-0.5">
            {commande.mode_paiement === 'cash' ? '💵 Espèces' : '📱 Mobile Money'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Onglet Analytics ────────────────────────────────────────
function TabAnalytics({ restaurantId, periode }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { debut, fin } = getPeriodeDates(periode)
      const { data: d, error } = await getAnalyticsData(restaurantId, debut, fin)
      if (error) toast.error('Impossible de charger les analytics')
      else setData(d)
      setLoading(false)
    }
    charger()
  }, [restaurantId, periode])

  const analytics = useMemo(() => {
    // ── Top plats ──────────────────────────────────────
    const platsMap = {}
    data.forEach(cmd => {
      ;(cmd.order_items ?? []).forEach(item => {
        const id  = item.menu_item?.id  ?? 'inconnu'
        const nom = item.menu_item?.nom ?? 'Inconnu'
        if (!platsMap[id]) platsMap[id] = { nom, qte: 0, ca: 0 }
        platsMap[id].qte += item.quantite ?? 0
        platsMap[id].ca  += item.sous_total ?? 0
      })
    })
    const topPlats = Object.values(platsMap)
      .sort((a, b) => b.qte - a.qte)
      .slice(0, 5)

    // ── Heures de pointe (0–23) ────────────────────────
    const parHeure = Array.from({ length: 24 }, (_, h) => ({ val: 0, label: h % 3 === 0 ? `${h}h` : '', actif: false }))
    const heureActuelle = new Date().getHours()
    data.forEach(c => { parHeure[new Date(c.created_at).getHours()].val++ })
    parHeure[heureActuelle].actif = true

    // ── Jours de la semaine (0=Dim..6=Sam) ────────────
    const JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
    const parJour = JOURS.map((label, j) => ({
      val: 0, label, actif: j === new Date().getDay()
    }))
    data.forEach(c => { parJour[new Date(c.created_at).getDay()].val++ })

    // ── Taux annulation (sur toutes les commandes) ─────
    return { topPlats, parHeure, parJour }
  }, [data])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-12 text-center">
        <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-200" strokeWidth={1.5} />
        <p className="font-semibold text-gray-500">Pas assez de données</p>
        <p className="text-sm text-gray-400 mt-1">Les analytics apparaîtront après vos premières commandes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Top 5 plats ─────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-sm">Top plats vendus</h2>
        </div>
        {analytics.topPlats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {analytics.topPlats.map((plat, i) => {
              const max = analytics.topPlats[0].qte
              return (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                    text-xs font-black
                    ${i === 0 ? 'bg-yellow-400 text-white' :
                      i === 1 ? 'bg-gray-300 text-white' :
                      i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{plat.nom}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-400 rounded-full"
                          style={{ width: `${(plat.qte / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 shrink-0 tabular-nums">{plat.qte} vendus</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-500 shrink-0 tabular-nums">
                    {formatCurrency(plat.ca)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Heures de pointe ─────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <h2 className="font-bold text-gray-800 text-sm mb-3">Heures de pointe</h2>
        <Graphique donnees={analytics.parHeure} couleur="#6366f1" couleurFaible="#e0e7ff" />
        {(() => {
          const max = Math.max(...analytics.parHeure.map(h => h.val))
          if (max === 0) return null
          const heureMax = analytics.parHeure.findIndex(h => h.val === max)
          return (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Pic d'activité : <strong className="text-indigo-500">{heureMax}h–{heureMax + 1}h</strong>
              {' '}({max} commande{max > 1 ? 's' : ''})
            </p>
          )
        })()}
      </div>

      {/* ── Jours de la semaine ───────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <h2 className="font-bold text-gray-800 text-sm mb-3">Activité par jour</h2>
        <Graphique donnees={analytics.parJour} couleur="#10b981" couleurFaible="#d1fae5" />
        {(() => {
          const max = Math.max(...analytics.parJour.map(j => j.val))
          if (max === 0) return null
          const jourMax = analytics.parJour.find(j => j.val === max)
          return (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Jour le plus actif : <strong className="text-emerald-500">{jourMax?.label}</strong>
              {' '}({max} commande{max > 1 ? 's' : ''})
            </p>
          )
        })()}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Stats (Revenus + Analytics)
// ══════════════════════════════════════════════════════════
export default function History() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()

  const [onglet,    setOnglet]    = useState('revenus') // 'revenus' | 'analytics'
  const [periode,   setPeriode]   = useState('week')
  const [commandes, setCommandes] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!restaurant?.id || onglet !== 'revenus') return
    async function charger() {
      setLoading(true)
      const { debut, fin } = getPeriodeDates(periode)
      const { data, error } = await getHistoriqueRevenu(restaurant.id, debut, fin)
      if (error) toast.error("Impossible de charger l'historique")
      else setCommandes(data)
      setLoading(false)
    }
    charger()
  }, [restaurant?.id, periode, onglet])

  const kpis = useMemo(() => {
    const livrees  = commandes.filter(c => c.statut === 'livrée')
    const annulees = commandes.filter(c => c.statut === 'annulée')
    const caTotal  = livrees.reduce((s, c) => s + (c.montant_total ?? 0) + (c.frais_livraison ?? 0), 0)
    const panierMoy = livrees.length > 0 ? Math.round(caTotal / livrees.length) : 0
    const tauxAnnul = commandes.length > 0
      ? Math.round(annulees.length / commandes.length * 100) : 0
    return { caTotal, nbTotal: commandes.length, nbLivrees: livrees.length,
             annulees: annulees.length, panierMoy, tauxAnnul }
  }, [commandes])

  if (loadingResto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-0 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Finances</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5 mb-3">Statistiques</h1>

        {/* Onglets */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'revenus',   label: 'Revenus'   },
            { id: 'analytics', label: 'Analytics' },
          ].map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2
                ${onglet === o.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">

        {/* ── Sélecteur de période ─────────────────────── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {PERIODES.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriode(p.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors
                ${periode === p.id
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ── Onglet Revenus ────────────────────────────── */}
        {onglet === 'revenus' && (
          loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-brand-500 rounded-2xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 opacity-80" />
                    <p className="text-xs font-medium opacity-80">Chiffre d'affaires</p>
                  </div>
                  <p className="text-3xl font-black tabular-nums">{formatCurrency(kpis.caTotal)}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {kpis.nbLivrees} commande{kpis.nbLivrees !== 1 ? 's' : ''} livrée{kpis.nbLivrees !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card">
                  <p className="text-xs text-gray-500 font-medium">Panier moyen</p>
                  <p className="text-xl font-black text-gray-900 mt-1 tabular-nums">
                    {kpis.panierMoy > 0 ? formatCurrency(kpis.panierMoy) : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Par commande livrée</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-500 font-medium">Commandes</p>
                  </div>
                  <p className="text-xl font-black text-gray-900 tabular-nums">{kpis.nbTotal}</p>
                  {kpis.annulees > 0 && (
                    <p className="text-xs text-red-400 mt-0.5">
                      {kpis.annulees} annulée{kpis.annulees > 1 ? 's' : ''} ({kpis.tauxAnnul}%)
                    </p>
                  )}
                </div>
              </div>

              {/* Graphique CA */}
              {commandes.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-card">
                  <h2 className="font-bold text-gray-800 mb-3 text-sm">CA par jour — commandes livrées</h2>
                  <GraphiqueCA commandes={commandes} periodeId={periode} />
                </div>
              )}

              {/* Liste commandes */}
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-800 text-sm">Détail des commandes</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {commandes.length}
                  </span>
                </div>
                {commandes.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 text-sm">Aucune commande sur cette période</p>
                  </div>
                ) : (
                  commandes.map(c => <LigneCommande key={c.id} commande={c} />)
                )}
              </div>
            </>
          )
        )}

        {/* ── Onglet Analytics ─────────────────────────── */}
        {onglet === 'analytics' && restaurant?.id && (
          <TabAnalytics restaurantId={restaurant.id} periode={periode} />
        )}
      </div>
    </div>
  )
}
