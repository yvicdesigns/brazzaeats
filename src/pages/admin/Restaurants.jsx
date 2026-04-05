import { useState, useEffect } from 'react'
import {
  Store, CheckCircle, XCircle, Loader2, Search,
  ChevronDown, Pencil, Star, Plus, Eye, EyeOff, KeyRound, User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAllRestaurants,
  updateRestaurantStatus,
  updateCommissionRate,
  createRestaurant,
  adminUpdateRestaurant,
  adminChangePassword,
  adminUpdateOwnerProfile,
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

// ── Modale modification restaurant (admin) ─────────────────
function ModaleModifier({ restaurant, onSave, onClose }) {
  const [form, setForm] = useState({
    nom:             restaurant.nom             ?? '',
    adresse:         restaurant.adresse         ?? '',
    description:     restaurant.description     ?? '',
    commission_rate: restaurant.commission_rate ?? 10,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)
    await onSave(restaurant.id, {
      nom:             form.nom.trim(),
      adresse:         form.adresse.trim() || null,
      description:     form.description.trim() || null,
      commission_rate: Number(form.commission_rate),
    })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <h2 className="text-base font-black text-gray-900 mb-4">Modifier le restaurant</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nom *</label>
            <input
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Adresse</label>
            <input
              value={form.adresse}
              onChange={e => set('adresse', e.target.value)}
              placeholder="Avenue…, Quartier"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Cuisine typique, spécialités…"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Commission (%)</label>
            <input
              type="number" min={0} max={100} step={0.5}
              value={form.commission_rate}
              onChange={e => set('commission_rate', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={saving || !form.nom.trim()}
              className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-bold
                         hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center gap-2"
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
function DetailRestaurant({ restaurant, ouvert, onValider, onSuspendre, onModifier, onMotDePasse, onProprietaire, loading }) {
  if (!ouvert) return null

  return (
    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
      <div className="pt-3 space-y-2">

        {/* Infos propriétaire + adresse */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <p className="font-medium text-gray-700">Propriétaire</p>
            <p>{restaurant.owner?.nom ?? '—'}</p>
            <p>{restaurant.owner?.telephone ?? '—'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Adresse</p>
            <p className="truncate">{restaurant.adresse ?? '—'}</p>
            <p className="font-medium text-gray-700 mt-1">Commission</p>
            <p>{restaurant.commission_rate ?? 10}%</p>
          </div>
        </div>

        {/* Boutons gestion */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onModifier(restaurant)}
            className="flex flex-col items-center justify-center gap-1 bg-white border border-gray-200
                       text-gray-700 text-xs font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Infos
          </button>
          <button
            onClick={() => onProprietaire(restaurant)}
            className="flex flex-col items-center justify-center gap-1 bg-white border border-gray-200
                       text-gray-700 text-xs font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            Propriétaire
          </button>
          <button
            onClick={() => onMotDePasse(restaurant)}
            className="flex flex-col items-center justify-center gap-1 bg-white border border-orange-200
                       text-orange-600 text-xs font-bold py-2.5 rounded-xl hover:bg-orange-50 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Mot de passe
          </button>
        </div>

        {/* Actions statut */}
        <div className="flex gap-2">
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

// ── Modale changement mot de passe ────────────────────────
function ModaleMotDePasse({ restaurant, onClose }) {
  const [mdp,        setMdp]        = useState('')
  const [mdpVisible, setMdpVisible] = useState(false)
  const [saving,     setSaving]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (mdp.length < 6) { toast.error('Minimum 6 caractères'); return }
    setSaving(true)
    const { error } = await adminChangePassword(restaurant.owner_id, mdp)
    setSaving(false)
    if (error) { toast.error('Erreur : ' + error); return }
    toast.success(`Mot de passe mis à jour pour ${restaurant.nom}`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <h2 className="text-base font-black text-gray-900 mb-1">Changer le mot de passe</h2>
        <p className="text-xs text-gray-400 mb-5">{restaurant.nom}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Nouveau mot de passe *</label>
            <div className="relative mt-1">
              <input
                value={mdp}
                onChange={e => setMdp(e.target.value)}
                type={mdpVisible ? 'text' : 'password'}
                placeholder="Min. 6 caractères"
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button
                type="button"
                onClick={() => setMdpVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-semibold">
              Annuler
            </button>
            <button type="submit" disabled={mdp.length < 6 || saving}
              className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-bold
                         hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modale modification propriétaire ─────────────────────
function ModaleProprietaire({ restaurant, onSave, onClose }) {
  const [form, setForm] = useState({
    nom:       restaurant.owner?.nom       ?? '',
    telephone: restaurant.owner?.telephone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)
    await onSave(restaurant.owner_id, form)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <h2 className="text-base font-black text-gray-900 mb-1">Modifier le propriétaire</h2>
        <p className="text-xs text-gray-400 mb-5">{restaurant.nom}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nom complet *</label>
            <input
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              placeholder="Nom du propriétaire"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Téléphone</label>
            <input
              value={form.telephone}
              onChange={e => set('telephone', e.target.value)}
              placeholder="+242066000000"
              type="tel"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <p className="text-[11px] text-gray-400 mt-0.5">
              Modifier le téléphone change aussi l'identifiant de connexion
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-semibold">
              Annuler
            </button>
            <button type="submit" disabled={!form.nom.trim() || saving}
              className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-bold
                         hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modale création restaurant ────────────────────────────
function ModaleCreerRestaurant({ onSave, onClose }) {
  const [form, setForm] = useState({
    nom: '', adresse: '', telephone: '', motDePasse: '', commissionRate: 10,
  })
  const [mdpVisible, setMdpVisible] = useState(false)
  const [saving,     setSaving]     = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valide = form.nom.trim() && form.telephone.trim() && form.motDePasse.length >= 6

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valide) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <h2 className="text-base font-black text-gray-900 mb-1">Créer un restaurant</h2>
        <p className="text-xs text-gray-400 mb-5">Le restaurant sera en attente de validation.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nom du restaurant *</label>
            <input
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              placeholder="Le Mami Wata"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Adresse</label>
            <input
              value={form.adresse}
              onChange={e => set('adresse', e.target.value)}
              placeholder="Avenue de l'Indépendance, Poto-Poto"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Téléphone du propriétaire *</label>
            <input
              value={form.telephone}
              onChange={e => set('telephone', e.target.value)}
              placeholder="+242066000000"
              type="tel"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <p className="text-[11px] text-gray-400 mt-0.5">Utilisé comme identifiant de connexion</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Mot de passe *</label>
            <div className="relative mt-1">
              <input
                value={form.motDePasse}
                onChange={e => set('motDePasse', e.target.value)}
                type={mdpVisible ? 'text' : 'password'}
                placeholder="Min. 6 caractères"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button
                type="button"
                onClick={() => setMdpVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Commission (%)</label>
            <input
              value={form.commissionRate}
              onChange={e => set('commissionRate', Number(e.target.value))}
              type="number" min={0} max={100} step={0.5}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={!valide || saving}
              className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-bold
                         hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer
            </button>
          </div>
        </form>
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
  const [ouvertId,        setOuvertId]        = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [modaleModifier,      setModaleModifier]      = useState(null)
  const [modaleCreer,         setModaleCreer]         = useState(false)
  const [modaleMotDePasse,    setModaleMotDePasse]    = useState(null)
  const [modaleProprietaire,  setModaleProprietaire]  = useState(null)

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

  // ── Création restaurant ────────────────────────────────
  async function handleCreer(form) {
    const { data, error } = await createRestaurant(form)
    if (error) { toast.error('Erreur : ' + error); return }
    setRestaurants(prev => [data, ...prev])
    setModaleCreer(false)
    toast.success(`Restaurant "${data.nom}" créé — en attente de validation`)
  }

  // ── Modification restaurant ────────────────────────────
  async function handleModifier(id, updates) {
    const { data, error } = await adminUpdateRestaurant(id, updates)
    if (error) { toast.error('Erreur : ' + error); return }
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    setModaleModifier(null)
    toast.success('Restaurant mis à jour')
  }

  // ── Modification propriétaire ──────────────────────────
  async function handleProprietaire(ownerId, updates) {
    const { error } = await adminUpdateOwnerProfile(ownerId, updates)
    if (error) { toast.error('Erreur : ' + error); return }
    setRestaurants(prev => prev.map(r =>
      r.owner_id === ownerId
        ? { ...r, owner: { ...r.owner, ...updates } }
        : r
    ))
    setModaleProprietaire(null)
    toast.success('Propriétaire mis à jour')
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Administration</p>
            <h1 className="text-xl font-black text-gray-900 mt-0.5">Restaurants</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} enregistré{restaurants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setModaleCreer(true)}
            className="flex items-center gap-2 bg-brand-500 text-white text-sm font-bold
                       px-4 py-2.5 rounded-xl hover:bg-brand-600 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Créer
          </button>
        </div>
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
                    onModifier={setModaleModifier}
                    onMotDePasse={setModaleMotDePasse}
                    onProprietaire={setModaleProprietaire}
                    loading={actionLoadingId === resto.id}
                  />
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* ── Modale modifier restaurant ───────────────────── */}
      {modaleModifier && (
        <ModaleModifier
          restaurant={modaleModifier}
          onSave={handleModifier}
          onClose={() => setModaleModifier(null)}
        />
      )}

      {/* ── Modale création restaurant ───────────────────── */}
      {modaleCreer && (
        <ModaleCreerRestaurant
          onSave={handleCreer}
          onClose={() => setModaleCreer(false)}
        />
      )}

      {/* ── Modale mot de passe ──────────────────────────── */}
      {modaleMotDePasse && (
        <ModaleMotDePasse
          restaurant={modaleMotDePasse}
          onClose={() => setModaleMotDePasse(null)}
        />
      )}

      {/* ── Modale propriétaire ──────────────────────────── */}
      {modaleProprietaire && (
        <ModaleProprietaire
          restaurant={modaleProprietaire}
          onSave={handleProprietaire}
          onClose={() => setModaleProprietaire(null)}
        />
      )}
    </div>
  )
}
