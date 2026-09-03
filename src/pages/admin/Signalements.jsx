import { useState, useEffect } from 'react'
import { TriangleAlert, CheckCircle2, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllSignalements, toggleSignalementStatut } from '@/services/adminService'

// ── Carte signalement ────────────────────────────────────────
function CarteSignalement({ signalement, onToggleStatut, loading }) {
  const traite = signalement.statut === 'traité'
  return (
    <div className={`border-t border-gray-50 first:border-0 px-4 py-4 ${traite ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0
                        ${traite ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-500'}`}>
          <TriangleAlert className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-800">
              {signalement.client?.nom ?? 'Client inconnu'}
              <span className="text-gray-400 font-normal"> · {signalement.client?.telephone}</span>
            </p>
            <span className="text-xs text-gray-400 shrink-0">
              {new Date(signalement.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <p className="text-xs text-brand-500 font-medium mt-0.5">
            {signalement.order?.restaurant?.nom ?? '—'} · Commande #{signalement.order_id?.slice(0, 8).toUpperCase()}
          </p>

          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            "{signalement.motif}"
          </p>

          <button
            onClick={() => onToggleStatut(signalement.id, traite ? 'ouvert' : 'traité')}
            disabled={loading}
            className={`mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl
                       transition-colors disabled:opacity-60 ${
              traite
                ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {loading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : traite
                ? <RotateCcw className="w-3 h-3" />
                : <CheckCircle2 className="w-3 h-3" />
            }
            {traite ? 'Rouvrir' : 'Marquer traité'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Signalements Admin
// ══════════════════════════════════════════════════════════
export default function AdminSignalements() {
  const [signalements,    setSignalements]    = useState([])
  const [loading,         setLoading]         = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [filtre,          setFiltre]          = useState('ouvert') // ouvert | traité | tous

  async function charger() {
    setLoading(true)
    const opts = filtre === 'tous' ? {} : { statut: filtre }
    const { data, error } = await getAllSignalements(opts)
    if (error) toast.error('Impossible de charger les signalements')
    else setSignalements(data)
    setLoading(false)
  }

  useEffect(() => { charger() }, [filtre])

  async function handleToggleStatut(id, statut) {
    setActionLoadingId(id)
    const { data, error } = await toggleSignalementStatut(id, statut)
    setActionLoadingId(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setSignalements(prev => prev.map(s => s.id === id ? { ...s, statut: data.statut } : s))
    toast.success(statut === 'traité' ? 'Signalement traité' : 'Signalement rouvert')
  }

  const nbOuverts = signalements.filter(s => s.statut === 'ouvert').length

  const FILTRES = [
    { key: 'ouvert', label: 'Ouverts' },
    { key: 'traité', label: 'Traités' },
    { key: 'tous',   label: 'Tous' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Signalements clients</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {signalements.length} signalement{signalements.length > 1 ? 's' : ''}
          {nbOuverts > 0 && (
            <span className="ml-2 text-red-500 font-semibold">{nbOuverts} ouvert{nbOuverts > 1 ? 's' : ''}</span>
          )}
        </p>
      </header>

      <div className="px-4 pt-4 space-y-4">

        {/* Filtres + refresh */}
        <div className="flex gap-2">
          {FILTRES.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltre(f.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                filtre === f.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={charger}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-xl
                       bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
        ) : signalements.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
            <TriangleAlert className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm font-medium">Aucun signalement</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {signalements.map(s => (
              <CarteSignalement
                key={s.id}
                signalement={s}
                onToggleStatut={handleToggleStatut}
                loading={actionLoadingId === s.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
