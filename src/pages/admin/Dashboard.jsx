import { useState, useEffect } from 'react'
import {
  ShoppingBag, TrendingUp, TrendingDown, Percent, Users,
  Store, Loader2, Clock, Activity, Award, Bike,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getAdminStats, getRecentOrders } from '@/services/adminService'
import { formatCurrency, formatCurrencyShort } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'

const JOURS_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// ── Graphique 7 jours (SVG sans librairie) ─────────────────
function Graphique7j({ cmd7j }) {
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return { date: d, label: JOURS_ABBR[d.getDay()], nb: 0, estAujourdhui: i === 6 }
  })

  ;(cmd7j ?? []).forEach(c => {
    const dc = new Date(c.created_at)
    dc.setHours(0, 0, 0, 0)
    const idx = jours.findIndex(j => j.date.getTime() === dc.getTime())
    if (idx >= 0) jours[idx].nb++
  })

  const maxNb   = Math.max(...jours.map(j => j.nb), 1)
  const W_BARRE = 28
  const H_MAX   = 80
  const GAP     = 12
  const LARGEUR = jours.length * (W_BARRE + GAP) - GAP

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${H_MAX + 32}`}
      className="w-full"
      style={{ maxHeight: 120 }}
    >
      {jours.map((jour, i) => {
        const x      = i * (W_BARRE + GAP)
        const hBarre = Math.max((jour.nb / maxNb) * H_MAX, jour.nb > 0 ? 5 : 2)
        const y      = H_MAX - hBarre
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={W_BARRE} height={hBarre} rx={5}
              fill={jour.estAujourdhui ? '#E85D26' : '#f9c5a8'}
            />
            {jour.nb > 0 && (
              <text x={x + W_BARRE / 2} y={y - 5} textAnchor="middle"
                fontSize="10" fontWeight="600" fill="#374151">
                {jour.nb}
              </text>
            )}
            <text x={x + W_BARRE / 2} y={H_MAX + 14} textAnchor="middle"
              fontSize="9"
              fill={jour.estAujourdhui ? '#E85D26' : '#9ca3af'}
              fontWeight={jour.estAujourdhui ? '700' : '400'}>
              {jour.label}
            </text>
            {jour.estAujourdhui && (
              <circle cx={x + W_BARRE / 2} cy={H_MAX + 24} r={2.5} fill="#E85D26" />
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Carte KPI compacte ─────────────────────────────────────
function KpiCard({ titre, valeur, sousTitre, Icon, couleur = 'brand' }) {
  const palettes = {
    brand:  { bg: 'bg-brand-50',   icon: 'text-brand-500',  val: 'text-brand-700'  },
    green:  { bg: 'bg-green-50',   icon: 'text-green-600',  val: 'text-green-700'  },
    yellow: { bg: 'bg-yellow-50',  icon: 'text-yellow-600', val: 'text-yellow-700' },
    blue:   { bg: 'bg-blue-50',    icon: 'text-blue-600',   val: 'text-blue-700'   },
    purple: { bg: 'bg-purple-50',  icon: 'text-purple-600', val: 'text-purple-700' },
    orange: { bg: 'bg-orange-50',  icon: 'text-orange-600', val: 'text-orange-700' },
  }
  const p = palettes[couleur] ?? palettes.brand
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex items-start gap-3">
      <div className={`${p.bg} rounded-xl p-2.5 shrink-0`}>
        <Icon className={`w-5 h-5 ${p.icon}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{titre}</p>
        <p className={`text-xl font-black mt-0.5 tabular-nums ${p.val}`}>{valeur}</p>
        {sousTitre && <p className="text-xs text-gray-400 mt-0.5">{sousTitre}</p>}
      </div>
    </div>
  )
}

// ── Bloc période (Aujourd'hui / Semaine / Mois) ────────────
function BlocPeriode({ label, data, tendancePct }) {
  const tendancePositive = tendancePct !== null && tendancePct !== undefined && tendancePct >= 0
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
        {tendancePct !== null && tendancePct !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
            tendancePositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {tendancePositive
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            }
            {tendancePositive ? '+' : ''}{tendancePct}%
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-gray-400">Commandes</p>
          <p className="text-lg font-black text-gray-800 tabular-nums">{data.nb}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400">CA brut</p>
          <p className="text-lg font-black text-brand-600 tabular-nums">
            {formatCurrencyShort(data.revenu)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400">Commission</p>
          <p className="text-lg font-black text-green-600 tabular-nums">
            {formatCurrencyShort(data.commission)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Badge statut commande ──────────────────────────────────
function BadgeStatut({ statut }) {
  const cfg = STATUTS_COMMANDE[statut]
  if (!cfg) return <span className="text-xs text-gray-400">{statut}</span>
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.couleur}`}>
      {cfg.label}
    </span>
  )
}

function dateCourte(isoDate) {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ══════════════════════════════════════════════════════════
// Page Dashboard Admin
// ══════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [stats,        setStats]        = useState(null)
  const [dernieresCmd, setDernieresCmd] = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      const [{ data: s }, { data: cmds }] = await Promise.all([
        getAdminStats(),
        getRecentOrders(5),
      ])
      if (!s) toast.error('Impossible de charger les statistiques')
      setStats(s)
      setDernieresCmd(cmds ?? [])
      setLoading(false)
    }
    charger()
    const timer = setInterval(charger, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Tableau de bord</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </p>
      </header>

      <div className="px-4 pt-5 space-y-5">

        {/* ── Commandes actives (temps réel) ───────────────── */}
        {(stats?.commandesActives ?? 0) > 0 && (
          <div className="bg-brand-500 rounded-2xl px-4 py-4 flex items-center gap-4">
            <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
              <Activity className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white/80 text-xs font-medium">En ce moment</p>
              <p className="text-white text-xl font-black">
                {stats.commandesActives} commande{stats.commandesActives > 1 ? 's' : ''} en cours
              </p>
            </div>
          </div>
        )}

        {/* ── Aujourd'hui ──────────────────────────────────── */}
        <BlocPeriode
          label="Aujourd'hui"
          data={stats?.jour ?? { nb: 0, revenu: 0, commission: 0 }}
        />

        {/* ── Cette semaine (avec tendance) ────────────────── */}
        <BlocPeriode
          label="Cette semaine"
          data={stats?.semaine ?? { nb: 0, revenu: 0, commission: 0 }}
          tendancePct={stats?.tendancePct}
        />

        {/* ── Ce mois ──────────────────────────────────────── */}
        <BlocPeriode
          label="Ce mois"
          data={stats?.mois ?? { nb: 0, revenu: 0, commission: 0 }}
        />

        {/* ── Graphique 7 jours ─────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
            Activité — 7 derniers jours
          </p>
          <Graphique7j cmd7j={stats?.cmd7j} />
        </div>

        {/* ── Top restaurants cette semaine ─────────────────── */}
        {(stats?.topRestaurants ?? []).length > 0 && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Award className="w-4 h-4 text-yellow-500" strokeWidth={2} />
              <h2 className="font-bold text-gray-800 text-sm">Top restaurants — cette semaine</h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {stats.topRestaurants.map((r, i) => (
                <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700'
                    : i === 1 ? 'bg-gray-100 text-gray-600'
                    : 'bg-orange-50 text-orange-600'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{r.nom}</p>
                    <p className="text-xs text-gray-400">{r.nb} commande{r.nb > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-brand-600 tabular-nums shrink-0">
                    {formatCurrencyShort(r.ca)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── KPIs all-time ─────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">
            Totaux cumulés
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              titre="Commandes totales"
              valeur={stats?.totalCommandes ?? 0}
              sousTitre="Toutes plateformes"
              Icon={ShoppingBag}
              couleur="brand"
            />
            <KpiCard
              titre="Revenu total"
              valeur={formatCurrencyShort(stats?.revenuTotal ?? 0)}
              sousTitre="Commandes livrées"
              Icon={TrendingUp}
              couleur="green"
            />
            <KpiCard
              titre="Commissions"
              valeur={formatCurrencyShort(stats?.commissionTotal ?? 0)}
              sousTitre="Part plateforme"
              Icon={Percent}
              couleur="yellow"
            />
          </div>
        </div>

        {/* ── Utilisateurs ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 shadow-card text-center">
            <div className="bg-blue-50 rounded-xl p-2 w-fit mx-auto mb-1.5">
              <Users className="w-4 h-4 text-blue-600" strokeWidth={2} />
            </div>
            <p className="text-lg font-black text-blue-700">{stats?.totalClients ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">Clients</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-card text-center">
            <div className="bg-orange-50 rounded-xl p-2 w-fit mx-auto mb-1.5">
              <Bike className="w-4 h-4 text-orange-600" strokeWidth={2} />
            </div>
            <p className="text-lg font-black text-orange-700">{stats?.totalLivreurs ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">Livreurs</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-card text-center">
            <div className="bg-purple-50 rounded-xl p-2 w-fit mx-auto mb-1.5">
              <Store className="w-4 h-4 text-purple-600" strokeWidth={2} />
            </div>
            <p className="text-lg font-black text-purple-700">{stats?.totalRestaurants ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">Restaurants</p>
          </div>
        </div>

        {/* ── Dernières commandes ──────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Dernières commandes</h2>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Toutes plateformes
            </span>
          </div>
          {dernieresCmd.length === 0
            ? (
              <div className="py-8 text-center text-gray-400">
                <p className="text-sm">Aucune commande enregistrée</p>
              </div>
            )
            : (
              <ul className="divide-y divide-gray-50">
                {dernieresCmd.map(cmd => (
                  <li key={cmd.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {cmd.restaurant?.nom ?? '—'}
                        </p>
                        <BadgeStatut statut={cmd.statut} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cmd.client?.nom ?? 'Client inconnu'} · {dateCourte(cmd.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800 tabular-nums">
                        {formatCurrency((cmd.montant_total ?? 0) + (cmd.frais_livraison ?? 0))}
                      </p>
                      {cmd.commission > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          +{formatCurrency(cmd.commission)} comm.
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

      </div>
    </div>
  )
}
