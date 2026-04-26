import { useState, useEffect } from 'react'
import {
  Bike, CheckCircle, XCircle, Loader2, Search,
  ChevronDown, Plus, Eye, EyeOff, KeyRound, Trash2,
  TrendingUp, Package, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAllLivreurs,
  createLivreur,
  updateLivreurStatus,
  deleteLivreur,
  adminChangePassword,
  getLivreurStats,
} from '@/services/adminService'
import { formatCurrencyShort } from '@/utils/formatCurrency'

const STATUTS = {
  en_attente: { label: 'En attente', couleur: 'bg-yellow-100 text-yellow-700' },
  actif:      { label: 'Actif',      couleur: 'bg-green-100 text-green-700'  },
  suspendu:   { label: 'Suspendu',   couleur: 'bg-red-100 text-red-600'      },
}

const FILTRES = [
  { key: 'tous',       label: 'Tous'       },
  { key: 'en_attente', label: 'En attente' },
  { key: 'actif',      label: 'Actifs'     },
  { key: 'suspendu',   label: 'Suspendus'  },
]

const VEHICULES = ['moto', 'vélo', 'voiture', 'à pied']

function BadgeStatut({ statut }) {
  const cfg = STATUTS[statut] ?? { label: statut, couleur: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.couleur}`}>
      {cfg.label}
    </span>
  )
}

// ── Mini graphique 30j (SVG) ──────────────────────────────
function Mini30j({ par30j }) {
  const max = Math.max(...par30j.map(j => j.nb), 1)
  const W = 6, GAP = 2, H = 28
  const LARGEUR = par30j.length * (W + GAP) - GAP
  return (
    <svg viewBox={`0 0 ${LARGEUR} ${H}`} className="w-full" style={{ maxHeight: 32 }}>
      {par30j.map((j, i) => {
        const h = Math.max((j.nb / max) * H, j.nb > 0 ? 3 : 1)
        const isToday = i === par30j.length - 1
        return (
          <rect
            key={i}
            x={i * (W + GAP)} y={H - h}
            width={W} height={h} rx={2}
            fill={isToday ? '#E85D26' : j.nb > 0 ? '#f9c5a8' : '#f3f4f6'}
          />
        )
      })}
    </svg>
  )
}

// ── Détail déroulant ──────────────────────────────────────
function DetailLivreur({ livreur, ouvert, onValider, onSuspendre, onMotDePasse, onSupprimer, loading }) {
  const [stats,        setStats]        = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (!ouvert || !livreur.profile?.id) return
    setStatsLoading(true)
    getLivreurStats(livreur.profile.id).then(({ data }) => {
      setStats(data)
      setStatsLoading(false)
    })
  }, [ouvert, livreur.profile?.id])

  if (!ouvert) return null

  function dateFR(iso) {
    if (!iso) return 'Jamais'
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
      <div className="pt-3 space-y-3">

        {/* Infos de base */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <p className="font-medium text-gray-700">Téléphone</p>
            <p>{livreur.profile?.telephone ?? '—'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Véhicule</p>
            <p className="capitalize">{livreur.vehicule ?? 'moto'}</p>
            {livreur.zone && (
              <>
                <p className="font-medium text-gray-700 mt-1">Zone</p>
                <p>{livreur.zone}</p>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* KPIs 3 colonnes */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-2.5 text-center">
                <div className="bg-brand-50 rounded-lg p-1.5 w-fit mx-auto mb-1">
                  <Package className="w-3.5 h-3.5 text-brand-500" strokeWidth={2} />
                </div>
                <p className="text-base font-black text-brand-700">{stats.nb}</p>
                <p className="text-[10px] text-gray-400">Livraisons</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 text-center">
                <div className="bg-green-50 rounded-lg p-1.5 w-fit mx-auto mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" strokeWidth={2} />
                </div>
                <p className="text-base font-black text-green-700">{formatCurrencyShort(stats.caGenere)}</p>
                <p className="text-[10px] text-gray-400">CA généré</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 text-center">
                <div className="bg-gray-50 rounded-lg p-1.5 w-fit mx-auto mb-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" strokeWidth={2} />
                </div>
                <p className="text-[11px] font-bold text-gray-700">{dateFR(stats.derniereDate)}</p>
                <p className="text-[10px] text-gray-400">Dernière livr.</p>
              </div>
            </div>

            {/* Graphique 30j */}
            {stats.nb > 0 && (
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-medium mb-2">Activité — 30 derniers jours</p>
                <Mini30j par30j={stats.par30j} />
              </div>
            )}
          </>
        ) : null}

        {/* Actions */}
        <button
          onClick={() => onMotDePasse(livreur)}
          className="w-full flex items-center justify-center gap-1.5 bg-white border border-orange-200
                     text-orange-600 text-xs font-bold py-2.5 rounded-xl hover:bg-orange-50 transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Changer le mot de passe
        </button>

        <div className="flex gap-2">
          {livreur.statut !== 'actif' && (
            <button
              onClick={() => onValider(livreur.id)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white
                         text-xs font-bold py-2.5 rounded-xl hover:bg-green-600 transition-colors
                         disabled:opacity-60 min-h-[44px]"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Valider
            </button>
          )}
          {livreur.statut !== 'suspendu' && (
            <button
              onClick={() => onSuspendre(livreur.id)}
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

        <button
          onClick={() => onSupprimer(livreur)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 border border-red-200
                     text-red-500 text-xs font-bold py-2.5 rounded-xl hover:bg-red-50
                     transition-colors disabled:opacity-60"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer définitivement
        </button>
      </div>
    </div>
  )
}

// ── Modale mot de passe ───────────────────────────────────
function ModaleMotDePasse({ livreur, onClose }) {
  const [mdp,        setMdp]        = useState('')
  const [mdpVisible, setMdpVisible] = useState(false)
  const [saving,     setSaving]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (mdp.length < 6) { toast.error('Minimum 6 caractères'); return }
    setSaving(true)
    const { error } = await adminChangePassword(livreur.id, mdp)
    setSaving(false)
    if (error) { toast.error('Erreur : ' + error); return }
    toast.success(`Mot de passe mis à jour`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <h2 className="text-base font-black text-gray-900 mb-1">Changer le mot de passe</h2>
        <p className="text-xs text-gray-400 mb-5">{livreur.profile?.nom}</p>

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
              <button type="button" onClick={() => setMdpVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
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

// ── Modale création livreur ───────────────────────────────
function ModaleCreer({ onSave, onClose }) {
  const [form, setForm] = useState({ nom: '', telephone: '', motDePasse: '', vehicule: 'moto', zone: '' })
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
        <h2 className="text-base font-black text-gray-900 mb-1">Ajouter un livreur</h2>
        <p className="text-xs text-gray-400 mb-5">Le livreur sera en attente de validation.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nom complet *</label>
            <input value={form.nom} onChange={e => set('nom', e.target.value)}
              placeholder="Jean Mabiala"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Téléphone *</label>
            <input value={form.telephone} onChange={e => set('telephone', e.target.value)}
              placeholder="+242066000000" type="tel"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300" />
            <p className="text-[11px] text-gray-400 mt-0.5">Utilisé comme identifiant de connexion</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Mot de passe *</label>
            <div className="relative mt-1">
              <input value={form.motDePasse} onChange={e => set('motDePasse', e.target.value)}
                type={mdpVisible ? 'text' : 'password'} placeholder="Min. 6 caractères"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <button type="button" onClick={() => setMdpVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {mdpVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Véhicule</label>
              <select value={form.vehicule} onChange={e => set('vehicule', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                {VEHICULES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Zone</label>
              <input value={form.zone} onChange={e => set('zone', e.target.value)}
                placeholder="Poto-Poto, Bacongo…"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-semibold">
              Annuler
            </button>
            <button type="submit" disabled={!valide || saving}
              className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-bold
                         hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center gap-2">
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
// Page Livreurs Admin
// ══════════════════════════════════════════════════════════
export default function AdminLivreurs() {
  const [livreurs,        setLivreurs]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [filtre,          setFiltre]          = useState('tous')
  const [recherche,       setRecherche]       = useState('')
  const [ouvertId,        setOuvertId]        = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [modaleCreer,     setModaleCreer]     = useState(false)
  const [modaleMotDePasse, setModaleMotDePasse] = useState(null)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { data, error } = await getAllLivreurs()
      if (error) toast.error('Impossible de charger les livreurs')
      else setLivreurs(data ?? [])
      setLoading(false)
    }
    charger()
  }, [])

  async function handleStatut(id, statut) {
    setActionLoadingId(id)
    const { data, error } = await updateLivreurStatus(id, statut)
    setActionLoadingId(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setLivreurs(prev => prev.map(l => l.id === id ? { ...l, ...data } : l))
    toast.success(statut === 'actif' ? 'Livreur validé ✓' : 'Livreur suspendu')
    setOuvertId(null)
  }

  async function handleCreer(form) {
    const { data, error } = await createLivreur(form)
    if (error) { toast.error('Erreur : ' + error); return }
    setLivreurs(prev => [data, ...prev])
    setModaleCreer(false)
    toast.success(`Livreur "${data.profile?.nom}" créé — en attente de validation`)
  }

  async function handleSupprimer(livreur) {
    const confirme = window.confirm(
      `Supprimer définitivement "${livreur.profile?.nom}" ?\n\nCette action est irréversible.`
    )
    if (!confirme) return
    setActionLoadingId(livreur.id)
    const { error } = await deleteLivreur(livreur.id)
    setActionLoadingId(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setLivreurs(prev => prev.filter(l => l.id !== livreur.id))
    setOuvertId(null)
    toast.success('Livreur supprimé')
  }

  const listes = livreurs.filter(l => {
    const matchFiltre = filtre === 'tous' || l.statut === filtre
    const matchSearch = !recherche ||
      (l.profile?.nom ?? '').toLowerCase().includes(recherche.toLowerCase()) ||
      (l.profile?.telephone ?? '').includes(recherche)
    return matchFiltre && matchSearch
  })

  const listeTriee = [...listes].sort((a, b) => {
    if (a.statut === 'en_attente' && b.statut !== 'en_attente') return -1
    if (b.statut === 'en_attente' && a.statut !== 'en_attente') return  1
    return (a.profile?.nom ?? '').localeCompare(b.profile?.nom ?? '')
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

      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Administration</p>
            <h1 className="text-xl font-black text-gray-900 mt-0.5">Livreurs</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {livreurs.length} livreur{livreurs.length !== 1 ? 's' : ''} enregistré{livreurs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setModaleCreer(true)}
            className="flex items-center gap-2 bg-brand-500 text-white text-sm font-bold
                       px-4 py-2.5 rounded-xl hover:bg-brand-600 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Nom ou téléphone…"
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm" />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTRES.map(f => (
            <button key={f.key} onClick={() => setFiltre(f.key)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                filtre === f.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {f.label}
              {f.key !== 'tous' && (
                <span className="ml-1 opacity-70">
                  ({livreurs.filter(l => l.statut === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {listeTriee.length === 0
          ? (
            <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
              <Bike className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
              <p className="text-sm font-medium">Aucun livreur trouvé</p>
            </div>
          )
          : (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              {listeTriee.map((livreur, idx) => (
                <div key={livreur.id} className={idx > 0 ? 'border-t border-gray-100' : ''}>
                  <button
                    onClick={() => setOuvertId(ouvertId === livreur.id ? null : livreur.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center
                                    text-brand-600 font-bold text-sm shrink-0">
                      {(livreur.profile?.nom ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {livreur.profile?.nom ?? '—'}
                        </p>
                        <BadgeStatut statut={livreur.statut} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">
                        {livreur.vehicule ?? 'moto'}{livreur.zone ? ` · ${livreur.zone}` : ''}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                      ouvertId === livreur.id ? 'rotate-180' : ''
                    }`} />
                  </button>

                  <DetailLivreur
                    livreur={livreur}
                    ouvert={ouvertId === livreur.id}
                    onValider={id => handleStatut(id, 'actif')}
                    onSuspendre={id => handleStatut(id, 'suspendu')}
                    onMotDePasse={setModaleMotDePasse}
                    onSupprimer={handleSupprimer}
                    loading={actionLoadingId === livreur.id}
                  />
                </div>
              ))}
            </div>
          )
        }
      </div>

      {modaleCreer && (
        <ModaleCreer onSave={handleCreer} onClose={() => setModaleCreer(false)} />
      )}

      {modaleMotDePasse && (
        <ModaleMotDePasse livreur={modaleMotDePasse} onClose={() => setModaleMotDePasse(null)} />
      )}
    </div>
  )
}
