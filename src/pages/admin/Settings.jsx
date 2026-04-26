import { useState, useEffect } from 'react'
import { Save, Loader2, Percent, Phone, Building2, Truck, AlertCircle, Bike, Wallet, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPlatformSettings, updatePlatformSettings } from '@/services/adminService'

// ── Champ de formulaire générique ─────────────────────────
function Champ({ label, sousTitre, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-0.5">{label}</label>
      {sousTitre && <p className="text-xs text-gray-400 mb-1.5">{sousTitre}</p>}
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Paramètres Admin
// ══════════════════════════════════════════════════════════
export default function AdminSettings() {
  const [form, setForm] = useState({
    nom_plateforme:       'Zandofood',
    contact_support:      '',
    commission_defaut:    10,
    frais_livraison_base: 1000,
    mode_livraison:       'independants',
    solde_cash_actif:     false,
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [erreur,  setErreur]  = useState(null) // erreur de chargement (table manquante)

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  // ── Chargement depuis Supabase ─────────────────────────
  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { data, error } = await getPlatformSettings()
      setLoading(false)

      if (error) {
        // La table platform_settings n'existe peut-être pas encore
        setErreur(error)
        return
      }

      if (data) {
        setForm({
          nom_plateforme:       data.nom_plateforme       ?? 'Zandofood',
          contact_support:      data.contact_support      ?? '',
          commission_defaut:    data.commission_defaut    ?? 10,
          frais_livraison_base: data.frais_livraison_base ?? 1000,
          mode_livraison:       data.mode_livraison       ?? 'independants',
          solde_cash_actif:     data.solde_cash_actif     ?? false,
        })
      }
    }
    charger()
  }, [])

  // ── Enregistrer ────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()

    const commission = Number(form.commission_defaut)
    const frais      = Number(form.frais_livraison_base)

    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast.error('La commission doit être entre 0 et 100 %')
      return
    }
    if (isNaN(frais) || frais < 0) {
      toast.error('Les frais de livraison doivent être positifs')
      return
    }

    setSaving(true)
    const { error } = await updatePlatformSettings({
      nom_plateforme:       form.nom_plateforme.trim(),
      contact_support:      form.contact_support.trim(),
      commission_defaut:    commission,
      frais_livraison_base: frais,
      mode_livraison:       form.mode_livraison,
      solde_cash_actif:     form.solde_cash_actif,
    })
    setSaving(false)

    if (error) { toast.error('Erreur : ' + error); return }
    toast.success('Paramètres enregistrés')
  }

  if (loading) {
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
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Paramètres plateforme</h1>
      </header>

      {/* ── Avertissement si table manquante ────────────── */}
      {erreur && (
        <div className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4
                        flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Table non trouvée</p>
            <p className="text-xs text-yellow-700 mt-1">
              Créez la table <code className="font-mono bg-yellow-100 px-1 rounded">platform_settings</code> dans Supabase.
              Les modifications seront sauvegardées une fois la table créée.
            </p>
            <pre className="text-xs bg-yellow-100 rounded-lg p-2 mt-2 overflow-x-auto text-yellow-900 font-mono leading-relaxed">
{`CREATE TABLE platform_settings (
  id                   INTEGER PRIMARY KEY DEFAULT 1,
  nom_plateforme       TEXT    DEFAULT 'Zandofood',
  contact_support      TEXT    DEFAULT '',
  commission_defaut    NUMERIC DEFAULT 10,
  frais_livraison_base INTEGER DEFAULT 1000,
  updated_at           TIMESTAMPTZ DEFAULT now()
);
INSERT INTO platform_settings DEFAULT VALUES;`}
            </pre>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-5">

        {/* ════════════════════════════════════════
            Informations générales
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-brand-50 rounded-xl p-2">
              <Building2 className="w-4 h-4 text-brand-500" strokeWidth={2} />
            </div>
            <h2 className="font-bold text-gray-800">Informations générales</h2>
          </div>

          <Champ label="Nom de la plateforme">
            <input
              type="text"
              value={form.nom_plateforme}
              onChange={e => setField('nom_plateforme', e.target.value)}
              maxLength={80}
              placeholder="Zandofood"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </Champ>

          <Champ
            label="Contact support (WhatsApp)"
            sousTitre="Numéro international sans + ni espaces (ex: 242066000001)"
          >
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={form.contact_support}
                onChange={e => setField('contact_support', e.target.value)}
                maxLength={20}
                placeholder="242066000001"
                className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </Champ>
        </div>

        {/* ════════════════════════════════════════
            Paramètres financiers
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-green-50 rounded-xl p-2">
              <Percent className="w-4 h-4 text-green-600" strokeWidth={2} />
            </div>
            <h2 className="font-bold text-gray-800">Paramètres financiers</h2>
          </div>

          <Champ
            label="Taux de commission par défaut (%)"
            sousTitre="Appliqué aux nouveaux restaurants. Modifiable par restaurant."
          >
            <div className="relative">
              <input
                type="number"
                value={form.commission_defaut}
                onChange={e => setField('commission_defaut', e.target.value)}
                min={0}
                max={100}
                step={0.5}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                %
              </span>
            </div>
          </Champ>

          <Champ
            label="Frais de livraison de base (FCFA)"
            sousTitre="Montant affiché par défaut lors de la commande."
          >
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={form.frais_livraison_base}
                onChange={e => setField('frais_livraison_base', e.target.value)}
                min={0}
                step={100}
                className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </Champ>

          {/* Aperçu calcul commission */}
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Exemple de calcul</p>
            <p>Commande de 5 000 FCFA :</p>
            <p>
              Commission = 5 000 × {form.commission_defaut}% ={' '}
              <span className="font-bold text-green-600">
                {Math.round(5000 * Number(form.commission_defaut) / 100).toLocaleString('fr-FR')} FCFA
              </span>
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════
            Livraison & Paiement
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-blue-50 rounded-xl p-2">
              <Bike className="w-4 h-4 text-blue-500" strokeWidth={2} />
            </div>
            <h2 className="font-bold text-gray-800">Livraison & Paiement</h2>
          </div>

          {/* Mode de livraison */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Mode de livraison</p>
            <p className="text-xs text-gray-400 mb-3">
              Définit si les livreurs peuvent prendre des commandes librement ou si elles sont assignées par l'admin.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  val:   'independants',
                  Icon:  Users,
                  titre: 'Indépendants',
                  sub:   'Les livreurs voient et acceptent les commandes disponibles',
                  color: 'brand',
                },
                {
                  val:   'propres_livreurs',
                  Icon:  Bike,
                  titre: 'Mes livreurs',
                  sub:   'Les commandes sont assignées manuellement par l\'admin',
                  color: 'blue',
                },
              ].map(({ val, Icon, titre, sub, color }) => {
                const actif = form.mode_livraison === val
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setField('mode_livraison', val)}
                    className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-colors ${
                      actif
                        ? color === 'brand'
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${
                      actif
                        ? color === 'brand' ? 'text-brand-500' : 'text-blue-500'
                        : 'text-gray-400'
                    }`} strokeWidth={2} />
                    <p className={`text-sm font-bold ${actif ? 'text-gray-900' : 'text-gray-600'}`}>
                      {titre}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 leading-tight">{sub}</p>
                  </button>
                )
              })}
            </div>
            {form.mode_livraison === 'propres_livreurs' && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                ℹ️ En mode "Mes livreurs", les commandes prêtes n'apparaissent pas dans le tableau de bord livreur. Vous les assignez manuellement.
              </div>
            )}
          </div>

          {/* Solde cash */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Wallet className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Monnaie → Solde client</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Si activé, le livreur peut créditer la monnaie rendue en solde Zandofood.
                    Désactivé par défaut (recommandé tant que vous n'avez pas vos propres livreurs de confiance).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setField('solde_cash_actif', !form.solde_cash_actif)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 mt-1 ${
                  form.solde_cash_actif ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.solde_cash_actif ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            {!form.solde_cash_actif && (
              <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
                ✓ Le solde client est uniquement crédité via les remboursements admin. Recommandé.
              </p>
            )}
          </div>
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
          {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </button>
      </form>
    </div>
  )
}
