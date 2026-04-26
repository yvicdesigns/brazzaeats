import { useState, useEffect } from 'react'
import { Star, Eye, EyeOff, Loader2, MessageSquare, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllReviews, toggleReviewMasque } from '@/services/adminService'

// ── Étoiles ────────────────────────────────────────────────
function Etoiles({ note }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= note ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
          strokeWidth={0}
        />
      ))}
    </div>
  )
}

// ── Carte avis ─────────────────────────────────────────────
function CarteAvis({ avis, onToggleMasque, loading }) {
  const masque = avis.masque
  return (
    <div className={`border-t border-gray-50 first:border-0 ${masque ? 'opacity-50' : ''}`}>
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center
                          justify-center text-sm font-bold shrink-0">
            {(avis.client?.nom ?? '?')[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Nom + restaurant */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-semibold text-sm text-gray-800 truncate">
                {avis.client?.nom ?? 'Client inconnu'}
              </p>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(avis.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
            <p className="text-xs text-brand-500 font-medium mt-0.5 truncate">
              {avis.restaurant?.nom ?? '—'}
            </p>

            {/* Note + commentaire */}
            <div className="mt-2 flex items-center gap-2">
              <Etoiles note={avis.note} />
              <span className="text-xs font-bold text-gray-700">{avis.note}/5</span>
              {masque && (
                <span className="text-[10px] font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full">
                  Masqué
                </span>
              )}
            </div>

            {avis.commentaire && (
              <p className="mt-2 text-xs text-gray-600 leading-relaxed line-clamp-3">
                "{avis.commentaire}"
              </p>
            )}

            {/* Action */}
            <button
              onClick={() => onToggleMasque(avis.id, !masque)}
              disabled={loading}
              className={`mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl
                         transition-colors disabled:opacity-60 ${
                masque
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {loading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : masque
                  ? <Eye className="w-3 h-3" />
                  : <EyeOff className="w-3 h-3" />
              }
              {masque ? 'Afficher l\'avis' : 'Masquer l\'avis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════���═════════════════════════
// Page Avis Admin
// ══════════════════════════════════════════════════════════
export default function AdminAvis() {
  const [avis,           setAvis]           = useState([])
  const [loading,        setLoading]        = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [filtre,         setFiltre]         = useState('tous') // tous | visibles | masqués

  async function charger() {
    setLoading(true)
    const opts = filtre === 'visibles' ? { masque: false }
               : filtre === 'masqués'  ? { masque: true }
               : {}
    const { data, error } = await getAllReviews(opts)
    if (error) toast.error('Impossible de charger les avis')
    else setAvis(data)
    setLoading(false)
  }

  useEffect(() => { charger() }, [filtre])

  async function handleToggleMasque(id, masque) {
    setActionLoadingId(id)
    const { data, error } = await toggleReviewMasque(id, masque)
    setActionLoadingId(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setAvis(prev => prev.map(a => a.id === id ? { ...a, masque: data.masque } : a))
    toast.success(masque ? 'Avis masqué' : 'Avis affiché')
  }

  const nbMasques  = avis.filter(a => a.masque).length
  const noteMoy    = avis.length
    ? (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1)
    : '—'

  const FILTRES = [
    { key: 'tous',     label: 'Tous' },
    { key: 'visibles', label: 'Visibles' },
    { key: 'masqués',  label: 'Masqués' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────��───────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Avis clients</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {avis.length} avis · Note moyenne {noteMoy}/5
          {nbMasques > 0 && (
            <span className="ml-2 text-red-500 font-semibold">{nbMasques} masqué{nbMasques > 1 ? 's' : ''}</span>
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
        ) : avis.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm font-medium">Aucun avis</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {avis.map(a => (
              <CarteAvis
                key={a.id}
                avis={a}
                onToggleMasque={handleToggleMasque}
                loading={actionLoadingId === a.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
