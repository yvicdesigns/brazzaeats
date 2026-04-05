import { useState, useEffect, useRef } from 'react'
import { Loader2, ImagePlus, Save, ToggleLeft, ToggleRight, Video, X, UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { updateRestaurant, uploadRestaurantLogo, uploadRestaurantVideo, uploadRestaurantVideoApercu } from '@/services/menuService'

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

  const [saving,          setSaving]          = useState(false)
  const [uploadingLogo,   setUploadingLogo]   = useState(false)
  const [logoPreview,     setLogoPreview]     = useState(null)
  const [uploadingVideo,        setUploadingVideo]        = useState(false)
  const [videoProgress,         setVideoProgress]         = useState(0)
  const [videoUrl,              setVideoUrl]              = useState(null)
  const [uploadingApercu,       setUploadingApercu]       = useState(false)
  const [apercuProgress,        setApercuProgress]        = useState(0)
  const [videoApercuUrl,        setVideoApercuUrl]        = useState(null)

  const inputLogoRef   = useRef(null)
  const inputVideoRef  = useRef(null)
  const inputApercuRef = useRef(null)

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
    setVideoUrl(restaurant.video_url ?? null)
    setVideoApercuUrl(restaurant.video_apercu_url ?? null)
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

  // ── Upload vidéo ───────────────────────────────────────
  async function handleVideoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.includes('mp4') && !file.name.endsWith('.mp4')) {
      toast.error('Seul le format MP4 est accepté')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Vidéo trop lourde (max 100 Mo)')
      return
    }

    setUploadingVideo(true)
    setVideoProgress(0)

    // Simulation de progression pendant l'upload
    const interval = setInterval(() => {
      setVideoProgress(p => Math.min(p + Math.random() * 15, 90))
    }, 400)

    const { url, error } = await uploadRestaurantVideo(file, restaurant.id)
    clearInterval(interval)
    setVideoProgress(100)

    setTimeout(() => {
      setUploadingVideo(false)
      setVideoProgress(0)
    }, 600)

    if (error) { toast.error('Erreur upload : ' + error); return }

    setVideoUrl(url)
    // Sauvegarder immédiatement l'URL en base
    await updateRestaurant(restaurant.id, { video_url: url })
    toast.success('Vidéo mise en ligne !')
    e.target.value = ''
  }

  // ── Upload vidéo aperçu (accueil) ──────────────────────
  async function handleApercuChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.includes('mp4') && !file.name.endsWith('.mp4')) {
      toast.error('Seul le format MP4 est accepté')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Vidéo trop lourde (max 20 Mo)')
      return
    }

    // Vérification durée côté client (max 6 sec)
    const duree = await new Promise(resolve => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration) }
      v.src = URL.createObjectURL(file)
    })

    if (duree > 10) {
      toast.error(`Vidéo trop longue (${duree.toFixed(1)}s) — max 10 secondes`)
      e.target.value = ''
      return
    }

    setUploadingApercu(true)
    setApercuProgress(0)
    const interval = setInterval(() => {
      setApercuProgress(p => Math.min(p + Math.random() * 20, 90))
    }, 300)

    const { url, error } = await uploadRestaurantVideoApercu(file, restaurant.id)
    clearInterval(interval)
    setApercuProgress(100)
    setTimeout(() => { setUploadingApercu(false); setApercuProgress(0) }, 500)

    if (error) { toast.error('Erreur upload : ' + error); return }

    setVideoApercuUrl(url)
    await updateRestaurant(restaurant.id, { video_apercu_url: url })
    toast.success('Vidéo aperçu mise en ligne !')
    e.target.value = ''
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
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => inputLogoRef.current?.click()}
                  className="text-xs text-brand-500 font-semibold hover:underline"
                >
                  {logoPreview ? 'Changer' : 'Ajouter un logo'}
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={async () => {
                      setLogoPreview(null)
                      setForm(f => ({ ...f, logoUrl: null }))
                      await updateRestaurant(restaurant.id, { logo_url: null })
                      toast.success('Photo supprimée')
                    }}
                    className="text-xs text-red-400 font-semibold hover:underline"
                  >
                    Supprimer
                  </button>
                )}
              </div>
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
            Vidéo aperçu (carte d'accueil)
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-bold text-gray-800">Vidéo aperçu</h2>
              <p className="text-xs text-gray-400 mt-0.5">Jouée en boucle sur la carte d'accueil · max 10 sec · MP4</p>
            </div>
            <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <Video className="w-4 h-4 text-brand-500" />
            </div>
          </div>

          {videoApercuUrl && !uploadingApercu && (
            <div className="relative rounded-xl overflow-hidden bg-black mt-3 mb-3">
              <video
                src={videoApercuUrl}
                autoPlay muted loop playsInline
                className="w-full max-h-36 object-cover"
              />
              <button
                type="button"
                onClick={async () => {
                  setVideoApercuUrl(null)
                  await updateRestaurant(restaurant.id, { video_apercu_url: null })
                  toast.success('Vidéo aperçu supprimée')
                }}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white
                           rounded-full p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {uploadingApercu && (
            <div className="mt-3 mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                  Téléversement…
                </span>
                <span className="font-bold text-brand-500">{Math.round(apercuProgress)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{ width: `${apercuProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => inputApercuRef.current?.click()}
            disabled={uploadingApercu}
            className="w-full flex flex-col items-center justify-center gap-2 py-4
                       border-2 border-dashed border-gray-200 rounded-xl text-gray-400
                       hover:border-brand-400 hover:text-brand-500 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            <UploadCloud className="w-5 h-5" />
            <span className="text-sm font-semibold">
              {videoApercuUrl ? 'Remplacer la vidéo aperçu' : 'Ajouter une vidéo aperçu'}
            </span>
          </button>
          <input ref={inputApercuRef} type="file" accept="video/mp4,.mp4" className="hidden" onChange={handleApercuChange} />
        </div>

        {/* ════════════════════════════════════════
            Vidéo de présentation
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-800">Vidéo de présentation</h2>
              <p className="text-xs text-gray-400 mt-0.5">MP4 · max 100 Mo</p>
            </div>
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <Video className="w-4 h-4 text-purple-500" />
            </div>
          </div>

          {/* Lecteur vidéo si déjà uploadée */}
          {videoUrl && !uploadingVideo && (
            <div className="relative rounded-xl overflow-hidden bg-black mb-3">
              <video
                src={videoUrl}
                controls
                className="w-full max-h-52 object-contain"
                playsInline
              />
              <button
                type="button"
                onClick={async () => {
                  setVideoUrl(null)
                  await updateRestaurant(restaurant.id, { video_url: null })
                  toast.success('Vidéo supprimée')
                }}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white
                           rounded-full p-1.5 transition-colors"
                title="Supprimer la vidéo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Barre de progression pendant l'upload */}
          {uploadingVideo && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                  Téléversement en cours…
                </span>
                <span className="font-bold text-brand-500">{Math.round(videoProgress)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Zone de drop / bouton upload */}
          <button
            type="button"
            onClick={() => inputVideoRef.current?.click()}
            disabled={uploadingVideo}
            className="w-full flex flex-col items-center justify-center gap-2 py-5
                       border-2 border-dashed border-gray-200 rounded-xl text-gray-400
                       hover:border-brand-400 hover:text-brand-500 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadCloud className="w-6 h-6" />
            <span className="text-sm font-semibold">
              {videoUrl ? 'Remplacer la vidéo' : 'Ajouter une vidéo MP4'}
            </span>
            <span className="text-xs">Cliquez pour sélectionner</span>
          </button>

          <input
            ref={inputVideoRef}
            type="file"
            accept="video/mp4,.mp4"
            className="hidden"
            onChange={handleVideoChange}
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
