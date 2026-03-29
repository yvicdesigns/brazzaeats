import { useState, useEffect, useRef } from 'react'
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  ImagePlus, Loader2, X, Check, ToggleLeft, ToggleRight, Clock,
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
  const [saving, setSaving] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    const nom  = form.nom.trim()
    const prix = Number(form.prix)
    if (!nom)              { toast.error('Le nom est requis');        return }
    if (!prix || prix <= 0){ toast.error('Le prix doit être > 0');    return }
    if (!form.categorieId) { toast.error('Choisissez une catégorie'); return }
    setSaving(true)
    await onSave({
      nom,
      description:      form.description.trim() || null,
      prix,
      categorieId:      form.categorieId,
      tempsPreparation: Number(form.tempsPreparation) || 15,
      disponible:       form.disponible,
      imageUrl:         form.imageUrl,
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA) *</label>
          <input
            type="number" value={form.prix} onChange={e => set('prix', e.target.value)}
            min={0} step={50} placeholder="2500"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temps (min)</label>
          <input
            type="number" value={form.tempsPreparation}
            onChange={e => set('tempsPreparation', e.target.value)}
            min={1} max={120} step={5}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
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
      setActiveCatId(cats?.[0]?.id ?? null)
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
    if (activeCatId === cat.id) setActiveCatId(reste[0]?.id ?? null)
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

  // ── Articles filtrés par onglet actif ──────────────────
  const itemsFiltres = activeCatId
    ? items.filter(i => i.categorie_id === activeCatId)
    : items

  // ── Chargement ─────────────────────────────────────────
  if (loadingResto || loading) {
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
        <p className="text-xs text-gray-400 font-medium">Gestion du menu</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Menu</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {categories.length} catégorie{categories.length !== 1 ? 's' : ''} ·{' '}
          {items.length} article{items.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="px-4 pt-5 space-y-5">

        {/* ════════════════════════════════════════
            Catégories
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Catégories</h2>
            <button
              onClick={() => setModaleCategorie('new')}
              className="flex items-center gap-1.5 bg-brand-500 text-white text-xs font-bold
                         px-3 py-2 rounded-xl hover:bg-brand-600 transition-colors min-h-[36px]"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          {categories.length === 0
            ? (
              <div className="py-10 text-center text-gray-400">
                <p className="text-sm">Aucune catégorie</p>
                <p className="text-xs mt-1">Ajoutez votre première catégorie pour commencer.</p>
              </div>
            )
            : (
              <ul className="divide-y divide-gray-50">
                {categories.map((cat, idx) => (
                  <li key={cat.id} className="flex items-center gap-3 px-4 py-3">

                    {/* Flèches réordonnement */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => deplacerCategorie(idx, -1)}
                        disabled={idx === 0}
                        className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                        aria-label="Monter"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => deplacerCategorie(idx, 1)}
                        disabled={idx === categories.length - 1}
                        className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                        aria-label="Descendre"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{cat.nom}</p>
                      <p className="text-xs text-gray-400">
                        {items.filter(i => i.categorie_id === cat.id).length} article
                        {items.filter(i => i.categorie_id === cat.id).length !== 1 ? 's' : ''}
                        {!cat.visible && ' · Masquée'}
                      </p>
                    </div>

                    {!cat.visible && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 font-medium
                                       px-2 py-0.5 rounded-full shrink-0">
                        Masquée
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setModaleCategorie(cat)}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                        aria-label="Modifier"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => supprimerCategorie(cat)}
                        className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        {/* ════════════════════════════════════════
            Articles
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Articles</h2>
            <button
              onClick={() => setModaleItem('new')}
              disabled={categories.length === 0}
              className="flex items-center gap-1.5 bg-brand-500 text-white text-xs font-bold
                         px-3 py-2 rounded-xl hover:bg-brand-600 transition-colors
                         disabled:opacity-50 min-h-[36px]"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          {/* Onglets filtrage par catégorie */}
          {categories.length > 0 && (
            <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide border-b border-gray-100">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCatId(cat.id)}
                  className={cls(
                    'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
                    activeCatId === cat.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {cat.nom}
                </button>
              ))}
            </div>
          )}

          {itemsFiltres.length === 0
            ? (
              <div className="py-10 text-center text-gray-400">
                <p className="text-sm">Aucun article dans cette catégorie</p>
              </div>
            )
            : (
              <ul className="divide-y divide-gray-50">
                {itemsFiltres.map(item => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">

                    {/* Miniature */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.nom} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                      }
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className={cls(
                        'font-semibold text-sm truncate',
                        item.disponible ? 'text-gray-800' : 'text-gray-400 line-through'
                      )}>
                        {item.nom}
                      </p>
                      <p className="text-xs font-bold text-brand-500 mt-0.5">
                        {formatCurrency(item.prix)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-gray-400">{item.temps_preparation} min</p>
                        {item.horaires && (
                          <span className="text-xs text-blue-500 font-medium truncate max-w-[120px]">
                            · {labelHoraires(item.horaires)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle disponible */}
                    <button
                      onClick={() => toggleDisponible(item)}
                      title={item.disponible ? 'Rendre indisponible' : 'Rendre disponible'}
                      className={cls(
                        'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                        item.disponible
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      )}
                    >
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setModaleHoraires(item)}
                        title="Horaires de disponibilité"
                        className={cls(
                          'p-2 rounded-xl transition-colors',
                          item.horaires
                            ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-gray-100 text-gray-400'
                        )}
                        aria-label="Horaires"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setModaleItem(item)}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                        aria-label="Modifier"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => supprimerItem(item)}
                        className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>

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
