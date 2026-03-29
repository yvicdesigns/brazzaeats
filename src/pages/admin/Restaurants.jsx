import { useState, useEffect } from 'react'
import {
  Store, CheckCircle, XCircle, Loader2, Search,
  ChevronDown, Pencil, Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAllRestaurants,
  updateRestaurantStatus,
  updateCommissionRate,
} from '@/services/adminService'
import { STATUTS_RESTAURANT } from '@/utils/constants'

// ── Onglets filtrage par statut ────────────────────────────
const FILTRES = [
  { key: 'tous',       label: 'Tous'        },
  { key: 'en_attente', label: 'En attente'  },
  { key: 'actif',      label: 'Actifs'      },
  { key: 'suspendu',   label: 'Suspendus'   },
]

// ── Badge statut restaurant ────────────────────────────────
function BadgeStatut({ statut }) {
  const cfg = STATUTS_RESTAURANT[statut] ?? { label: statut, couleur: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.couleur}`}>
      {cfg.label}
    </span>
  )
}

// ── Modale modification commission ────────────────────────
function ModaleCommission({ restaurant, onSave, onClose }) {
  const [taux,   setTaux]   = useState(restaurant.commission_rate ?? 10)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const val = Number(taux)
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('Le taux doit être entre 0 et 100')
      return
    }
    setSaving(true)
    await onSave(restaurant.id, val)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <h2 className="text-base font-bold text-gray-900 mb-1">Modifier la commission</h2>
        <p className="text-sm text-gray-500 mb-4">{restaurant.nom}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taux de commission (%)
            </label>
            <input
              type="number"
              value={taux}
              onChange={e => setTaux(e.target.value)}
              min={0}
              max={100}
              step={0.5}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium
                         hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-bold
                         hover:bg-brand-600 transition-colors disabled:opacity-60
                         flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Détail déroulant d'un restaurant ──────────────────────
function DetailRestaurant({ restaurant, ouvert, onValider, onSuspendre, onCommission, loading }) {
  if (!ouvert) return null

  return (
    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
      <div className="pt-3 space-y-2">
        {/* Infos */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <p className="font-medium text-gray-700">Propriétaire</p>
            <p>{restaurant.owner?.nom ?? '—'}</p>
            <p>{restaurant.owner?.telephone ?? '—'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Adresse</p>
            <p className="truncate">{restaurant.adresse ?? '—'}</p>
          </div>
        </div>

        {/* Commission actuelle */}
        <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-200">
          <p className="text-xs text-gray-600">
            Commission : <span className="font-bold text-gray-800">{restaurant.commission_rate ?? 10}%</span>
          </p>
          <button
            onClick={() => onCommission(restaurant)}
            className="flex items-center gap-1 text-xs text-brand-500 font-semibold hover:underline"
          >
            <Pencil className="w-3 h-3" /> Modifier
          </button>
        </div>

        {/* Actions statut */}
        <div className="flex gap-2 pt-1">
          {restaurant.statut !== 'actif' && (
            <button
              onClick={() => onValider(restaurant.id)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white
                         text-xs font-bold py-2.5 rounded-xl hover:bg-green-600 transition-colors
                         disabled:opacity-60 min-h-[44px]"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Valider
            </button>
          )}
          {restaurant.statut !== 'suspendu' && (
            <button
              onClick={() => onSuspendre(restaurant.id)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white
                         text-xs font-bold py-2.5 rounded-xl hover:bg-red-600 transition-colors
                         disabled:opacity-60 min-h-[44px]"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Suspendre
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Restaurants Admin
// ══════════════════════════════════════════════════════════
export default function AdminRestaurants() {
  const [restaurants,     setRestaurants]     = useState([])
  const [loading,         setLoading]         = useState(true)
  const [filtre,          setFiltre]          = useState('tous')
  const [recherche,       setRecherche]       = useState('')
  const [ouvertId,        setOuvertId]        = useState(null)  // ligne déroulée
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [modaleCommission,setModaleCommission]= useState(null)  // objet restaurant

  // ── Chargement ─────────────────────────────────────────
  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { data, error } = await getAllRestaurants()
      if (error) toast.error('Impossible de charger les restaurants')
      else       setRestaurants(data ?? [])
      setLoading(false)
    }
    charger()
  }, [])

  // ── Actions statut ─────────────────────────────────────
  async function handleStatut(id, statut) {
    setActionLoadingId(id)
    const { data, error } = await updateRestaurantStatus(id, statut)
    setActionLoadingId(null)

    if (error) { toast.error('Erreur : ' + error); return }
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    toast.success(statut === 'actif' ? 'Restaurant validé ✓' : 'Restaurant suspendu')
    setOuvertId(null)
  }

  // ── Modification commission ────────────────────────────
  async function handleCommission(id, taux) {
    const { data, error } = await updateCommissionRate(id, taux)
    if (error) { toast.error('Erreur : ' + error); return }
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    setModaleCommission(null)
    toast.success('Commission mise à jour')
  }

  // ── Filtrage + recherche ───────────────────────────────
  const listes = restaurants.filter(r => {
    const matchFiltre = filtre === 'tous' || r.statut === filtre
    const matchSearch = !recherche || r.nom.toLowerCase().includes(recherche.toLowerCase())
    return matchFiltre && matchSearch
  })

  // ── Tri : en_attente en tête ───────────────────────────
  const listerTriee = [...listes].sort((a, b) => {
    if (a.statut === 'en_attente' && b.statut !== 'en_attente') return -1
    if (b.statut === 'en_attente' && a.statut !== 'en_attente') return  1
    return a.nom.localeCompare(b.nom)
  })

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
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Restaurants</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} enregistré
          {restaurants.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="px-4 pt-4 space-y-4">

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher un restaurant…"
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm"
          />
        </div>

        {/* Onglets filtrage */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTRES.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltre(f.key)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                filtre === f.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {f.key !== 'tous' && (
                <span className="ml-1 opacity-70">
                  ({restaurants.filter(r => r.statut === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        {listerTriee.length === 0
          ? (
            <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
              <Store className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
              <p className="text-sm font-medium">Aucun restaurant trouvé</p>
            </div>
          )
          : (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              {listerTriee.map((resto, idx) => (
                <div key={resto.id} className={idx > 0 ? 'border-t border-gray-100' : ''}>
                  {/* Ligne principale */}
                  <button
                    onClick={() => setOuvertId(ouvertId === resto.id ? null : resto.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Logo / initiale */}
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center
                                    text-brand-600 font-bold text-sm shrink-0 overflow-hidden">
                      {resto.logo_url
                        ? <img src={resto.logo_url} alt="" className="w-full h-full object-cover" />
                        : resto.nom[0].toUpperCase()
                      }
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm truncate">{resto.nom}</p>
                        <BadgeStatut statut={resto.statut} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400 truncate">{resto.adresse ?? '—'}</p>
                        {resto.note_moyenne > 0 && (
                          <p className="text-xs text-yellow-600 flex items-center gap-0.5 shrink-0">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {Number(resto.note_moyenne).toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                        ouvertId === resto.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Détail déroulant */}
                  <DetailRestaurant
                    restaurant={resto}
                    ouvert={ouvertId === resto.id}
                    onValider={id => handleStatut(id, 'actif')}
                    onSuspendre={id => handleStatut(id, 'suspendu')}
                    onCommission={setModaleCommission}
                    loading={actionLoadingId === resto.id}
                  />
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* ── Modale commission ────────────────────────────── */}
      {modaleCommission && (
        <ModaleCommission
          restaurant={modaleCommission}
          onSave={handleCommission}
          onClose={() => setModaleCommission(null)}
        />
      )}
    </div>
  )
}
