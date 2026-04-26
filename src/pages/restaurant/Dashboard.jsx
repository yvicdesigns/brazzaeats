import { useState, useEffect } from 'react'
import { TrendingUp, Clock, Star, Loader2, Wallet, CalendarCheck, ArrowDownToLine, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { getDashboardData } from '@/services/menuService'
import { getVersementsRestaurant } from '@/services/adminService'
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

  const [kpis,       setKpis]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [versements, setVersements] = useState([])

  useEffect(() => {
    if (!restaurant?.id) return

    async function charger() {
      setLoading(true)
      const [{ data, error }, { data: vers }] = await Promise.all([
        getDashboardData(restaurant.id),
        getVersementsRestaurant(restaurant.id),
      ])
      if (error) toast.error('Impossible de charger le tableau de bord')
      else       setKpis(data)
      setVersements(vers ?? [])
      setLoading(false)
    }

    charger()

    // Rafraîchissement toutes les 2 minutes
    const intervalle = setInterval(charger, 2 * 60 * 1000)

    // Rafraîchissement immédiat quand l'utilisateur revient sur l'onglet
    const onVisible = () => { if (!document.hidden) charger() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(intervalle)
      document.removeEventListener('visibilitychange', onVisible)
    }
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

        {/* ── Bilan financier semaine ─────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Bilan financier</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              Semaine en cours
            </span>
          </div>

          {/* Lignes CA / Commission / Net */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
                </div>
                <span className="text-sm text-gray-600">CA brut</span>
              </div>
              <span className="font-bold text-gray-900 tabular-nums">
                {formatCurrency(kpis?.caSemaineBrut ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span className="text-sm text-gray-600">
                  Commission Zandofood ({kpis?.commissionRate ?? 10}%)
                </span>
              </div>
              <span className="font-bold text-red-400 tabular-nums">
                − {formatCurrency(kpis?.commissionSemaine ?? 0)}
              </span>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-800">Net à percevoir</span>
              </div>
              <span className="font-black text-green-600 text-lg tabular-nums">
                {formatCurrency(kpis?.montantNetSemaine ?? 0)}
              </span>
            </div>
          </div>

          {/* Prochain versement */}
          <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-800">Prochain versement</p>
              <p className="text-xs text-green-600">
                Lundi{' '}
                {kpis?.prochainVersement
                  ? new Date(kpis.prochainVersement).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long',
                    })
                  : '—'}
              </p>
            </div>
            <span className="text-xs font-bold text-green-700 shrink-0">Hebdomadaire</span>
          </div>

          {kpis?.nbCommandesLivrees > 0 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Basé sur {kpis.nbCommandesLivrees} commande{kpis.nbCommandesLivrees > 1 ? 's' : ''} livrée{kpis.nbCommandesLivrees > 1 ? 's' : ''} cette semaine
            </p>
          )}
        </div>

        {/* ── Historique versements ───────────────────────── */}
        {versements.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <h2 className="font-bold text-gray-800 mb-3">Historique des versements</h2>
            <div className="space-y-2">
              {versements.map(v => {
                const verse = v.statut === 'versé'
                const d = new Date(v.periode_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                const f = new Date(v.periode_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      verse ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                      {verse
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <Clock className="w-4 h-4 text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{d} → {f}</p>
                      <p className="text-[11px] text-gray-400">{v.nb_commandes} commandes</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black tabular-nums ${verse ? 'text-green-600' : 'text-gray-800'}`}>
                        {formatCurrency(v.montant_net)}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        verse
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {verse ? 'Versé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
