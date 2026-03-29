import { useState, useEffect } from 'react'
import { Save, Loader2, Percent, Phone, Building2, Truck, AlertCircle } from 'lucide-react'
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
    nom_plateforme:       'BrazzaEats',
    contact_support:      '',
    commission_defaut:    10,
    frais_livraison_base: 1000,
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
          nom_plateforme:       data.nom_plateforme       ?? 'BrazzaEats',
          contact_support:      data.contact_support      ?? '',
          commission_defaut:    data.commission_defaut    ?? 10,
          frais_livraison_base: data.frais_livraison_base ?? 1000,
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
  nom_plateforme       TEXT    DEFAULT 'BrazzaEats',
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
              placeholder="BrazzaEats"
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
