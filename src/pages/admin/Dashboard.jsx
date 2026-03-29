import { useState, useEffect } from 'react'
import {
  ShoppingBag, TrendingUp, Percent, Users,
  Store, Loader2, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getAdminStats, getRecentOrders } from '@/services/adminService'
import { formatCurrency, formatCurrencyShort } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'

// ── Carte KPI ───────────────────────────────────────────────
function KpiCard({ titre, valeur, sousTitre, Icon, couleur = 'brand' }) {
  const palettes = {
    brand:  { bg: 'bg-brand-50',   icon: 'text-brand-500',  val: 'text-brand-700'  },
    green:  { bg: 'bg-green-50',   icon: 'text-green-600',  val: 'text-green-700'  },
    yellow: { bg: 'bg-yellow-50',  icon: 'text-yellow-600', val: 'text-yellow-700' },
    blue:   { bg: 'bg-blue-50',    icon: 'text-blue-600',   val: 'text-blue-700'   },
    purple: { bg: 'bg-purple-50',  icon: 'text-purple-600', val: 'text-purple-700' },
  }
  const p = palettes[couleur] ?? palettes.brand

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex items-start gap-4">
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

// ── Formatage date courte ──────────────────────────────────
function dateCourte(isoDate) {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ══════════════════════════════════════════════════════════
// Page Dashboard Admin
// ══════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [stats,          setStats]          = useState(null)
  const [dernieresCmd,   setDernieresCmd]   = useState([])
  const [loading,        setLoading]        = useState(true)

  // ── Chargement ─────────────────────────────────────────
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
    // Rafraîchissement toutes les 5 minutes
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

        {/* ── KPIs commandes & revenus ─────────────────────── */}
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
            titre="Commissions collectées"
            valeur={formatCurrencyShort(stats?.commissionTotal ?? 0)}
            sousTitre="Part plateforme"
            Icon={Percent}
            couleur="yellow"
          />
        </div>

        {/* ── KPIs utilisateurs ────────────────────────────── */}
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
              <Users className="w-4 h-4 text-orange-600" strokeWidth={2} />
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

        {/* ── 5 dernières commandes ────────────────────────── */}
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
