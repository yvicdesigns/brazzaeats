import { useState, useEffect, useRef } from 'react'
import { Loader2, ImagePlus, Save, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { updateRestaurant, uploadRestaurantLogo } from '@/services/menuService'

// ── Jours de la semaine (ordre affiché) ───────────────────
const JOURS = [
  { key: 'lundi',     label: 'Lundi'    },
  { key: 'mardi',     label: 'Mardi'    },
  { key: 'mercredi',  label: 'Mercredi' },
  { key: 'jeudi',     label: 'Jeudi'    },
  { key: 'vendredi',  label: 'Vendredi' },
  { key: 'samedi',    label: 'Samedi'   },
  { key: 'dimanche',  label: 'Dimanche' },
]

// Horaires par défaut si le restaurant n'en a pas encore
const HORAIRES_DEFAUT = Object.fromEntries(
  JOURS.map(({ key }) => [key, { ouverture: '08:00', fermeture: '22:00', ferme: false }])
)

// ══════════════════════════════════════════════════════════
// Page Profil
// ══════════════════════════════════════════════════════════
export default function Profile() {
  const { restaurant, loading: loadingResto, setRestaurant } = useMyRestaurant()

  const [form, setForm] = useState({
    nom:         '',
    description: '',
    adresse:     '',
    logoUrl:     null,
    ouvert:      true,  // true = statut 'actif', false = statut 'suspendu'
  })
  const [horaires, setHoraires] = useState(HORAIRES_DEFAUT)

  const [saving,        setSaving]        = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview,   setLogoPreview]   = useState(null)

  const inputLogoRef = useRef(null)

  // ── Pré-remplir le formulaire depuis le restaurant chargé
  useEffect(() => {
    if (!restaurant) return
    setForm({
      nom:         restaurant.nom         ?? '',
      description: restaurant.description ?? '',
      adresse:     restaurant.adresse     ?? '',
      logoUrl:     restaurant.logo_url    ?? null,
      ouvert:      restaurant.statut === 'actif',
    })
    setLogoPreview(restaurant.logo_url ?? null)
    // Fusionner les horaires sauvegardées avec le défaut (au cas où un jour manquerait)
    if (restaurant.horaires && typeof restaurant.horaires === 'object') {
      setHoraires({ ...HORAIRES_DEFAUT, ...restaurant.horaires })
    }
  }, [restaurant])

  // ── Upload logo ────────────────────────────────────────
  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo trop lourd (max 5 Mo)'); return }

    setUploadingLogo(true)
    const { url, error } = await uploadRestaurantLogo(file, restaurant.id)
    setUploadingLogo(false)

    if (error) { toast.error('Erreur upload : ' + error); return }
    setLogoPreview(url)
    setForm(f => ({ ...f, logoUrl: url }))
  }

  // ── Modifier un champ du formulaire ───────────────────
  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  // ── Modifier un champ horaire ──────────────────────────
  function setHoraire(jour, champ, val) {
    setHoraires(h => ({
      ...h,
      [jour]: { ...h[jour], [champ]: val },
    }))
  }

  // ── Enregistrer ────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const nom = form.nom.trim()
    if (!nom) { toast.error('Le nom du restaurant est requis'); return }

    setSaving(true)
    const { data, error } = await updateRestaurant(restaurant.id, {
      nom,
      description: form.description.trim() || null,
      adresse:     form.adresse.trim()     || null,
      logo_url:    form.logoUrl,
      statut:      form.ouvert ? 'actif' : 'suspendu',
      horaires,
    })
    setSaving(false)

    if (error) { toast.error('Erreur : ' + error); return }
    setRestaurant(data)
    toast.success('Profil enregistré')
  }

  // ── Chargement ─────────────────────────────────────────
  if (loadingResto) {
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
        <p className="text-xs text-gray-400 font-medium">Paramètres</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Profil du restaurant</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-5">

        {/* ════════════════════════════════════════
            Logo
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <h2 className="font-bold text-gray-800 mb-4">Logo</h2>
          <div className="flex items-center gap-4">
            {/* Aperçu logo */}
            <div
              onClick={() => inputLogoRef.current?.click()}
              className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300
                         bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer
                         hover:border-brand-400 transition-colors shrink-0"
            >
              {uploadingLogo && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                </div>
              )}
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                : <ImagePlus className="w-7 h-7 text-gray-400" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Photo de profil</p>
              <p className="text-xs text-gray-400 mt-0.5">JPEG / PNG / WebP · max 5 Mo</p>
              <button
                type="button"
                onClick={() => inputLogoRef.current?.click()}
                className="mt-2 text-xs text-brand-500 font-semibold hover:underline"
              >
                {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
              </button>
            </div>
          </div>
          <input
            ref={inputLogoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>

        {/* ════════════════════════════════════════
            Informations générales
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4">
          <h2 className="font-bold text-gray-800">Informations</h2>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du restaurant *
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={e => setField('nom', e.target.value)}
              maxLength={120}
              placeholder="Le nom de votre établissement"
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
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Cuisine typique congolaise, spécialités de Brazzaville…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={form.adresse}
              onChange={e => setField('adresse', e.target.value)}
              maxLength={200}
              placeholder="Rue, numéro, repère visible…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          {/* Statut ouvert/suspendu */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium text-gray-700">Restaurant ouvert</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.ouvert ? 'Visible et commandable sur BrazzaEats' : 'Masqué des clients'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setField('ouvert', !form.ouvert)}
              className={form.ouvert ? 'text-brand-500' : 'text-gray-400'}
            >
              {form.ouvert
                ? <ToggleRight className="w-10 h-10" />
                : <ToggleLeft  className="w-10 h-10" />
              }
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════
            Horaires
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <h2 className="font-bold text-gray-800 mb-4">Horaires d'ouverture</h2>
          <div className="space-y-3">
            {JOURS.map(({ key, label }) => {
              const h = horaires[key] ?? { ouverture: '08:00', fermeture: '22:00', ferme: false }
              return (
                <div key={key} className="flex items-center gap-3">
                  {/* Toggle fermé */}
                  <button
                    type="button"
                    onClick={() => setHoraire(key, 'ferme', !h.ferme)}
                    className="shrink-0"
                    aria-label={h.ferme ? 'Ouvrir' : 'Fermer'}
                  >
                    {!h.ferme
                      ? <ToggleRight className="w-7 h-7 text-brand-500" />
                      : <ToggleLeft  className="w-7 h-7 text-gray-400" />
                    }
                  </button>

                  {/* Nom du jour */}
                  <span className={`w-20 text-sm font-medium shrink-0 ${
                    h.ferme ? 'text-gray-400' : 'text-gray-800'
                  }`}>
                    {label}
                  </span>

                  {h.ferme
                    ? (
                      <span className="text-xs text-gray-400 italic">Fermé</span>
                    )
                    : (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={h.ouverture}
                          onChange={e => setHoraire(key, 'ouverture', e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm
                                     focus:outline-none focus:ring-2 focus:ring-brand-400"
                        />
                        <span className="text-gray-400 text-xs shrink-0">→</span>
                        <input
                          type="time"
                          value={h.fermeture}
                          onChange={e => setHoraire(key, 'fermeture', e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm
                                     focus:outline-none focus:ring-2 focus:ring-brand-400"
                        />
                      </div>
                    )
                  }
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Pour fermeture après minuit (ex: 23:00 → 01:00), entrez l'heure de fin normalement.
          </p>
        </div>

        {/* ── Bouton enregistrer ───────────────────────── */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-500 text-white rounded-2xl py-4 text-base font-bold
                     hover:bg-brand-600 transition-colors disabled:opacity-60
                     flex items-center justify-center gap-2 min-h-[56px]"
        >
          {saving
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Save className="w-5 h-5" />
          }
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  )
}
