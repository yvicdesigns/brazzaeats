/**
 * Profil livreur — photo, informations personnelles, véhicule/zone, messages
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Camera, ChevronRight, Bike, MessageSquare, Bell,
  LogOut, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/supabase/client'
import { VEHICULES_LIVREUR } from '@/utils/constants'
import {
  getLivreurInfo, updateLivreurInfo,
  getLivreurStats,
} from '@/services/livreurService'
import { getLivreurConversations } from '@/services/chatService'
import { formatCurrency } from '@/utils/formatCurrency'
import CropModal from '@/components/shared/CropModal'
import ChatModal from '@/components/shared/ChatModal'
import ReglagesNotifications from '@/components/shared/ReglagesNotifications'

// ── Composant section (carte cliquable) — même pattern que le profil client
function SectionCard({ icon, iconBg, title, subtitle, expanded, onToggle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
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
// Page Profil livreur
// ══════════════════════════════════════════════════════════
export default function LivreurProfile() {
  const { user, profile, updateProfile, logout } = useAuth()
  const navigate = useNavigate()

  // ── Photo ────────────────────────────────────────────────
  const fileInputRef = useRef(null)
  const [cropImageUrl, setCropImageUrl] = useState(null)
  const [savingPhoto,  setSavingPhoto]  = useState(false)

  // ── Infos perso ──────────────────────────────────────────
  const [sectionInfos, setSectionInfos] = useState(false)
  const [formNom,      setFormNom]      = useState('')
  const [formTel,      setFormTel]      = useState('')
  const [savingInfos,  setSavingInfos]  = useState(false)

  // ── Véhicule / zone ────────────────────────────────────────
  const [sectionVehicule, setSectionVehicule] = useState(false)
  const [livreurInfo,     setLivreurInfo]     = useState(null)
  const [formVehicule,    setFormVehicule]    = useState('moto')
  const [formZone,        setFormZone]        = useState('')
  const [savingVehicule,  setSavingVehicule]  = useState(false)

  // ── Messages ─────────────────────────────────────────────
  const [sectionMessages,   setSectionMessages]   = useState(false)
  const [sectionNotifs,     setSectionNotifs]     = useState(false)
  const [conversations,     setConversations]     = useState([])
  const [loadConversations, setLoadConversations] = useState(false)
  const [chatOuvert,        setChatOuvert]        = useState(null)

  // ── Stats ────────────────────────────────────────────────
  const [stats, setStats] = useState(null)

  // ── Chargement initial ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    getLivreurInfo(user.id).then(({ data }) => {
      setLivreurInfo(data)
      setFormVehicule(data?.vehicule ?? 'moto')
      setFormZone(data?.zone ?? '')
    })
    getLivreurStats(user.id).then(({ data }) => setStats(data))
  }, [user?.id])

  // ── Charger conversations quand la section ouvre ─────────
  useEffect(() => {
    if (!sectionMessages || !user?.id) return
    setLoadConversations(true)
    getLivreurConversations(user.id).then(({ data }) => {
      setConversations(data)
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

  // ── Sauvegarder infos perso ───────────────────────────────
  function openInfos() {
    setFormNom(profile?.nom ?? '')
    setFormTel(profile?.telephone ?? '')
    setSectionInfos(true)
  }

  async function saveInfos() {
    if (!formNom.trim()) return
    setSavingInfos(true)
    const { error } = await updateProfile({
      nom:       formNom.trim(),
      telephone: formTel.trim(),
    })
    if (error) toast.error('Erreur lors de la mise à jour')
    else { toast.success('Profil mis à jour !'); setSectionInfos(false) }
    setSavingInfos(false)
  }

  // ── Sauvegarder véhicule / zone ───────────────────────────
  async function saveVehicule() {
    setSavingVehicule(true)
    const { data, error } = await updateLivreurInfo(user.id, {
      vehicule: formVehicule,
      zone: formZone.trim() || null,
    })
    setSavingVehicule(false)
    if (error) { toast.error('Erreur lors de la mise à jour'); return }
    setLivreurInfo(data)
    toast.success('Informations mises à jour !')
    setSectionVehicule(false)
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

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-400 px-4 pt-14 pb-10">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-white/30 overflow-hidden ring-4 ring-white/50 shadow-xl">
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
              className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-md
                         flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all"
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
          <p className="text-white/70 text-sm mt-0.5">{profile.telephone}</p>

          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="text-base">🛵</span>
              <span className="text-white font-bold text-sm capitalize">{livreurInfo?.vehicule ?? 'moto'}</span>
            </div>
            {livreurInfo?.zone && (
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
                <span className="text-white font-bold text-xs">{livreurInfo.zone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div className="mx-4 -mt-5 bg-white rounded-2xl shadow-md p-4 flex divide-x divide-gray-100">
        <div className="flex-1 text-center px-2">
          <p className="font-black text-2xl text-gray-800">{stats?.livraisonsSemaine ?? 0}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Livraisons (7j)</p>
        </div>
        <div className="flex-1 text-center px-2">
          <p className="font-black text-2xl text-brand-500">{formatCurrency(stats?.gainsSemaine ?? 0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Gains (7j)</p>
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
          subtitle={[profile.nom, profile.telephone].filter(Boolean).join(' · ')}
          expanded={sectionInfos}
          onToggle={() => sectionInfos ? setSectionInfos(false) : openInfos()}
        >
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Nom complet</label>
              <input
                value={formNom}
                onChange={e => setFormNom(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
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

        {/* Véhicule et zone */}
        <div className="mt-3">
          <SectionCard
            icon={<Bike className="w-4 h-4 text-purple-500" />}
            iconBg="bg-purple-100"
            title="Véhicule et zone"
            subtitle={[livreurInfo?.vehicule, livreurInfo?.zone].filter(Boolean).join(' · ') || 'Non renseigné'}
            expanded={sectionVehicule}
            onToggle={() => setSectionVehicule(p => !p)}
          >
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Véhicule</label>
                <select
                  value={formVehicule}
                  onChange={e => setFormVehicule(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {VEHICULES_LIVREUR.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">
                  Zone <span className="text-gray-400">(optionnel)</span>
                </label>
                <input
                  value={formZone}
                  onChange={e => setFormZone(e.target.value)}
                  placeholder="ex : Bacongo, Poto-Poto…"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setSectionVehicule(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={saveVehicule}
                  disabled={savingVehicule}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold
                             disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {savingVehicule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Messages */}
        <div className="mt-3">
          <SectionCard
            icon={<MessageSquare className="w-4 h-4 text-blue-500" />}
            iconBg="bg-blue-100"
            title="Messages"
            subtitle="Conversations avec vos clients"
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
                {conversations.map(c => (
                  <button
                    key={c.orderId}
                    onClick={() => setChatOuvert(c)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50
                               hover:bg-gray-100 active:bg-gray-200 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 text-base">
                      🧑
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.client?.nom ?? 'Client'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        #{c.orderId.slice(0, 8).toUpperCase()} · {c.dernierMessage}
                      </p>
                    </div>
                    {c.nonLus > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-brand-500
                                       text-white text-[11px] font-bold grid place-items-center">
                        {c.nonLus}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Notifications */}
        <div className="mt-3">
          <SectionCard
            icon={<Bell className="w-4 h-4 text-amber-500" />}
            iconBg="bg-amber-100"
            title="Notifications"
            subtitle="Son, volume, lecture vocale"
            expanded={sectionNotifs}
            onToggle={() => setSectionNotifs(p => !p)}
          >
            <div className="mt-4">
              <ReglagesNotifications />
            </div>
          </SectionCard>
        </div>
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
          canal="livreur"
          monRole="livreur"
          monId={user.id}
          titreChat={chatOuvert.client?.nom ?? 'Client'}
          onClose={() => setChatOuvert(null)}
        />
      )}
    </div>
  )
}
