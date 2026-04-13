import { useState, useEffect } from 'react'
import { TrendingUp, Package, Bike, PhoneCall, Loader2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { getLivreurStats, getActiveDelivery, markDelivered } from '@/services/livreurService'
import { formatCurrency } from '@/utils/formatCurrency'
import { ouvrirWhatsApp } from '@/utils/whatsappMessage'

// ── Carte KPI ───────────────────────────────────────────────
function KpiCard({ titre, valeur, sousTitre, Icon, couleur = 'brand' }) {
  const palettes = {
    brand:  { bg: 'bg-brand-50',  icon: 'text-brand-500',  val: 'text-brand-700'  },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  val: 'text-green-700'  },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', val: 'text-yellow-700' },
  }
  const p = palettes[couleur]

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex items-start gap-4">
      <div className={`${p.bg} rounded-xl p-2.5 shrink-0`}>
        <Icon className={`w-5 h-5 ${p.icon}`} strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{titre}</p>
        <p className={`text-xl font-black mt-0.5 tabular-nums ${p.val}`}>{valeur}</p>
        {sousTitre && <p className="text-xs text-gray-400 mt-0.5">{sousTitre}</p>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Dashboard Livreur
// ══════════════════════════════════════════════════════════
export default function LivreurDashboard() {
  const { user } = useAuth()

  const [stats,          setStats]          = useState(null)
  const [commandeActive, setCommandeActive] = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [marquage,       setMarquage]       = useState(false) // livraison en cours de validation

  // ── Chargement stats + commande active ────────────────
  useEffect(() => {
    if (!user?.id) return

    async function charger() {
      setLoading(true)
      const [{ data: s }, { data: cmd }] = await Promise.all([
        getLivreurStats(user.id),
        getActiveDelivery(user.id),
      ])
      if (!s) toast.error('Impossible de charger les statistiques')
      setStats(s)
      setCommandeActive(cmd)
      setLoading(false)
    }

    charger()
  }, [user?.id])

  // ── Marquer comme livré ────────────────────────────────
  async function handleMarquerLivre() {
    if (!commandeActive) return
    setMarquage(true)
    const { error } = await markDelivered(commandeActive.id)
    setMarquage(false)

    if (error) { toast.error('Erreur : ' + error); return }

    toast.success('Livraison confirmée !')
    setCommandeActive(null)

    // Rafraîchir les stats
    const { data: s } = await getLivreurStats(user.id)
    if (s) setStats(s)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  const prenom = user?.user_metadata?.nom?.split(' ')[0] ?? 'Livreur'

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Tableau de bord</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">
          Bonjour, {prenom} 👋
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </p>
      </header>

      <div className="px-4 pt-5 space-y-5">

        {/* ── KPIs ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            titre="Gains aujourd'hui"
            valeur={formatCurrency(stats?.gainsJour ?? 0)}
            sousTitre={`${stats?.livraisonsJour ?? 0} livraison${stats?.livraisonsJour !== 1 ? 's' : ''}`}
            Icon={TrendingUp}
            couleur="brand"
          />
          <KpiCard
            titre="Gains cette semaine"
            valeur={formatCurrency(stats?.gainsSemaine ?? 0)}
            sousTitre={`${stats?.livraisonsSemaine ?? 0} livraison${stats?.livraisonsSemaine !== 1 ? 's' : ''}`}
            Icon={Package}
            couleur="green"
          />
        </div>

        {/* ── Livraison en cours ───────────────────────────── */}
        {commandeActive
          ? (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              {/* Bandeau orange */}
              <div className="bg-brand-500 px-4 py-3 flex items-center gap-2">
                <Bike className="w-5 h-5 text-white" strokeWidth={2} />
                <p className="text-white font-bold text-sm">Livraison en cours</p>
              </div>

              <div className="p-4 space-y-3">
                {/* Restaurant */}
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Restaurant</p>
                  <p className="font-semibold text-gray-800">{commandeActive.restaurant?.nom}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {commandeActive.restaurant?.adresse ?? '—'}
                  </p>
                </div>

                {/* Adresse livraison */}
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Livrer à</p>
                  <p className="font-semibold text-gray-800">
                    {commandeActive.adresse_livraison
                      ? `${commandeActive.adresse_livraison.rue ?? ''}, ${commandeActive.adresse_livraison.quartier ?? ''}`.replace(/^, |, $/, '') || '—'
                      : '—'
                    }
                  </p>
                  {commandeActive.adresse_livraison?.indication && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {commandeActive.adresse_livraison.indication}
                    </p>
                  )}
                  {commandeActive.client?.nom && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Client : {commandeActive.client.nom}
                    </p>
                  )}
                </div>

                {/* Montant */}
                <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between">
                  <p className="text-sm text-gray-600">Votre gain</p>
                  <p className="font-black text-brand-500 tabular-nums">
                    {formatCurrency(commandeActive.frais_livraison ?? 0)}
                  </p>
                </div>

                {/* Boutons contact + livré */}
                <div className="flex gap-3 pt-1">
                  {commandeActive.client?.telephone && (
                    <button
                      onClick={() => ouvrirWhatsApp(commandeActive.client.telephone, 'Bonjour, je suis votre livreur Zandofood. Je suis en route avec votre commande.')}
                      className="flex-1 flex items-center justify-center gap-2 border border-gray-300
                                 text-gray-700 rounded-xl py-3 text-sm font-medium
                                 hover:bg-gray-50 transition-colors min-h-[48px]"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Contacter
                    </button>
                  )}
                  <button
                    onClick={handleMarquerLivre}
                    disabled={marquage}
                    className="flex-1 bg-green-500 text-white rounded-xl py-3 text-sm font-bold
                               hover:bg-green-600 transition-colors disabled:opacity-60
                               flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {marquage && <Loader2 className="w-4 h-4 animate-spin" />}
                    Marquer livré ✓
                  </button>
                </div>
              </div>
            </div>
          )
          : (
            /* Aucune livraison active */
            <div className="bg-white rounded-2xl p-6 shadow-card text-center">
              <Bike className="w-10 h-10 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="font-semibold text-gray-600">Aucune livraison en cours</p>
              <p className="text-sm text-gray-400 mt-1">
                Consultez les commandes disponibles pour accepter une livraison.
              </p>
            </div>
          )
        }
      </div>
    </div>
  )
}
