import { useState, useEffect } from 'react'
import { Users, Search, UserX, UserCheck, Loader2, ChevronDown, Wallet, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllUsers, toggleUserActive, crediterSoldeClient } from '@/services/adminService'
import { formatCurrency } from '@/utils/formatCurrency'
import { ROLES } from '@/utils/constants'

// ── Onglets par rôle ───────────────────────────────────────
const ONGLETS = [
  { key: 'client',     label: 'Clients'     },
  { key: 'restaurant', label: 'Restaurants' },
]

// ── Formatage date ─────────────────────────────────────────
function dateFR(isoDate) {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Initiale avatar ────────────────────────────────────────
function Avatar({ nom, actif }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
      actif ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'
    }`}>
      {(nom ?? '?')[0].toUpperCase()}
    </div>
  )
}

// ── Modal crédit solde ─────────────────────────────────────
function ModalCreditSolde({ utilisateur, onClose, onSuccess }) {
  const [montant,  setMontant]  = useState('')
  const [saving,   setSaving]   = useState(false)

  async function handleCrediter() {
    const val = parseInt(montant, 10)
    if (!val || val <= 0) { toast.error('Montant invalide'); return }
    setSaving(true)
    const { error } = await crediterSoldeClient(utilisateur.id, val)
    setSaving(false)
    if (error) { toast.error('Erreur : ' + error); return }
    toast.success(`${formatCurrency(val)} crédités à ${utilisateur.nom}`)
    onSuccess(val)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Créditer le solde</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Client : <span className="font-semibold text-gray-800">{utilisateur.nom}</span>
        </p>
        <div>
          <label className="text-xs text-gray-500 font-medium">Montant à créditer (FCFA)</label>
          <input
            type="number"
            value={montant}
            onChange={e => setMontant(e.target.value)}
            placeholder="ex : 2000"
            min={1}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-300"
            autoFocus
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            onClick={handleCrediter}
            disabled={saving || !montant}
            className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold
                       disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Créditer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ligne utilisateur avec détail déroulant ────────────────
function LigneUtilisateur({ utilisateur, onToggle, loading, onglet }) {
  const [ouvert,      setOuvert]      = useState(false)
  const [modalSolde,  setModalSolde]  = useState(false)
  const [solde,       setSolde]       = useState(utilisateur.solde ?? 0)

  return (
    <div className="border-t border-gray-50 first:border-0">
      {/* Ligne principale */}
      <button
        onClick={() => setOuvert(o => !o)}

        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <Avatar nom={utilisateur.nom} actif={utilisateur.actif} />

        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${
            utilisateur.actif ? 'text-gray-800' : 'text-gray-400 line-through'
          }`}>
            {utilisateur.nom ?? '—'}
          </p>
          <p className="text-xs text-gray-400">
            Inscrit le {dateFR(utilisateur.created_at)}
          </p>
        </div>

        {/* Badge actif/inactif */}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
          utilisateur.actif
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-600'
        }`}>
          {utilisateur.actif ? 'Actif' : 'Inactif'}
        </span>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
            ouvert ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Détail déroulant */}
      {ouvert && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          <div className="pt-3 space-y-3">
            {/* Téléphone */}
            {utilisateur.telephone && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Tél :</span> {utilisateur.telephone}
              </p>
            )}
            <p className="text-xs text-gray-400 break-all">
              <span className="font-medium text-gray-500">ID :</span> {utilisateur.id}
            </p>

            {/* Créditer solde — clients uniquement */}
            {onglet === 'client' && (
              <button
                onClick={() => setModalSolde(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           bg-green-50 border border-green-200 text-green-700 text-xs font-bold
                           hover:bg-green-100 transition-colors min-h-[44px]"
              >
                <Wallet className="w-3.5 h-3.5" />
                Créditer solde
                {solde > 0 && (
                  <span className="text-green-500 font-normal">
                    (actuel : {formatCurrency(solde)})
                  </span>
                )}
              </button>
            )}

            {/* Action activer / désactiver */}
            <button
              onClick={() => onToggle(utilisateur.id, !utilisateur.actif)}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         text-xs font-bold transition-colors disabled:opacity-60 min-h-[44px] ${
                utilisateur.actif
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : utilisateur.actif
                  ? <UserX className="w-3.5 h-3.5" />
                  : <UserCheck className="w-3.5 h-3.5" />
              }
              {utilisateur.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
            </button>
          </div>
        </div>
      )}

      {modalSolde && (
        <ModalCreditSolde
          utilisateur={utilisateur}
          onClose={() => setModalSolde(false)}
          onSuccess={val => setSolde(s => s + val)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Utilisateurs Admin
// ══════════════════════════════════════════════════════════
export default function AdminUsers() {
  const [onglet,          setOnglet]          = useState('client')
  const [utilisateurs,    setUtilisateurs]    = useState([])
  const [loading,         setLoading]         = useState(true)
  const [recherche,       setRecherche]       = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // ── Chargement par rôle ────────────────────────────────
  useEffect(() => {
    async function charger() {
      setLoading(true)
      setRecherche('')
      const { data, error } = await getAllUsers(onglet)
      if (error) toast.error('Impossible de charger les utilisateurs')
      else       setUtilisateurs(data ?? [])
      setLoading(false)
    }
    charger()
  }, [onglet])

  // ── Activer / désactiver un compte ─────────────────────
  async function handleToggle(id, actif) {
    setActionLoadingId(id)
    const { data, error } = await toggleUserActive(id, actif)
    setActionLoadingId(null)

    if (error) { toast.error('Erreur : ' + error); return }
    setUtilisateurs(prev => prev.map(u => u.id === id ? { ...u, actif: data.actif } : u))
    toast.success(actif ? 'Compte réactivé' : 'Compte désactivé')
  }

  // ── Filtrage par recherche ─────────────────────────────
  const filtres = recherche
    ? utilisateurs.filter(u =>
        (u.nom ?? '').toLowerCase().includes(recherche.toLowerCase()) ||
        (u.telephone ?? '').includes(recherche)
      )
    : utilisateurs

  const nbInactifs = utilisateurs.filter(u => !u.actif).length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Utilisateurs</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {utilisateurs.length} {ROLES[onglet.toUpperCase()] ?? onglet}
          {nbInactifs > 0 && (
            <span className="ml-2 text-red-500 font-semibold">{nbInactifs} inactif{nbInactifs !== 1 ? 's' : ''}</span>
          )}
        </p>
      </header>

      <div className="px-4 pt-4 space-y-4">

        {/* Onglets rôles */}
        <div className="flex gap-2">
          {ONGLETS.map(o => (
            <button
              key={o.key}
              onClick={() => setOnglet(o.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                onglet === o.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Nom ou téléphone…"
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm"
          />
        </div>

        {/* Liste */}
        {loading
          ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
            </div>
          )
          : filtres.length === 0
          ? (
            <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
              <p className="text-sm font-medium">Aucun utilisateur trouvé</p>
            </div>
          )
          : (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              {filtres.map(u => (
                <LigneUtilisateur
                  key={u.id}
                  utilisateur={u}
                  onToggle={handleToggle}
                  loading={actionLoadingId === u.id}
                  onglet={onglet}
                />
              ))}
            </div>
          )
        }
      </div>

    </div>
  )
}
