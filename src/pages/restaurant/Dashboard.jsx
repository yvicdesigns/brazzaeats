import { useState, useEffect } from 'react'
import { TrendingUp, Clock, Star, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { getDashboardData } from '@/services/menuService'
import { formatCurrency, formatCurrencyShort } from '@/utils/formatCurrency'

// Noms des jours en français abrégés, indexés de 0 (dim) à 6 (sam)
const JOURS_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// ── Graphique à barres SVG (sans librairie externe) ────────
function GraphiqueCommandes({ commandesBrutes }) {
  // Construire les 7 derniers jours
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return { date: d, label: JOURS_ABBR[d.getDay()], total: 0, ca: 0, estAujourdhui: i === 6 }
  })

  // Agréger les commandes par jour
  ;(commandesBrutes ?? []).forEach(c => {
    const dc = new Date(c.created_at)
    dc.setHours(0, 0, 0, 0)
    const idx = jours.findIndex(j => j.date.getTime() === dc.getTime())
    if (idx >= 0) {
      jours[idx].total++
      jours[idx].ca += (c.montant_total ?? 0) + (c.frais_livraison ?? 0)
    }
  })

  const maxTotal   = Math.max(...jours.map(j => j.total), 1)
  const W_BARRE    = 28
  const H_MAX      = 90
  const GAP        = 12
  const LARGEUR    = jours.length * (W_BARRE + GAP) - GAP

  return (
    <div>
      <svg
        viewBox={`0 0 ${LARGEUR} ${H_MAX + 36}`}
        className="w-full"
        style={{ maxHeight: 130 }}
        aria-label="Graphique des commandes de la semaine"
      >
        {jours.map((jour, i) => {
          const x      = i * (W_BARRE + GAP)
          const hBarre = Math.max((jour.total / maxTotal) * H_MAX, jour.total > 0 ? 5 : 2)
          const y      = H_MAX - hBarre

          return (
            <g key={i}>
              {/* Barre */}
              <rect
                x={x} y={y}
                width={W_BARRE} height={hBarre}
                rx={5}
                fill={jour.estAujourdhui ? '#E85D26' : '#f9c5a8'}
              />
              {/* Valeur au-dessus */}
              {jour.total > 0 && (
                <text
                  x={x + W_BARRE / 2} y={y - 5}
                  textAnchor="middle"
                  fontSize="10" fontWeight="600" fill="#374151"
                >
                  {jour.total}
                </text>
              )}
              {/* Label jour */}
              <text
                x={x + W_BARRE / 2} y={H_MAX + 16}
                textAnchor="middle"
                fontSize="9"
                fill={jour.estAujourdhui ? '#E85D26' : '#9ca3af'}
                fontWeight={jour.estAujourdhui ? '700' : '400'}
              >
                {jour.label}
              </text>
              {/* Indicateur "aujourd'hui" */}
              {jour.estAujourdhui && (
                <circle cx={x + W_BARRE / 2} cy={H_MAX + 26} r={2.5} fill="#E85D26" />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Carte KPI ───────────────────────────────────────────────
function KpiCard({ titre, valeur, sousTitre, Icon, couleur = 'brand' }) {
  const couleurs = {
    brand:  { bg: 'bg-brand-50',  icon: 'text-brand-500',  titre: 'text-brand-700'  },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  titre: 'text-green-700'  },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', titre: 'text-yellow-700' },
  }
  const c = couleurs[couleur]

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex items-start gap-4">
      <div className={`${c.bg} rounded-xl p-2.5 shrink-0`}>
        <Icon className={`w-5 h-5 ${c.icon}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{titre}</p>
        <p className={`text-xl font-black mt-0.5 ${c.titre} tabular-nums`}>{valeur}</p>
        {sousTitre && <p className="text-xs text-gray-400 mt-0.5">{sousTitre}</p>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Dashboard
// ══════════════════════════════════════════════════════════
export default function Dashboard() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()

  const [kpis,    setKpis]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurant?.id) return

    async function charger() {
      setLoading(true)
      const { data, error } = await getDashboardData(restaurant.id)
      if (error) toast.error('Impossible de charger le tableau de bord')
      else       setKpis(data)
      setLoading(false)
    }

    charger()

    // Rafraîchissement toutes les 2 minutes
    const intervalle = setInterval(charger, 2 * 60 * 1000)
    return () => clearInterval(intervalle)
  }, [restaurant?.id])

  if (loadingResto || loading) {
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
        <p className="text-xs text-gray-400 font-medium">Tableau de bord</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5 truncate">
          {restaurant?.nom ?? 'Mon restaurant'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </p>
      </header>

      <div className="px-4 pt-5 space-y-5">

        {/* ── KPIs ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            titre="CA aujourd'hui"
            valeur={formatCurrencyShort(kpis?.caJour ?? 0)}
            sousTitre="Commandes livrées"
            Icon={TrendingUp}
            couleur="brand"
          />
          <KpiCard
            titre="Commandes actives"
            valeur={kpis?.commandesActives ?? 0}
            sousTitre="En cours de traitement"
            Icon={Clock}
            couleur="green"
          />
          <KpiCard
            titre="Note moyenne"
            valeur={kpis?.noteMoyenne != null ? `★ ${Number(kpis.noteMoyenne).toFixed(1)}` : '—'}
            sousTitre="Sur 5 étoiles"
            Icon={Star}
            couleur="yellow"
          />
        </div>

        {/* ── Graphique semaine ───────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Commandes — 7 derniers jours</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {(kpis?.commandesSemaine ?? []).length} total
            </span>
          </div>
          <GraphiqueCommandes commandesBrutes={kpis?.commandesSemaine ?? []} />
        </div>

        {/* ── CA de la semaine ────────────────────────────── */}
        {kpis?.commandesSemaine?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <h2 className="font-bold text-gray-800 mb-3">CA semaine (estimé)</h2>
            <p className="text-3xl font-black text-brand-500 tabular-nums">
              {formatCurrency(
                kpis.commandesSemaine
                  .filter(c => c.statut === 'livrée')
                  .reduce((s, c) => s + (c.montant_total ?? 0) + (c.frais_livraison ?? 0), 0)
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">Commandes livrées uniquement</p>
          </div>
        )}
      </div>
    </div>
  )
}
