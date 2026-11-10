import { useState, useEffect, useRef } from 'react'
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  ImagePlus, Loader2, X, ToggleLeft, ToggleRight, Search, MoreVertical,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import {
  getCategories, createCategorie, updateCategorie, deleteCategorie, reorderCategories,
  getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, uploadMenuItemImage,
} from '@/services/menuService'
import { formatCurrency } from '@/utils/formatCurrency'
import { JOURS_SEMAINE, labelHoraires } from '@/utils/disponibilite'

// ── Utilitaire classes ─────────────────────────────────────
function cls(...c) { return c.filter(Boolean).join(' ') }

// ── Modale générique ───────────────────────────────────────
function Modale({ titre, onClose, children }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{titre}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── Formulaire catégorie ───────────────────────────────────
function FormulaireCategorie({ categorie, onSave, onClose }) {
  const [nom,     setNom]     = useState(categorie?.nom     ?? '')
  const [visible, setVisible] = useState(categorie?.visible ?? true)
  const [saving,  setSaving]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = nom.trim()
    if (!trimmed) { toast.error('Le nom est requis'); return }
    setSaving(true)
    await onSave({ nom: trimmed, visible })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
        <input
          type="text"
          value={nom}
          onChange={e => setNom(e.target.value)}
          placeholder="ex: Entrées, Plats, Desserts…"
          maxLength={80}
          autoFocus
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Visible dans le menu</span>
        <button type="button" onClick={() => setVisible(v => !v)} className="text-brand-500">
          {visible
            ? <ToggleRight className="w-8 h-8" />
            : <ToggleLeft  className="w-8 h-8 text-gray-400" />
          }
        </button>
      </div>

      <div className="flex gap-3 pt-2">
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
          {categorie ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

// ── Sélecteur / upload image ───────────────────────────────
function InputImage({ imageUrl, restaurantId, onChange }) {
  const inputRef  = useRef(null)
  const [preview, setPreview] = useState(imageUrl ?? null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return }
    setLoading(true)
    const { url, error } = await uploadMenuItemImage(file, restaurantId)
    setLoading(false)
    if (error) { toast.error('Erreur upload : ' + error); return }
    setPreview(url)
    onChange(url)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Photo <span className="text-gray-400">(optionnel)</span>
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className={cls(
          'relative w-full h-32 rounded-xl border-2 border-dashed flex items-center justify-center',
          'cursor-pointer overflow-hidden transition-colors',
          preview ? 'border-transparent' : 'border-gray-300 hover:border-brand-400 bg-gray-50'
        )}
      >
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        )}
        {preview
          ? <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
          : (
            <div className="text-center text-gray-400">
              <ImagePlus className="w-8 h-8 mx-auto mb-1" />
              <p className="text-xs">Ajouter une photo</p>
            </div>
          )
        }
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
             className="hidden" onChange={handleFile} />
      {preview && (
        <button
          type="button"
          onClick={() => { setPreview(null); onChange(null) }}
          className="mt-1 text-xs text-red-500 hover:underline"
        >
          Supprimer la photo
        </button>
      )}
    </div>
  )
}

// ── Formulaire article ─────────────────────────────────────
function FormulaireItem({ item, categories, restaurantId, onSave, onClose }) {
  const [form, setForm] = useState({
    nom:              item?.nom               ?? '',
    description:      item?.description       ?? '',
    prix:             item?.prix              ?? '',
    categorieId:      item?.categorie_id      ?? (categories[0]?.id ?? ''),
    tempsPreparation: item?.temps_preparation  ?? 15,
    disponible:       item?.disponible         ?? true,
    imageUrl:         item?.image_url          ?? null,
  })
  const [variantes,     setVariantes]     = useState(item?.variantes ?? [])
  const [hasVariantes,  setHasVariantes]  = useState((item?.variantes ?? []).length > 0)
  const [isBoisson,     setIsBoisson]     = useState((item?.temps_preparation ?? 15) === 0)
  const [suivreStock,   setSuivreStock]   = useState(item?.stock_quantite !== null && item?.stock_quantite !== undefined)
  const [stockQuantite, setStockQuantite] = useState(item?.stock_quantite ?? 10)
  const [saving,        setSaving]        = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  // ── Gestion variantes ──────────────────────────────────────
  function ajouterVariante()            { setVariantes(v => [...v, { nom: '', prix: '' }]) }
  function supprimerVariante(i)         { setVariantes(v => v.filter((_, idx) => idx !== i)) }
  function setVariante(i, key, val)     { setVariantes(v => v.map((x, idx) => idx === i ? { ...x, [key]: val } : x)) }

  async function handleSubmit(e) {
    e.preventDefault()
    const nom  = form.nom.trim()
    const prix = Number(form.prix)
    if (!nom)              { toast.error('Le nom est requis');        return }
    if (!prix || prix <= 0){ toast.error('Le prix doit être > 0');    return }
    if (!form.categorieId) { toast.error('Choisissez une catégorie'); return }

    // Valider les variantes si activées
    const variantesFinales = hasVariantes ? variantes : []
    if (hasVariantes) {
      if (variantesFinales.length < 2) { toast.error('Ajoutez au moins 2 variantes'); return }
      for (const v of variantesFinales) {
        if (!v.nom.trim())            { toast.error('Chaque variante doit avoir un nom'); return }
        if (!v.prix || Number(v.prix) <= 0) { toast.error('Chaque variante doit avoir un prix > 0'); return }
      }
    }

    setSaving(true)
    await onSave({
      nom,
      description:      form.description.trim() || null,
      prix,
      categorieId:      form.categorieId,
      tempsPreparation: isBoisson ? 0 : (Number(form.tempsPreparation) || 15),
      disponible:       form.disponible,
      imageUrl:         form.imageUrl,
      variantes:        hasVariantes
        ? variantesFinales.map(v => ({ nom: v.nom.trim(), prix: Number(v.prix) }))
        : null,
      stockQuantite:    suivreStock ? Math.max(0, Number(stockQuantite) || 0) : null,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Catégorie */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
        <select
          value={form.categorieId}
          onChange={e => set('categorieId', e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        >
          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {/* Nom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
        <input
          type="text" value={form.nom} onChange={e => set('nom', e.target.value)}
          placeholder="ex: Poulet braisé, Saka-saka…" maxLength={120} autoFocus
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400">(optionnel)</span>
        </label>
        <textarea
          value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Ingrédients, accompagnements…" maxLength={300} rows={2}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
      </div>

      {/* Prix + Temps préparation */}
      <div className={`grid gap-3 ${isBoisson ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA) *</label>
          <input
            type="number" value={form.prix} onChange={e => set('prix', e.target.value)}
            min={0} step={50} placeholder="2500"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        {!isBoisson && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temps (min)</label>
            <input
              type="number" value={form.tempsPreparation}
              onChange={e => set('tempsPreparation', e.target.value)}
              min={0} max={120} step={5}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        )}
      </div>

      {/* Boisson */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">C'est une boisson</p>
          <p className="text-xs text-gray-400">Pas de temps de préparation</p>
        </div>
        <button type="button" onClick={() => setIsBoisson(v => !v)} className="text-brand-500">
          {isBoisson
            ? <ToggleRight className="w-8 h-8" />
            : <ToggleLeft  className="w-8 h-8 text-gray-400" />
          }
        </button>
      </div>

      {/* ── Variantes (tailles / formats) ─────────────────── */}
      <div className="border border-gray-200 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Variantes</p>
            <p className="text-xs text-gray-400">Ex : Petit / Grand, Sans sauce / Avec sauce…</p>
          </div>
          <button type="button" onClick={() => {
            const next = !hasVariantes
            setHasVariantes(next)
            if (next && variantes.length === 0) setVariantes([{ nom: '', prix: '' }, { nom: '', prix: '' }])
          }}>
            {hasVariantes
              ? <ToggleRight className="w-8 h-8 text-brand-500" />
              : <ToggleLeft  className="w-8 h-8 text-gray-400" />
            }
          </button>
        </div>

        {hasVariantes && (
          <div className="space-y-2">
            {variantes.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={v.nom}
                  onChange={e => setVariante(i, 'nom', e.target.value)}
                  placeholder="Nom (ex: Grand)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <input
                  type="number"
                  value={v.prix}
                  onChange={e => setVariante(i, 'prix', e.target.value)}
                  placeholder="Prix"
                  min={0} step={50}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <button
                  type="button"
                  onClick={() => supprimerVariante(i)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={ajouterVariante}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-500
                         hover:text-brand-600 mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une variante
            </button>
          </div>
        )}
      </div>

      {/* Disponible */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Disponible à la commande</span>
        <button type="button" onClick={() => set('disponible', !form.disponible)}
                className="text-brand-500">
          {form.disponible
            ? <ToggleRight className="w-8 h-8" />
            : <ToggleLeft  className="w-8 h-8 text-gray-400" />
          }
        </button>
      </div>

      {/* Stock */}
      <div className="border border-gray-200 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Suivre le stock</p>
            <p className="text-xs text-gray-400">
              Se désactive automatiquement à la commande une fois à 0
            </p>
          </div>
          <button type="button" onClick={() => setSuivreStock(v => !v)}>
            {suivreStock
              ? <ToggleRight className="w-8 h-8 text-brand-500" />
              : <ToggleLeft  className="w-8 h-8 text-gray-400" />
            }
          </button>
        </div>
        {suivreStock && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité disponible</label>
            <input
              type="number" value={stockQuantite}
              onChange={e => setStockQuantite(e.target.value)}
              min={0} step={1}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        )}
      </div>

      {/* Photo */}
      <InputImage imageUrl={form.imageUrl} restaurantId={restaurantId}
                  onChange={url => set('imageUrl', url)} />

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
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
          {item ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}

// ── Modale horaires par article ────────────────────────────
function ModaleHoraires({ item, onSave, onClose }) {
  const init = item.horaires ?? { jours: [], heure_debut: '', heure_fin: '' }
  const [jours,      setJours]      = useState(init.jours ?? [])
  const [heureDebut, setHeureDebut] = useState(init.heure_debut ?? '')
  const [heureFin,   setHeureFin]   = useState(init.heure_fin   ?? '')
  const [saving,     setSaving]     = useState(false)

  function toggleJour(val) {
    setJours(prev =>
      prev.includes(val) ? prev.filter(j => j !== val) : [...prev, val]
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    if (heureDebut && heureFin && heureFin <= heureDebut) {
      toast.error("L'heure de fin doit être après l'heure de début")
      return
    }
    // null = pas de restriction
    const horaires = (!heureDebut && !heureFin && jours.length === 0)
      ? null
      : { jours, heure_debut: heureDebut || null, heure_fin: heureFin || null }
    setSaving(true)
    await onSave(horaires)
    setSaving(false)
  }

  async function handleSupprimer() {
    setSaving(true)
    await onSave(null)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <p className="text-sm text-gray-500">
        Définissez quand cet article est commandable. Laissez vide pour aucune restriction.
      </p>

      {/* Jours */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Jours disponibles</label>
        <div className="flex flex-wrap gap-2">
          {JOURS_SEMAINE.map(({ val, court }) => (
            <button
              key={val}
              type="button"
              onClick={() => toggleJour(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors
                ${jours.includes(val)
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                }`}
            >
              {court}
            </button>
          ))}
        </div>
        {jours.length === 0 && (
          <p className="text-xs text-gray-400 mt-1.5">Aucun jour sélectionné = tous les jours</p>
        )}
      </div>

      {/* Plage horaire */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Plage horaire</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">De</p>
            <input
              type="time"
              value={heureDebut}
              onChange={e => setHeureDebut(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">À</p>
            <input
              type="time"
              value={heureFin}
              onChange={e => setHeureFin(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
        {(!heureDebut && !heureFin) && (
          <p className="text-xs text-gray-400 mt-1.5">Aucune heure = disponible toute la journée</p>
        )}
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-1">
        {item.horaires && (
          <button
            type="button"
            onClick={handleSupprimer}
            disabled={saving}
            className="border border-red-200 text-red-500 rounded-xl py-3 px-4 text-sm font-medium
                       hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Supprimer
          </button>
        )}
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
          Enregistrer
        </button>
      </div>
    </form>
  )
}

// ══════════════════════════════════════════════════════════
// Page Menu
// ══════════════════════════════════════════════════════════
export default function Menu() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()

  const [categories,  setCategories]  = useState([])
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeCatId, setActiveCatId] = useState(null)

  // Modales : null | 'new' | objet existant
  const [modaleCategorie, setModaleCategorie] = useState(null)
  const [modaleItem,      setModaleItem]      = useState(null)
  const [modaleHoraires,  setModaleHoraires]  = useState(null) // null | objet item
  const [gestionCategories, setGestionCategories] = useState(false)
  const [menuItemId,      setMenuItemId]      = useState(null)
  const [filtre,          setFiltre]          = useState('')

  // ── Chargement ─────────────────────────────────────────
  useEffect(() => {
    if (!restaurant?.id) return

    async function charger() {
      setLoading(true)
      const [{ data: cats }, { data: its }] = await Promise.all([
        getCategories(restaurant.id),
        getMenuItems(restaurant.id),
      ])
      setCategories(cats ?? [])
      setItems(its ?? [])
      setLoading(false)
    }

    charger()
  }, [restaurant?.id])

  // ── Catégories CRUD ────────────────────────────────────
  async function sauvegarderCategorie(donnees) {
    if (modaleCategorie === 'new') {
      const { data, error } = await createCategorie(restaurant.id, {
        ...donnees,
        ordre: categories.length,
      })
      if (error) { toast.error('Erreur : ' + error); return }
      setCategories(c => [...c, data])
      setActiveCatId(data.id)
      toast.success('Catégorie créée')
    } else {
      const { data, error } = await updateCategorie(modaleCategorie.id, donnees)
      if (error) { toast.error('Erreur : ' + error); return }
      setCategories(c => c.map(x => x.id === data.id ? data : x))
      toast.success('Catégorie modifiée')
    }
    setModaleCategorie(null)
  }

  async function supprimerCategorie(cat) {
    if (!window.confirm(`Supprimer "${cat.nom}" et tous ses articles ?`)) return
    const { error } = await deleteCategorie(cat.id)
    if (error) { toast.error('Erreur : ' + error); return }
    const reste = categories.filter(c => c.id !== cat.id)
    setCategories(reste)
    setItems(its => its.filter(i => i.categorie_id !== cat.id))
    if (activeCatId === cat.id) setActiveCatId(null)
    toast.success('Catégorie supprimée')
  }

  async function deplacerCategorie(index, direction) {
    const cible = index + direction
    if (cible < 0 || cible >= categories.length) return
    const nouvellesCats = [...categories]
    ;[nouvellesCats[index], nouvellesCats[cible]] = [nouvellesCats[cible], nouvellesCats[index]]
    setCategories(nouvellesCats.map((c, i) => ({ ...c, ordre: i })))
    const { error } = await reorderCategories(nouvellesCats.map((c, i) => ({ id: c.id, ordre: i })))
    if (error) toast.error('Erreur réorganisation')
  }

  // ── Articles CRUD ──────────────────────────────────────
  async function sauvegarderItem(donnees) {
    if (modaleItem === 'new') {
      const { data, error } = await createMenuItem({
        restaurantId:     restaurant.id,
        categorieId:      donnees.categorieId,
        nom:              donnees.nom,
        description:      donnees.description,
        prix:             donnees.prix,
        imageUrl:         donnees.imageUrl,
        disponible:       donnees.disponible,
        tempsPreparation: donnees.tempsPreparation,
        variantes:        donnees.variantes ?? null,
        stockQuantite:    donnees.stockQuantite,
      })
      if (error) { toast.error('Erreur : ' + error); return }
      setItems(its => [...its, data])
      toast.success('Article ajouté')
    } else {
      const { data, error } = await updateMenuItem(modaleItem.id, {
        categorie_id:      donnees.categorieId,
        nom:               donnees.nom,
        description:       donnees.description,
        prix:              donnees.prix,
        image_url:         donnees.imageUrl,
        disponible:        donnees.disponible,
        temps_preparation: donnees.tempsPreparation,
        variantes:         donnees.variantes ?? null,
        stock_quantite:    donnees.stockQuantite,
      })
      if (error) { toast.error('Erreur : ' + error); return }
      setItems(its => its.map(x => x.id === data.id ? data : x))
      toast.success('Article modifié')
    }
    setModaleItem(null)
  }

  async function supprimerItem(item) {
    if (!window.confirm(`Supprimer "${item.nom}" ?`)) return
    const { error } = await deleteMenuItem(item.id)
    if (error) { toast.error('Erreur : ' + error); return }
    setItems(its => its.filter(i => i.id !== item.id))
    toast.success('Article supprimé')
  }

  async function toggleDisponible(item) {
    const { data, error } = await updateMenuItem(item.id, { disponible: !item.disponible })
    if (error) { toast.error('Erreur'); return }
    setItems(its => its.map(x => x.id === data.id ? data : x))
  }

  async function sauvegarderHoraires(horaires) {
    const { data, error } = await updateMenuItem(modaleHoraires.id, { horaires })
    if (error) { toast.error('Erreur : ' + error); return }
    setItems(its => its.map(x => x.id === data.id ? data : x))
    toast.success(horaires ? 'Horaires enregistrés' : 'Restriction supprimée')
    setModaleHoraires(null)
  }

  // ── Chargement ─────────────────────────────────────────
  if (loadingResto || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  const recherche = filtre.trim().toLowerCase()
  const visibles = items.filter(i =>
    (!activeCatId || i.categorie_id === activeCatId) &&
    (!recherche || i.nom.toLowerCase().includes(recherche))
  )
  const groupes = categories
    .map(cat => ({ cat, articles: visibles.filter(i => i.categorie_id === cat.id) }))
    .filter(g => g.articles.length > 0)

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10">

      <header className="max-w-3xl mx-auto px-5 lg:px-8 pt-12 md:pt-8 pb-3 flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Menu</h1>
          <button
            onClick={() => setModaleItem('new')}
            disabled={categories.length === 0}
            className="h-10 px-3.5 rounded-xl bg-brand-500 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Ajouter un plat
          </button>
        </div>
        <label className="flex items-center gap-2.5 h-11 rounded-xl bg-gray-100 px-3.5 text-gray-500">
          <Search className="w-[18px] h-[18px] shrink-0" />
          <span className="sr-only">Rechercher un plat</span>
          <input
            type="search" value={filtre} onChange={e => setFiltre(e.target.value)}
            placeholder="Rechercher un plat"
            className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-gray-900 placeholder:text-gray-500"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ id: null, nom: 'Tout' }, ...categories].map(cat => (
            <button
              key={cat.id ?? 'tout'}
              onClick={() => setActiveCatId(cat.id)}
              aria-pressed={activeCatId === cat.id}
              className={cls(
                'h-9 px-3.5 rounded-full text-[13px] font-bold whitespace-nowrap shrink-0',
                activeCatId === cat.id ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-900'
              )}
            >
              {cat.nom}{cat.id && !cat.visible ? ' (masquée)' : ''}
            </button>
          ))}
          <button
            onClick={() => setGestionCategories(true)}
            className="h-9 px-3.5 rounded-full text-[13px] font-bold whitespace-nowrap shrink-0 border border-dashed border-gray-300 text-gray-600"
          >
            Catégories…
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 lg:px-8">
        {categories.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3">
            <p className="text-[15px] font-bold text-gray-900">Commencez par créer une catégorie</p>
            <p className="text-sm font-semibold text-gray-500">Par exemple : Plats, Grillades, Boissons.</p>
            <button onClick={() => setModaleCategorie('new')} className="h-11 px-4 rounded-xl bg-brand-500 text-white text-sm font-bold">
              Créer une catégorie
            </button>
          </div>
        ) : groupes.length === 0 ? (
          <p className="py-16 text-center text-sm font-semibold text-gray-500">
            {recherche ? 'Aucun plat ne correspond à cette recherche.' : 'Aucun plat dans cette catégorie.'}
          </p>
        ) : groupes.map(({ cat, articles }) => (
          <section key={cat.id} className="pt-3">
            <h2 className="text-[13px] font-bold text-gray-500 py-1.5">
              {cat.nom} · {articles.length} plat{articles.length > 1 ? 's' : ''}
            </h2>
            <ul>
              {articles.map(item => {
                const enRupture = !item.disponible || (item.stock_quantite != null && item.stock_quantite <= 0)
                const details = [
                  item.variantes?.length ? `${item.variantes.length} tailles` : null,
                  item.temps_preparation ? `${item.temps_preparation} min` : null,
                  item.horaires ? labelHoraires(item.horaires) : null,
                  item.stock_quantite != null && item.stock_quantite > 0 ? `Stock : ${item.stock_quantite}` : null,
                ].filter(Boolean).join(' · ')
                return (
                  <li key={item.id} className="flex items-center gap-3 py-3.5 border-b border-gray-100 relative">
                    <div className={cls('w-[60px] h-[60px] rounded-xl overflow-hidden bg-gray-100 shrink-0', enRupture && 'opacity-50')}>
                      {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className={cls('text-[15px] font-bold truncate', enRupture ? 'text-gray-500' : 'text-gray-900')}>{item.nom}</span>
                      {enRupture
                        ? <span className="text-[13px] font-bold text-terracotta-700">En rupture · masqué aux clients</span>
                        : details && <span className="text-[13px] font-semibold text-gray-500 truncate">{details}</span>}
                      <span className={cls('text-[15px] font-extrabold tabular-nums', enRupture ? 'text-gray-500' : 'text-gray-900')}>{formatCurrency(item.prix)}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.disponible}
                      aria-label={`${item.nom} disponible`}
                      onClick={() => toggleDisponible(item)}
                      className="flex flex-col items-center gap-1 text-[11px] font-bold text-gray-600 shrink-0 w-[68px]"
                    >
                      <span className={cls('w-[46px] h-7 rounded-full relative transition-colors', item.disponible ? 'bg-brand-500' : 'bg-gray-300')}>
                        <span className={cls('absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-all', item.disponible ? 'left-[21px]' : 'left-[3px]')} />
                      </span>
                      {item.disponible ? 'Disponible' : 'Rupture'}
                    </button>
                    <button
                      type="button"
                      aria-label={`Plus d'actions pour ${item.nom}`}
                      aria-expanded={menuItemId === item.id}
                      onClick={() => setMenuItemId(id => id === item.id ? null : item.id)}
                      className="w-9 h-11 flex items-center justify-center text-gray-500 shrink-0 rounded-lg hover:bg-gray-50"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {menuItemId === item.id && (
                      <>
                        <button className="fixed inset-0 z-10 cursor-default" aria-label="Fermer le menu" onClick={() => setMenuItemId(null)} />
                        <div role="menu" className="absolute right-0 top-[calc(100%-8px)] z-20 w-60 bg-white border border-gray-200 rounded-2xl p-1.5 shadow-xl flex flex-col">
                          <button role="menuitem" onClick={() => { setMenuItemId(null); setModaleItem(item) }}
                                  className="h-11 px-3 rounded-xl text-left text-[15px] font-semibold text-gray-900 hover:bg-gray-50">Modifier le plat</button>
                          <button role="menuitem" onClick={() => { setMenuItemId(null); setModaleHoraires(item) }}
                                  className="h-11 px-3 rounded-xl text-left text-[15px] font-semibold text-gray-900 hover:bg-gray-50">Horaires de disponibilité</button>
                          <button role="menuitem" onClick={() => { setMenuItemId(null); supprimerItem(item) }}
                                  className="h-11 px-3 rounded-xl text-left text-[15px] font-semibold text-terracotta-700 hover:bg-terracotta-50 border-t border-gray-100 mt-1 pt-1">Supprimer…</button>
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </main>

      {gestionCategories && (
        <Modale titre="Catégories" onClose={() => setGestionCategories(false)}>
          <ul className="divide-y divide-gray-100 -mt-2">
            {categories.map((cat, idx) => {
              const nb = items.filter(i => i.categorie_id === cat.id).length
              return (
                <li key={cat.id} className="flex items-center gap-2 py-3">
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => deplacerCategorie(idx, -1)} disabled={idx === 0} aria-label={`Monter ${cat.nom}`}
                            className="w-8 h-6 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30">
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    </button>
                    <button onClick={() => deplacerCategorie(idx, 1)} disabled={idx === categories.length - 1} aria-label={`Descendre ${cat.nom}`}
                            className="w-8 h-6 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30">
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-gray-900 truncate">{cat.nom}</p>
                    <p className="text-[13px] font-semibold text-gray-500">{nb} plat{nb !== 1 ? 's' : ''}{!cat.visible ? ' · masquée aux clients' : ''}</p>
                  </div>
                  <button onClick={() => setModaleCategorie(cat)} aria-label={`Modifier ${cat.nom}`}
                          className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-gray-50">
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => supprimerCategorie(cat)} aria-label={`Supprimer ${cat.nom}`}
                          className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-terracotta-50">
                    <Trash2 className="w-4 h-4 text-terracotta-700" />
                  </button>
                </li>
              )
            })}
          </ul>
          <button onClick={() => setModaleCategorie('new')}
                  className="mt-3 w-full h-12 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Nouvelle catégorie
          </button>
        </Modale>
      )}

      {/* ── Modales ─────────────────────────────────────── */}
      {modaleCategorie && (
        <Modale
          titre={modaleCategorie === 'new' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
          onClose={() => setModaleCategorie(null)}
        >
          <FormulaireCategorie
            categorie={modaleCategorie === 'new' ? null : modaleCategorie}
            onSave={sauvegarderCategorie}
            onClose={() => setModaleCategorie(null)}
          />
        </Modale>
      )}

      {modaleItem && (
        <Modale
          titre={modaleItem === 'new' ? 'Nouvel article' : "Modifier l'article"}
          onClose={() => setModaleItem(null)}
        >
          <FormulaireItem
            item={modaleItem === 'new' ? null : modaleItem}
            categories={categories}
            restaurantId={restaurant.id}
            onSave={sauvegarderItem}
            onClose={() => setModaleItem(null)}
          />
        </Modale>
      )}

      {modaleHoraires && (
        <Modale
          titre={`Horaires — ${modaleHoraires.nom}`}
          onClose={() => setModaleHoraires(null)}
        >
          <ModaleHoraires
            item={modaleHoraires}
            onSave={sauvegarderHoraires}
            onClose={() => setModaleHoraires(null)}
          />
        </Modale>
      )}
    </div>
  )
}
