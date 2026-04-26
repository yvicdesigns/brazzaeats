import { useState, useEffect } from 'react'
import {
  Tag, Plus, Loader2, ToggleLeft, ToggleRight,
  Trash2, X, Percent, Banknote, Truck, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getPromoCodes, createPromoCode, togglePromoCodeActif, deletePromoCode } from '@/services/adminService'
import { formatCurrency } from '@/utils/formatCurrency'

const TYPES = [
  { key: 'pourcentage',      label: '% réduction',       Icon: Percent,   desc: 'Ex : 20% sur le sous-total' },
  { key: 'fixe',             label: 'Montant fixe',       Icon: Banknote,  desc: 'Ex : −2000 FCFA' },
  { key: 'livraison_gratuite', label: 'Livraison offerte', Icon: Truck,   desc: 'Frais de livraison à 0' },
]

function badgeType(type) {
  if (type === 'pourcentage')       return 'bg-blue-50 text-blue-700'
  if (type === 'fixe')              return 'bg-green-50 text-green-700'
  if (type === 'livraison_gratuite') return 'bg-orange-50 text-orange-700'
  return 'bg-gray-100 text-gray-600'
}

function labelType(type, valeur) {
  if (type === 'pourcentage')       return `−${valeur}%`
  if (type === 'fixe')              return `−${formatCurrency(valeur)}`
  if (type === 'livraison_gratuite') return 'Livraison gratuite'
  return type
}

function dateFR(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Modal création ─────────────────────────────────────────
function ModalCreation({ onClose, onCreate }) {
  const [type,           setType]           = useState('pourcentage')
  const [code,           setCode]           = useState('')
  const [valeur,         setValeur]         = useState('')
  const [minCommande,    setMinCommande]     = useState('')
  const [maxUti,         setMaxUti]         = useState('')
  const [dateExp,        setDateExp]        = useState('')
  const [saving,         setSaving]         = useState(false)

  async function handleSave() {
    if (!code.trim()) { toast.error('Code requis'); return }
    if (type !== 'livraison_gratuite' && (!valeur || Number(valeur) <= 0)) {
      toast.error('Valeur requise'); return
    }
    setSaving(true)
    const { data, error } = await createPromoCode({
      code:             code.trim().toUpperCase(),
      type,
      valeur:           type === 'livraison_gratuite' ? 0 : Number(valeur),
      min_commande:     minCommande ? Number(minCommande) : 0,
      max_utilisations: maxUti ? Number(maxUti) : null,
      date_expiration:  dateExp || null,
    })
    setSaving(false)
    if (error) { toast.error('Erreur : ' + error); return }
    toast.success('Code promo créé')
    onCreate(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Nouveau code promo</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-2">Type de réduction</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-colors text-center ${
                    type === t.key
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <t.Icon className={`w-5 h-5 mb-1 ${type === t.key ? 'text-brand-500' : 'text-gray-400'}`} strokeWidth={2} />
                  <span className={`text-xs font-semibold leading-tight ${type === t.key ? 'text-brand-700' : 'text-gray-600'}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{TYPES.find(t => t.key === type)?.desc}</p>
          </div>

          {/* Code */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Code (ex: BIENVENUE20)</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              maxLength={20}
              placeholder="BIENVENUE20"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono
                         uppercase focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Valeur (masqué pour livraison_gratuite) */}
          {type !== 'livraison_gratuite' && (
            <div>
              <label className="text-xs text-gray-500 font-medium">
                {type === 'pourcentage' ? 'Pourcentage (%)' : 'Montant (FCFA)'}
              </label>
              <input
                type="number"
                value={valeur}
                onChange={e => setValeur(e.target.value)}
                min={1}
                max={type === 'pourcentage' ? 100 : undefined}
                placeholder={type === 'pourcentage' ? 'Ex: 20' : 'Ex: 2000'}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          )}

          {/* Commande minimum */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Commande minimum FCFA (optionnel)</label>
            <input
              type="number"
              value={minCommande}
              onChange={e => setMinCommande(e.target.value)}
              min={0}
              placeholder="Ex: 5000 (laisser vide si aucun)"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Max utilisations */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Limite d'utilisations (optionnel)</label>
            <input
              type="number"
              value={maxUti}
              onChange={e => setMaxUti(e.target.value)}
              min={1}
              placeholder="Ex: 100 (laisser vide = illimité)"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Date expiration */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Date d'expiration (optionnel)</label>
            <input
              type="date"
              value={dateExp}
              onChange={e => setDateExp(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold
                       disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Créer le code
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal confirmation suppression ────────────────────────
function ModalSuppression({ code, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Supprimer ce code ?</h3>
            <p className="text-sm text-gray-500 mt-1 font-mono font-bold">{code}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold
                       disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Carte code promo ───────────────────────────────────────
function CartePromo({ promo, onToggle, onDelete, actionLoading }) {
  const expired = promo.date_expiration && new Date(promo.date_expiration) < new Date()
  const plein   = promo.max_utilisations !== null && promo.utilisations >= promo.max_utilisations

  return (
    <div className={`border-t border-gray-50 first:border-0 ${!promo.actif || expired || plein ? 'opacity-60' : ''}`}>
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Code + badge type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-gray-900 font-mono text-sm tracking-wider">
                {promo.code}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeType(promo.type)}`}>
                {labelType(promo.type, promo.valeur)}
              </span>
              {!promo.actif && (
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  Inactif
                </span>
              )}
              {expired && (
                <span className="text-[10px] font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full">
                  Expiré
                </span>
              )}
              {plein && (
                <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  Quota atteint
                </span>
              )}
            </div>

            {/* Détails */}
            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-400">
              {promo.min_commande > 0 && (
                <span>Min. {formatCurrency(promo.min_commande)}</span>
              )}
              <span>
                {promo.utilisations} utilisation{promo.utilisations !== 1 ? 's' : ''}
                {promo.max_utilisations !== null ? ` / ${promo.max_utilisations}` : ' (illimité)'}
              </span>
              {promo.date_expiration && (
                <span>Expire le {dateFR(promo.date_expiration)}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onToggle(promo.id, !promo.actif)}
              disabled={actionLoading}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              title={promo.actif ? 'Désactiver' : 'Activer'}
            >
              {actionLoading
                ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                : promo.actif
                  ? <ToggleRight className="w-5 h-5 text-green-500" strokeWidth={2} />
                  : <ToggleLeft  className="w-5 h-5 text-gray-400"  strokeWidth={2} />
              }
            </button>
            <button
              onClick={() => onDelete(promo)}
              className="p-2 hover:bg-red-50 rounded-xl transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4 text-red-400" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Promos Admin
// ══════════════════════════════════════════════════════════
export default function AdminPromos() {
  const [promos,         setPromos]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [showCreation,   setShowCreation]   = useState(false)
  const [aSupprimer,     setASupprimer]     = useState(null)
  const [deleteLoading,  setDeleteLoading]  = useState(false)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { data, error } = await getPromoCodes()
      if (error) toast.error('Impossible de charger les codes promo')
      else setPromos(data)
      setLoading(false)
    }
    charger()
  }, [])

  async function handleToggle(id, actif) {
    setActionLoadingId(id)
    const { data, error } = await togglePromoCodeActif(id, actif)
    setActionLoadingId(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setPromos(prev => prev.map(p => p.id === id ? { ...p, actif: data.actif } : p))
    toast.success(actif ? 'Code activé' : 'Code désactivé')
  }

  async function handleDelete() {
    setDeleteLoading(true)
    const { error } = await deletePromoCode(aSupprimer.id)
    setDeleteLoading(false)
    setASupprimer(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setPromos(prev => prev.filter(p => p.id !== aSupprimer.id))
    toast.success('Code supprimé')
  }

  const nbActifs = promos.filter(p => p.actif).length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Codes promo</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {promos.length} code{promos.length > 1 ? 's' : ''}
          {nbActifs > 0 && (
            <span className="ml-2 text-green-600 font-semibold">{nbActifs} actif{nbActifs > 1 ? 's' : ''}</span>
          )}
        </p>
      </header>

      <div className="px-4 pt-4 space-y-4">

        {/* Bouton créer */}
        <button
          onClick={() => setShowCreation(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                     bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Nouveau code promo
        </button>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
        ) : promos.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-card text-center text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm font-medium">Aucun code promo</p>
            <p className="text-xs mt-1">Créez votre premier code pour attirer des clients.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {promos.map(p => (
              <CartePromo
                key={p.id}
                promo={p}
                onToggle={handleToggle}
                onDelete={setASupprimer}
                actionLoading={actionLoadingId === p.id}
              />
            ))}
          </div>
        )}
      </div>

      {showCreation && (
        <ModalCreation
          onClose={() => setShowCreation(false)}
          onCreate={newPromo => setPromos(prev => [newPromo, ...prev])}
        />
      )}

      {aSupprimer && (
        <ModalSuppression
          code={aSupprimer.code}
          onClose={() => setASupprimer(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
