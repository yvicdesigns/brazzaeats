import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, ToggleLeft, ToggleRight, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import {
  getPromotionsByRestaurant,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '@/services/promotionService'

// ── Statut d'une promo selon les dates + actif ─────────────
function getStatut(promo) {
  const today = new Date().toISOString().slice(0, 10)
  if (!promo.actif)                   return { label: 'Désactivée', couleur: 'bg-gray-100 text-gray-500' }
  if (promo.date_fin   < today)       return { label: 'Expirée',    couleur: 'bg-red-100 text-red-600'   }
  if (promo.date_debut > today)       return { label: 'À venir',    couleur: 'bg-blue-100 text-blue-600' }
  return                                     { label: 'Active',     couleur: 'bg-green-100 text-green-700' }
}

function dateCourteFR(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Modal création / édition ───────────────────────────────
function ModalPromotion({ promo, restaurantId, onSave, onClose }) {
  const isNew = !promo
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    code:        promo?.code        ?? '',
    type:        promo?.type        ?? 'pourcentage',
    valeur:      promo?.valeur      ?? '',
    date_debut:  promo?.date_debut  ?? today,
    date_fin:    promo?.date_fin    ?? '',
    actif:       promo?.actif       ?? true,
    usage_limit: promo?.usage_limit ?? '',  // vide = illimité
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    const code   = form.code.trim().toUpperCase()
    const valeur = Number(form.valeur)

    if (!code)                          { toast.error('Le code est requis');              return }
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) { toast.error('Code : 3-20 caractères, lettres/chiffres'); return }
    if (!valeur || valeur <= 0)         { toast.error('La valeur doit être > 0');          return }
    if (form.type === 'pourcentage' && valeur > 100) { toast.error('Pourcentage max 100'); return }
    if (!form.date_debut || !form.date_fin)     { toast.error('Dates obligatoires');       return }
    if (form.date_fin < form.date_debut)        { toast.error('Date fin < date début');    return }

    const usage_limit = form.usage_limit === '' || form.usage_limit === null
      ? null
      : Number(form.usage_limit)
    if (usage_limit !== null && (isNaN(usage_limit) || usage_limit < 1)) {
      toast.error('Limite d\'utilisation doit être ≥ 1')
      return
    }

    setSaving(true)
    await onSave({ ...form, code, valeur, usage_limit })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{isNew ? 'Nouvelle promotion' : 'Modifier'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code promo *</label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="ex: BIENVENUE20"
              maxLength={20}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono
                         uppercase focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <p className="text-xs text-gray-400 mt-1">Lettres, chiffres, - ou _ uniquement</p>
          </div>

          {/* Type + Valeur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
              >
                <option value="pourcentage">Pourcentage (%)</option>
                <option value="montant_fixe">Montant fixe (FCFA)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valeur {form.type === 'pourcentage' ? '(%)' : '(FCFA)'}
              </label>
              <input
                type="number"
                value={form.valeur}
                onChange={e => set('valeur', e.target.value)}
                min={1}
                max={form.type === 'pourcentage' ? 100 : undefined}
                step={form.type === 'pourcentage' ? 1 : 100}
                placeholder={form.type === 'pourcentage' ? '10' : '1000'}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="date"
                value={form.date_debut}
                onChange={e => set('date_debut', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="date"
                value={form.date_fin}
                min={form.date_debut}
                onChange={e => set('date_fin', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          {/* Limite d'utilisation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite d'utilisation
              <span className="text-gray-400 font-normal ml-1">(laisser vide = illimité)</span>
            </label>
            <input
              type="number"
              value={form.usage_limit}
              onChange={e => set('usage_limit', e.target.value)}
              min={1}
              step={1}
              placeholder="Ex: 50"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          {/* Actif */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Promotion active</span>
            <button type="button" onClick={() => set('actif', !form.actif)}>
              {form.actif
                ? <ToggleRight className="w-9 h-9 text-brand-500" />
                : <ToggleLeft  className="w-9 h-9 text-gray-400" />
              }
            </button>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium
                         hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-bold
                         hover:bg-brand-600 transition-colors disabled:opacity-60
                         flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isNew ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Promotions
// ══════════════════════════════════════════════════════════
export default function Promotions() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()

  const [promos,  setPromos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // null | 'new' | objet promo

  useEffect(() => {
    if (!restaurant?.id) return
    getPromotionsByRestaurant(restaurant.id).then(({ data }) => {
      setPromos(data)
      setLoading(false)
    })
  }, [restaurant?.id])

  async function handleSave(donnees) {
    if (modal === 'new') {
      const { data, error } = await createPromotion(restaurant.id, donnees)
      if (error) { toast.error('Erreur : ' + error); return }
      setPromos(p => [data, ...p])
      toast.success('Promotion créée')
    } else {
      const { data, error } = await updatePromotion(modal.id, donnees)
      if (error) { toast.error('Erreur : ' + error); return }
      setPromos(p => p.map(x => x.id === data.id ? data : x))
      toast.success('Promotion modifiée')
    }
    setModal(null)
  }

  async function handleToggle(promo) {
    const { data, error } = await updatePromotion(promo.id, { actif: !promo.actif })
    if (error) { toast.error('Erreur'); return }
    setPromos(p => p.map(x => x.id === data.id ? data : x))
  }

  async function handleDelete(promo) {
    if (!window.confirm(`Supprimer le code "${promo.code}" ?`)) return
    const { error } = await deletePromotion(promo.id)
    if (error) { toast.error('Erreur : ' + error); return }
    setPromos(p => p.filter(x => x.id !== promo.id))
    toast.success('Promotion supprimée')
  }

  if (loadingResto || loading) {
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
            <p className="text-xs text-gray-400 font-medium">Marketing</p>
            <h1 className="text-xl font-black text-gray-900 mt-0.5">Promotions & codes promo</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {promos.filter(p => {
                const today = new Date().toISOString().slice(0, 10)
                return p.actif && p.date_debut <= today && p.date_fin >= today
              }).length} actives en ce moment
            </p>
          </div>
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1.5 bg-brand-500 text-white font-bold text-sm
                       px-4 py-2.5 rounded-xl hover:bg-brand-600 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Créer
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-3">
        {promos.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-card text-center">
            <Tag className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="font-semibold text-gray-600">Aucune promotion</p>
            <p className="text-sm text-gray-400 mt-1">
              Créez un code promo pour attirer de nouveaux clients.
            </p>
            <button
              onClick={() => setModal('new')}
              className="mt-4 bg-brand-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl
                         hover:bg-brand-600 transition-colors"
            >
              Créer ma première promo
            </button>
          </div>
        ) : promos.map(promo => {
          const statut = getStatut(promo)
          return (
            <div key={promo.id} className="bg-white rounded-2xl p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                {/* Code + type + valeur */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-900 text-base font-mono tracking-wide">
                      {promo.code}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statut.couleur}`}>
                      {statut.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {promo.type === 'pourcentage'
                      ? `−${promo.valeur}% sur la commande`
                      : `−${promo.valeur.toLocaleString('fr-FR')} FCFA`
                    }
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {dateCourteFR(promo.date_debut)} → {dateCourteFR(promo.date_fin)}
                  </p>
                  {/* Compteur d'utilisation */}
                  <p className="text-xs mt-1">
                    <span className="font-semibold text-gray-700">
                      {promo.nb_utilisations ?? 0}
                    </span>
                    <span className="text-gray-400">
                      {promo.usage_limit != null
                        ? ` / ${promo.usage_limit} utilisation${promo.usage_limit > 1 ? 's' : ''}`
                        : ' utilisation' + ((promo.nb_utilisations ?? 0) !== 1 ? 's' : '')}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Toggle actif */}
                  <button
                    onClick={() => handleToggle(promo)}
                    title={promo.actif ? 'Désactiver' : 'Activer'}
                  >
                    {promo.actif
                      ? <ToggleRight className="w-8 h-8 text-brand-500" />
                      : <ToggleLeft  className="w-8 h-8 text-gray-400" />
                    }
                  </button>
                  <button
                    onClick={() => setModal(promo)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo)}
                    className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <ModalPromotion
          promo={modal === 'new' ? null : modal}
          restaurantId={restaurant.id}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
