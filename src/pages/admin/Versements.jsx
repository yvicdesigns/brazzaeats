import { useState, useEffect } from 'react'
import { Wallet, RefreshCw, CheckCircle, Clock, Loader2, ChevronDown, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { getVersements, genererVersementsSemaine, marquerVerse } from '@/services/adminService'
import { formatCurrency } from '@/utils/formatCurrency'

// ── Formatage date ─────────────────────────────────────────
function dateFR(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function periodeFR(debut, fin) {
  const d = new Date(debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const f = new Date(fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${d} → ${f}`
}

// ── Carte versement ────────────────────────────────────────
function CarteVersement({ versement, onMarquerVerse, loading }) {
  const [ouvert, setOuvert] = useState(false)
  const verse = versement.statut === 'versé'

  return (
    <div className="border-t border-gray-50 first:border-0">
      <button
        onClick={() => setOuvert(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Icône statut */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          verse ? 'bg-green-100' : 'bg-amber-100'
        }`}>
          {verse
            ? <CheckCircle className="w-4 h-4 text-green-600" />
            : <Clock className="w-4 h-4 text-amber-500" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 truncate">
            {versement.restaurant?.nom ?? '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {periodeFR(versement.periode_debut, versement.periode_fin)}
          </p>
        </div>

        <div className="text-right shrink-0 mr-2">
          <p className={`font-black text-sm tabular-nums ${verse ? 'text-green-600' : 'text-gray-800'}`}>
            {formatCurrency(versement.montant_net)}
          </p>
          <p className="text-[10px] text-gray-400">{versement.nb_commandes} cmd</p>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>

      {ouvert && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          <div className="pt-3 space-y-2">

            {/* Détail financier */}
            <div className="bg-white rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">CA brut</span>
                <span className="font-semibold text-gray-800 tabular-nums">{formatCurrency(versement.ca_brut)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Commission Zandofood</span>
                <span className="font-semibold text-red-400 tabular-nums">− {formatCurrency(versement.commission)}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-800">Net à verser</span>
                <span className="font-black text-green-600 tabular-nums">{formatCurrency(versement.montant_net)}</span>
              </div>
            </div>

            {/* Date versement si déjà versé */}
            {verse && versement.date_versement && (
              <p className="text-xs text-green-600 font-medium text-center">
                ✓ Versé le {dateFR(versement.date_versement)}
              </p>
            )}

            {/* Bouton marquer versé */}
            {!verse && (
              <button
                onClick={() => onMarquerVerse(versement.id)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           bg-green-500 text-white text-xs font-bold hover:bg-green-600
                           transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {loading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <CheckCircle className="w-3.5 h-3.5" />
                }
                Marquer comme versé
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Versements Admin
// ══════════════════════════════════════════════════════════
export default function AdminVersements() {
  const [versements,      setVersements]      = useState([])
  const [loading,         setLoading]         = useState(true)
  const [generating,      setGenerating]      = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [filtre,          setFiltre]          = useState('tous') // tous | en_attente | versé

  async function charger() {
    setLoading(true)
    const { data, error } = await getVersements(
      filtre !== 'tous' ? { statut: filtre } : {}
    )
    if (error) toast.error('Impossible de charger les versements')
    else setVersements(data)
    setLoading(false)
  }

  useEffect(() => { charger() }, [filtre])

  async function handleGenerer() {
    setGenerating(true)
    const { data: nb, error } = await genererVersementsSemaine()
    setGenerating(false)
    if (error) { toast.error('Erreur : ' + error); return }
    if (nb === 0) {
      toast('Aucun nouveau versement à générer (déjà fait ou aucune commande)', { icon: 'ℹ️' })
    } else {
      toast.success(`${nb} versement${nb > 1 ? 's' : ''} généré${nb > 1 ? 's' : ''}`)
      charger()
    }
  }

  async function handleMarquerVerse(id) {
    setActionLoadingId(id)
    const { data, error } = await marquerVerse(id)
    setActionLoadingId(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setVersements(prev =>
      prev.map(v => v.id === id ? { ...v, statut: 'versé', date_versement: data.date_versement } : v)
    )
    toast.success('Versement confirmé')
  }

  const totalEnAttente = versements
    .filter(v => v.statut === 'en_attente')
    .reduce((s, v) => s + v.montant_net, 0)

  const FILTRES = [
    { key: 'tous',       label: 'Tous' },
    { key: 'en_attente', label: 'En attente' },
    { key: 'versé',      label: 'Versés' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Versements</h1>
        {totalEnAttente > 0 && (
          <p className="text-xs text-amber-600 font-semibold mt-0.5">
            {formatCurrency(totalEnAttente)} en attente de versement
          </p>
        )}
      </header>

      <div className="px-4 pt-4 space-y-4">

        {/* Bouton générer + refresh */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerer}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                       bg-brand-500 text-white text-xs font-bold hover:bg-brand-600
                       transition-colors disabled:opacity-60"
          >
            {generating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Zap className="w-3.5 h-3.5" />
            }
            Générer semaine passée
          </button>
          <button
            onClick={charger}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-xl
                       bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filtres */}
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
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
        ) : versements.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
            <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm font-medium">Aucun versement</p>
            <p className="text-xs mt-1">
              Cliquez sur "Générer semaine passée" après chaque semaine
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {versements.map(v => (
              <CarteVersement
                key={v.id}
                versement={v}
                onMarquerVerse={handleMarquerVerse}
                loading={actionLoadingId === v.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
