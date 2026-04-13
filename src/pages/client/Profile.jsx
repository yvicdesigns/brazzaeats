/**
 * Profil client — informations, adresses, messages, fidélité, solde, partage
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Phone, MapPin, ShoppingBag, MessageSquare, Gift,
  Wallet, Share2, ChevronRight, Plus, Trash2, Star,
  Camera, Check, Edit2, LogOut, Loader2, Home, Briefcase,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/supabase/client'
import { formatCurrency } from '@/utils/formatCurrency'
import { QUARTIERS_BRAZZAVILLE } from '@/utils/constants'
import ChatModal from '@/components/shared/ChatModal'
import {
  getAdresses,
  addAdresse,
  updateAdresse,
  deleteAdresse,
  setAdresseDefaut,
} from '@/services/adresseService'

// ── Paliers de fidélité ───────────────────────────────────
const TIERS = [
  { min: 0,    max: 499,      nom: 'Bronze',  emoji: '🥉', gradient: 'from-amber-700 to-amber-400',    ring: 'ring-amber-300'   },
  { min: 500,  max: 999,      nom: 'Argent',  emoji: '🥈', gradient: 'from-gray-500 to-gray-300',      ring: 'ring-gray-300'    },
  { min: 1000, max: 1999,     nom: 'Or',      emoji: '🥇', gradient: 'from-yellow-600 to-yellow-300',  ring: 'ring-yellow-300'  },
  { min: 2000, max: Infinity, nom: 'Platine', emoji: '💎', gradient: 'from-indigo-600 to-purple-400',  ring: 'ring-indigo-300'  },
]

function getTier(points) {
  return TIERS.find(t => points >= t.min && points <= t.max) ?? TIERS[0]
}

// ── Recadrage photo ───────────────────────────────────────
const CROP_SIZE = 260

function CropModal({ imageUrl, onSave, onClose, saving }) {
  const canvasRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos = useRef(null)
  const imgEl = useRef(null)

  const draw = useCallback((img, off, sc) => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE)

    const s = sc * Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight)
    const w = img.naturalWidth * s
    const h = img.naturalHeight * s
    const x = (CROP_SIZE - w) / 2 + off.x
    const y = (CROP_SIZE - h) / 2 + off.y
    ctx.drawImage(img, x, y, w, h)

    // Masque sombre hors du cercle
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2 - 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2 - 6, 0, Math.PI * 2)
    ctx.stroke()
  }, [])

  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgEl.current = img; draw(img, { x: 0, y: 0 }, 1) }
    img.src = imageUrl
  }, [imageUrl, draw])

  useEffect(() => {
    if (imgEl.current) draw(imgEl.current, offset, scale)
  }, [offset, scale, draw])

  const getEventPos = e => e.touches
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
    : { x: e.clientX, y: e.clientY }

  const onPointerDown = e => { dragging.current = true; lastPos.current = getEventPos(e) }
  const onPointerMove = e => {
    if (!dragging.current || !lastPos.current) return
    const pos = getEventPos(e)
    setOffset(prev => ({ x: prev.x + pos.x - lastPos.current.x, y: prev.y + pos.y - lastPos.current.y }))
    lastPos.current = pos
  }
  const onPointerUp = () => { dragging.current = false }

  function handleSave() {
    const out = document.createElement('canvas')
    out.width = CROP_SIZE; out.height = CROP_SIZE
    const ctx = out.getContext('2d')
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const img = imgEl.current
    if (!img) return
    const s = scale * Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight)
    const w = img.naturalWidth * s; const h = img.naturalHeight * s
    const x = (CROP_SIZE - w) / 2 + offset.x; const y = (CROP_SIZE - h) / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)
    out.toBlob(blob => onSave(blob), 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-4">
        <h3 className="font-bold text-gray-900 text-center mb-1">Recadrer la photo</h3>
        <p className="text-xs text-center text-gray-400 mb-5">Glissez · Zoomez avec le curseur</p>

        <div className="flex justify-center mb-5">
          <canvas
            ref={canvasRef}
            width={CROP_SIZE} height={CROP_SIZE}
            className="cursor-grab active:cursor-grabbing touch-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE, borderRadius: '50%', overflow: 'hidden' }}
            onMouseDown={onPointerDown} onMouseMove={onPointerMove}
            onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
          />
        </div>

        <div className="px-2 mb-5">
          <input
            type="range" min={0.5} max={3} step={0.05}
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>−</span><span>Zoom</span><span>+</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm
                       disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Icône pour le type d'adresse ─────────────────────────
function IconeAdresse({ label }) {
  const l = (label ?? '').toLowerCase()
  if (l.includes('bureau') || l.includes('travail') || l.includes('boulot'))
    return <Briefcase className="w-4 h-4" />
  return <Home className="w-4 h-4" />
}

// ── Formulaire ajout / modification adresse ───────────────
function FormulaireAdresse({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    label:      initial?.label      ?? 'Maison',
    rue:        initial?.rue        ?? '',
    quartier:   initial?.quartier   ?? '',
    indication: initial?.indication ?? '',
  })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const valide = form.label.trim() && form.rue.trim() && form.quartier

  return (
    <div className="space-y-3 pt-2">
      <div>
        <label className="text-xs text-gray-500 font-medium">Nom de l'adresse</label>
        <input
          value={form.label}
          onChange={e => set('label', e.target.value)}
          placeholder="ex : Maison, Bureau…"
          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 font-medium">Rue / Avenue</label>
        <input
          value={form.rue}
          onChange={e => set('rue', e.target.value)}
          placeholder="ex : Avenue de l'Indépendance"
          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 font-medium">Quartier</label>
        <select
          value={form.quartier}
          onChange={e => set('quartier', e.target.value)}
          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                     bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">— Choisir un quartier —</option>
          {QUARTIERS_BRAZZAVILLE.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 font-medium">Indication (facultatif)</label>
        <input
          value={form.indication}
          onChange={e => set('indication', e.target.value)}
          placeholder="ex : Portail rouge, 2ème maison à gauche"
          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold"
        >
          Annuler
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!valide}
          className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-40"
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}

// ── Composant section (carte cliquable) ───────────────────
function SectionCard({ icon, iconBg, title, subtitle, expanded, onToggle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>
      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-5">
          {children}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Profil
// ══════════════════════════════════════════════════════════
export default function Profile() {
  const { user, profile, updateProfile, logout } = useAuth()
  const navigate = useNavigate()

  // ── Photo ────────────────────────────────────────────────
  const fileInputRef = useRef(null)
  const [cropImageUrl, setCropImageUrl] = useState(null)
  const [savingPhoto,  setSavingPhoto]  = useState(false)

  // ── Infos perso ──────────────────────────────────────────
  const [sectionInfos,   setSectionInfos]   = useState(false)
  const [formNom,        setFormNom]        = useState('')
  const [formTel,        setFormTel]        = useState('')
  const [formUsername,   setFormUsername]   = useState('')
  const [savingInfos,    setSavingInfos]    = useState(false)
  const [usernameErreur, setUsernameErreur] = useState('')

  // ── Adresses ─────────────────────────────────────────────
  const [sectionAdresses,  setSectionAdresses]  = useState(false)
  const [adresses,         setAdresses]         = useState([])
  const [loadAdresses,     setLoadAdresses]     = useState(false)
  const [formAdresse,      setFormAdresse]      = useState(null) // null | 'new' | objet adresse

  // ── Messages ─────────────────────────────────────────────
  const [sectionMessages,   setSectionMessages]   = useState(false)
  const [conversations,     setConversations]     = useState([])
  const [loadConversations, setLoadConversations] = useState(false)
  const [chatOuvert,        setChatOuvert]        = useState(null) // { orderId, titreChat }

  // ── Fidélité ─────────────────────────────────────────────
  const [sectionFidelite, setSectionFidelite] = useState(false)

  // ── Solde ────────────────────────────────────────────────
  const [sectionSolde, setSectionSolde] = useState(false)

  const points = profile?.points_fidelite ?? 0
  const solde  = profile?.solde ?? 0
  const tier   = getTier(points)
  const tierSuivant = TIERS.find(t => t.min > points)

  // ── Charger adresses quand section ouvre ─────────────────
  useEffect(() => {
    if (!sectionAdresses || !user?.id) return
    setLoadAdresses(true)
    getAdresses(user.id).then(({ data }) => {
      setAdresses(data)
      setLoadAdresses(false)
    })
  }, [sectionAdresses, user?.id])

  // ── Charger conversations quand section ouvre ────────────
  useEffect(() => {
    if (!sectionMessages || !user?.id) return
    setLoadConversations(true)
    supabase
      .from('orders')
      .select(`
        id, created_at, statut,
        restaurant:restaurants(nom),
        messages(id)
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        const avecMessages = (data ?? []).filter(o => (o.messages?.length ?? 0) > 0)
        setConversations(avecMessages.slice(0, 10))
        setLoadConversations(false)
      })
  }, [sectionMessages, user?.id])

  // ── Upload photo ─────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropImageUrl(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleCropSave(blob) {
    setSavingPhoto(true)
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    const path = `${user.id}/avatar.jpg`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (upErr) {
      toast.error('Erreur lors du téléversement')
      setSavingPhoto(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error } = await updateProfile({ photo_url: `${publicUrl}?t=${Date.now()}` })
    if (error) toast.error('Erreur lors de la mise à jour')
    else toast.success('Photo mise à jour !')
    setCropImageUrl(null)
    setSavingPhoto(false)
  }

  // ── Sauvegarder infos ────────────────────────────────────
  function openInfos() {
    setFormNom(profile?.nom ?? '')
    setFormTel(profile?.telephone ?? '')
    setFormUsername(profile?.username ?? '')
    setUsernameErreur('')
    setSectionInfos(true)
  }

  async function saveInfos() {
    if (!formNom.trim()) return
    const uname = formUsername.trim()
    if (uname && !/^[a-zA-Z0-9_.]{3,30}$/.test(uname)) {
      setUsernameErreur('Entre 3 et 30 caractères (lettres, chiffres, _ ou .)')
      return
    }
    setUsernameErreur('')
    setSavingInfos(true)
    const { error } = await updateProfile({
      nom:      formNom.trim(),
      telephone: formTel.trim(),
      username: uname || null,
    })
    if (error) toast.error('Erreur lors de la mise à jour')
    else { toast.success('Profil mis à jour !'); setSectionInfos(false) }
    setSavingInfos(false)
  }

  // Vérifie si l'email Supabase est un email interne généré
  const emailInterne = user?.email?.endsWith('@brazzaeats.local')

  // ── Sauvegarder adresse ──────────────────────────────────
  async function handleSaveAdresse(form) {
    if (!user?.id) return
    if (formAdresse === 'new') {
      const { data, error } = await addAdresse(user.id, form)
      if (error) { toast.error('Erreur'); return }
      setAdresses(prev => [...prev, data])
    } else {
      const { error } = await updateAdresse(formAdresse.id, form)
      if (error) { toast.error('Erreur'); return }
      setAdresses(prev => prev.map(a => a.id === formAdresse.id ? { ...a, ...form } : a))
    }
    setFormAdresse(null)
  }

  async function handleDeleteAdresse(id) {
    const { error } = await deleteAdresse(id)
    if (error) toast.error('Erreur')
    else setAdresses(prev => prev.filter(a => a.id !== id))
  }

  async function handleSetDefaut(id) {
    await setAdresseDefaut(user.id, id)
    setAdresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
  }

  // ── Partager ─────────────────────────────────────────────
  function handlePartager() {
    const texte = 'Commande ta nourriture préférée sur Zandofood ! 🍽️'
    if (navigator.share) {
      navigator.share({ title: 'Zandofood', text: texte, url: window.location.origin })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.origin)
        .then(() => toast.success('Lien copié !'))
    }
  }

  // ── Déconnexion ──────────────────────────────────────────
  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Hero gradient ────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${tier.gradient} px-4 pt-14 pb-10`}>
        <div className="flex flex-col items-center">

          {/* Avatar */}
          <div className="relative mb-4">
            <div className={`w-24 h-24 rounded-full bg-white/30 overflow-hidden ring-4 ${tier.ring} shadow-xl`}>
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.nom} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white/80" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md
                         flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Camera className="w-4 h-4 text-gray-600" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <h1 className="font-black text-white text-xl">{profile.nom}</h1>
          <p className="text-white/70 text-sm mt-0.5">
            {profile.username ? `@${profile.username}` : profile.telephone}
          </p>

          <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
            <span className="text-base">{tier.emoji}</span>
            <span className="text-white font-bold text-sm">Membre {tier.nom}</span>
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div className="mx-4 -mt-5 bg-white rounded-2xl shadow-md p-4 flex divide-x divide-gray-100">
        <div className="flex-1 text-center px-2">
          <p className="font-black text-2xl text-brand-500">{points.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Points fidélité</p>
        </div>
        <div className="flex-1 text-center px-2">
          <p className="font-black text-2xl text-green-600">{formatCurrency(solde)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Mon solde</p>
        </div>
      </div>

      {/* ── MON COMPTE ───────────────────────────────────── */}
      <div className="mx-4 mt-5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Mon compte</p>

        {/* Informations personnelles */}
        <SectionCard
          icon={<User className="w-4 h-4 text-brand-500" />}
          iconBg="bg-brand-100"
          title="Informations personnelles"
          subtitle={[profile.nom, profile.username ? `@${profile.username}` : null, profile.telephone].filter(Boolean).join(' · ')}
          expanded={sectionInfos}
          onToggle={() => sectionInfos ? setSectionInfos(false) : openInfos()}
        >
          <div className="mt-4 space-y-3">

            {/* Nom */}
            <div>
              <label className="text-xs text-gray-500 font-medium">Nom complet</label>
              <input
                value={formNom}
                onChange={e => setFormNom(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="text-xs text-gray-500 font-medium">Téléphone</label>
              <input
                value={formTel}
                onChange={e => setFormTel(e.target.value)}
                type="tel"
                placeholder="+242066000000"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-xs text-gray-500 font-medium">
                Username <span className="text-gray-400">(optionnel)</span>
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  value={formUsername}
                  onChange={e => { setFormUsername(e.target.value); setUsernameErreur('') }}
                  placeholder="jean_mabiala"
                  className={`w-full border rounded-xl pl-7 pr-3 py-2.5 text-sm
                              focus:outline-none focus:ring-2 focus:ring-brand-300
                              ${usernameErreur ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                />
              </div>
              {usernameErreur && <p className="text-xs text-red-500 mt-1">{usernameErreur}</p>}
            </div>

            {/* Email (lecture seule) */}
            <div>
              <label className="text-xs text-gray-500 font-medium">Email</label>
              <div className="mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                {emailInterne
                  ? <span className="text-gray-400 italic">Connexion via téléphone</span>
                  : user?.email}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSectionInfos(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={saveInfos}
                disabled={savingInfos || !formNom.trim()}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold
                           disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {savingInfos && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Adresses */}
        <div className="mt-3">
          <SectionCard
            icon={<MapPin className="w-4 h-4 text-orange-500" />}
            iconBg="bg-orange-100"
            title="Mes adresses"
            subtitle={
              adresses.length > 0
                ? `${adresses.length} adresse${adresses.length > 1 ? 's' : ''} enregistrée${adresses.length > 1 ? 's' : ''}`
                : 'Aucune adresse enregistrée'
            }
            expanded={sectionAdresses}
            onToggle={() => { setSectionAdresses(p => !p); setFormAdresse(null) }}
          >
            {loadAdresses ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" strokeWidth={1.5} />
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {adresses.map(a => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border
                      ${a.is_default ? 'border-brand-200 bg-brand-50' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                      ${a.is_default ? 'bg-brand-100 text-brand-500' : 'bg-gray-200 text-gray-500'}`}>
                      <IconeAdresse label={a.label} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        {a.label}
                        {a.is_default && (
                          <span className="text-[9px] font-bold text-brand-500 bg-brand-100 px-1.5 py-0.5 rounded-full">
                            PAR DÉFAUT
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{a.rue}, {a.quartier}</p>
                      {a.indication && <p className="text-[11px] text-gray-400 truncate">{a.indication}</p>}
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {!a.is_default && (
                        <button
                          onClick={() => handleSetDefaut(a.id)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg"
                          title="Définir par défaut"
                        >
                          <Star className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => setFormAdresse(formAdresse?.id === a.id ? null : a)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdresse(a.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Formulaire modification */}
                {formAdresse && formAdresse !== 'new' && (
                  <div className="p-3 bg-white rounded-xl border border-brand-200">
                    <p className="text-sm font-semibold text-gray-800 mb-1">Modifier l'adresse</p>
                    <FormulaireAdresse
                      initial={formAdresse}
                      onSave={handleSaveAdresse}
                      onCancel={() => setFormAdresse(null)}
                    />
                  </div>
                )}

                {/* Formulaire nouvelle adresse */}
                {formAdresse === 'new' && (
                  <div className="p-3 bg-white rounded-xl border border-brand-200">
                    <p className="text-sm font-semibold text-gray-800 mb-1">Nouvelle adresse</p>
                    <FormulaireAdresse
                      onSave={handleSaveAdresse}
                      onCancel={() => setFormAdresse(null)}
                    />
                  </div>
                )}

                {formAdresse === null && (
                  <button
                    onClick={() => setFormAdresse('new')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                               border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold
                               hover:border-brand-300 hover:text-brand-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une adresse
                  </button>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── ACTIVITÉS ────────────────────────────────────── */}
      <div className="mx-4 mt-5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Activités</p>

        {/* Mes commandes → lien */}
        <Link
          to="/mes-commandes"
          className="bg-white rounded-2xl shadow-sm flex items-center gap-3 px-4 py-4
                     hover:bg-gray-50 transition-colors"
        >
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">Mes commandes</p>
            <p className="text-xs text-gray-400 mt-0.5">Voir mon historique</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </Link>

        {/* Messages */}
        <div className="mt-3">
          <SectionCard
            icon={<MessageSquare className="w-4 h-4 text-blue-500" />}
            iconBg="bg-blue-100"
            title="Messages"
            subtitle="Conversations avec les restaurants"
            expanded={sectionMessages}
            onToggle={() => setSectionMessages(p => !p)}
          >
            {loadConversations ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" strokeWidth={1.5} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-6 text-center">
                <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">Aucune conversation</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {conversations.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setChatOuvert({
                      orderId: o.id,
                      titreChat: o.restaurant?.nom ?? 'Restaurant',
                    })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50
                               hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 text-base">
                      💬
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {o.restaurant?.nom ?? 'Restaurant'}
                      </p>
                      <p className="text-xs text-gray-400">#{o.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full shrink-0">
                      {o.messages?.length} msg
                    </span>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── FIDÉLITÉ & AVANTAGES ─────────────────────────── */}
      <div className="mx-4 mt-5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Fidélité & Avantages</p>

        {/* Carte de fidélité */}
        <SectionCard
          icon={<Gift className="w-4 h-4 text-yellow-500" />}
          iconBg="bg-yellow-100"
          title="Carte de fidélité"
          subtitle={`${points.toLocaleString()} pts · ${tier.nom}`}
          expanded={sectionFidelite}
          onToggle={() => setSectionFidelite(p => !p)}
        >
          {/* Carte visuelle */}
          <div className={`mt-4 rounded-2xl bg-gradient-to-br ${tier.gradient} p-5 shadow-inner`}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-white/60 text-xs font-medium">Zandofood</p>
                <p className="text-white font-black text-xl mt-0.5">Carte {tier.nom}</p>
              </div>
              <span className="text-4xl">{tier.emoji}</span>
            </div>
            <p className="text-white/60 text-xs mb-1">Points accumulés</p>
            <p className="text-white font-black text-4xl">{points.toLocaleString()}</p>
            {tierSuivant && (
              <p className="text-white/60 text-xs mt-2">
                Encore {(tierSuivant.min - points).toLocaleString()} pts pour atteindre {tierSuivant.nom}
              </p>
            )}
          </div>

          {/* Barre de progression vers niveau suivant */}
          {tierSuivant && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span className="font-semibold">{tier.nom}</span>
                <span className="font-semibold">{tierSuivant.nom}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${tier.gradient} rounded-full transition-all duration-500`}
                  style={{
                    width: `${Math.min(100, ((points - tier.min) / (tierSuivant.min - tier.min)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Tableau des niveaux */}
          <div className="mt-4 space-y-1.5">
            {TIERS.map(t => (
              <div
                key={t.nom}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl
                  ${t.nom === tier.nom ? 'bg-gray-50 border border-gray-200' : ''}`}
              >
                <span className="text-xl">{t.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{t.nom}</p>
                  <p className="text-xs text-gray-400">
                    {t.min === 0 ? 'Dès l\'inscription' : `À partir de ${t.min.toLocaleString()} pts`}
                  </p>
                </div>
                {t.nom === tier.nom && <Check className="w-4 h-4 text-brand-500 shrink-0" />}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Mon solde */}
        <div className="mt-3">
          <SectionCard
            icon={<Wallet className="w-4 h-4 text-green-600" />}
            iconBg="bg-green-100"
            title="Mon solde"
            subtitle={`${formatCurrency(solde)} disponibles`}
            expanded={sectionSolde}
            onToggle={() => setSectionSolde(p => !p)}
          >
            <div className="mt-4 bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
              <p className="text-4xl font-black text-green-600 mb-1">{formatCurrency(solde)}</p>
              <p className="text-sm text-green-700 font-semibold">Solde disponible</p>
              <p className="text-xs text-green-500 mt-2">Utilisable lors de vos prochaines commandes</p>
            </div>
            <div className="mt-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 text-center">
                💡 Votre solde est crédité via des remboursements ou promotions spéciales.
              </p>
            </div>
          </SectionCard>
        </div>

        {/* Partager */}
        <button
          onClick={handlePartager}
          className="mt-3 w-full bg-white rounded-2xl shadow-sm flex items-center gap-3 px-4 py-4
                     hover:bg-gray-50 transition-colors"
        >
          <div className="w-9 h-9 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4 text-pink-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900 text-sm">Partager Zandofood</p>
            <p className="text-xs text-gray-400 mt-0.5">Invitez vos amis à commander</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </div>

      {/* ── Déconnexion ──────────────────────────────────── */}
      <div className="mx-4 mt-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl
                     bg-red-50 border border-red-100 text-red-500 font-bold
                     hover:bg-red-100 active:scale-[0.98] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>

      {/* ── Version ──────────────────────────────────────── */}
      <p className="text-center text-[11px] text-gray-300 mt-6">Zandofood v1.0</p>

      {/* ── Modal recadrage photo ─────────────────────────── */}
      {cropImageUrl && (
        <CropModal
          imageUrl={cropImageUrl}
          saving={savingPhoto}
          onSave={handleCropSave}
          onClose={() => setCropImageUrl(null)}
        />
      )}

      {/* ── Modal chat ───────────────────────────────────── */}
      {chatOuvert && user && (
        <ChatModal
          orderId={chatOuvert.orderId}
          monRole="client"
          monId={user.id}
          titreChat={chatOuvert.titreChat}
          onClose={() => setChatOuvert(null)}
        />
      )}
    </div>
  )
}
