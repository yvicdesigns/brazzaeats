import { useState, useEffect } from 'react'
import { Package, TrendingUp, Loader2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { getLivreurHistory } from '@/services/livreurService'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'

// ── Badge statut ───────────────────────────────────────────
function BadgeStatut({ statut }) {
  const cfg = STATUTS_COMMANDE[statut]
  if (!cfg) return null
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.couleur}`}>
      {cfg.label}
    </span>
  )
}

// ── Formatage date courte ──────────────────────────────────
function dateCourteFR(isoDate) {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ══════════════════════════════════════════════════════════
// Page Historique
// ══════════════════════════════════════════════════════════
export default function History() {
  const { user } = useAuth()

  const [livraisons, setLivraisons] = useState([])
  const [loading,    setLoading]    = useState(true)

  // ── Chargement ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    async function charger() {
      setLoading(true)
      const { data, error } = await getLivreurHistory(user.id)
      if (error) toast.error('Impossible de charger l\'historique')
      else       setLivraisons(data ?? [])
      setLoading(false)
    }

    charger()
  }, [user?.id])

  // ── Totaux calculés ────────────────────────────────────
  const livraisonsEffectuees = livraisons.filter(l => l.statut === 'livrée')
  const totalGains = livraisonsEffectuees.reduce(
    (s, l) => s + (l.frais_livraison ?? 0), 0
  )

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
        <p className="text-xs text-gray-400 font-medium">Livreur</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Historique</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {livraisons.length} livraison{livraisons.length !== 1 ? 's' : ''} au total
        </p>
      </header>

      <div className="px-4 pt-5 space-y-5">

        {/* ── Résumé global ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <div className="bg-brand-50 rounded-xl p-2.5 w-fit mb-2">
              <TrendingUp className="w-5 h-5 text-brand-500" strokeWidth={2} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Total gains</p>
            <p className="text-xl font-black text-brand-700 tabular-nums mt-0.5">
              {formatCurrency(totalGains)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <div className="bg-green-50 rounded-xl p-2.5 w-fit mb-2">
              <Package className="w-5 h-5 text-green-600" strokeWidth={2} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Livraisons effectuées</p>
            <p className="text-xl font-black text-green-700 mt-0.5">
              {livraisonsEffectuees.length}
            </p>
          </div>
        </div>

        {/* ── Liste des livraisons ─────────────────────────── */}
        {livraisons.length === 0
          ? (
            <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
              <p className="font-semibold text-gray-600">Aucune livraison pour l'instant</p>
              <p className="text-sm mt-1">
                Vos livraisons terminées apparaîtront ici.
              </p>
            </div>
          )
          : (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <ul className="divide-y divide-gray-50">
                {livraisons.map(livraison => (
                  <li key={livraison.id} className="px-4 py-3.5 flex items-center gap-3">
                    {/* Icône statut */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      STATUTS_COMMANDE[livraison.statut]?.couleurDot ?? 'bg-gray-300'
                    }`} />

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {livraison.restaurant?.nom ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {dateCourteFR(livraison.created_at)}
                        {livraison.adresse_livraison?.quartier && (
                          <> · {livraison.adresse_livraison.quartier}</>
                        )}
                      </p>
                    </div>

                    {/* Montant + statut */}
                    <div className="text-right shrink-0 space-y-1">
                      {livraison.statut === 'livrée' && (
                        <p className="text-sm font-black text-green-600 tabular-nums">
                          +{formatCurrency(livraison.frais_livraison ?? 0)}
                        </p>
                      )}
                      <BadgeStatut statut={livraison.statut} />
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )
        }
      </div>
    </div>
  )
}
