import { useState, useEffect, useMemo } from 'react'
import { Users, Search, Phone, Crown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { getClientsByRestaurant } from '@/services/menuService'
import { formatCurrency } from '@/utils/formatCurrency'

// Un client avec 3 commandes livrées ou plus est considéré fidèle —
// seuil simple, pas de calcul compliqué.
const SEUIL_FIDELE = 3

function dateFR(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Ligne client ────────────────────────────────────────────
function LigneClient({ client }) {
  const fidele = client.nbCommandes >= SEUIL_FIDELE

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-0">
      <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center
                      justify-center text-sm font-bold shrink-0">
        {client.nom[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm text-gray-800 truncate">{client.nom}</p>
          {fidele && (
            <span title={`${client.nbCommandes} commandes`} className="shrink-0">
              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {client.nbCommandes} commande{client.nbCommandes > 1 ? 's' : ''} · dernière le {dateFR(client.derniereCommande)}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-bold text-sm text-brand-500 tabular-nums">{formatCurrency(client.totalDepense)}</p>
        {client.telephone && (
          <a
            href={`tel:${client.telephone}`}
            className="flex items-center gap-1 justify-end text-xs text-gray-400 hover:text-brand-500 mt-0.5"
          >
            <Phone className="w-3 h-3" /> Appeler
          </a>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Clients
// ══════════════════════════════════════════════════════════
export default function Clients() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    if (!restaurant?.id) return
    async function charger() {
      setLoading(true)
      const { data, error } = await getClientsByRestaurant(restaurant.id)
      if (error) toast.error('Impossible de charger les clients')
      else       setClients(data)
      setLoading(false)
    }
    charger()
  }, [restaurant?.id])

  const filtres = useMemo(() => {
    if (!recherche.trim()) return clients
    const q = recherche.trim().toLowerCase()
    return clients.filter(c =>
      c.nom.toLowerCase().includes(q) || (c.telephone ?? '').includes(q)
    )
  }, [clients, recherche])

  const nbFideles = clients.filter(c => c.nbCommandes >= SEUIL_FIDELE).length

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
        <p className="text-xs text-gray-400 font-medium">Relation client</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Mes clients</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {clients.length} client{clients.length > 1 ? 's' : ''}
          {nbFideles > 0 && (
            <span className="ml-2 text-amber-500 font-semibold">
              {nbFideles} fidèle{nbFideles > 1 ? 's' : ''} (3+ commandes)
            </span>
          )}
        </p>
      </header>

      <div className="px-4 pt-4 space-y-4">

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
        {filtres.length === 0
          ? (
            <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
              <p className="text-sm font-medium">
                {clients.length === 0 ? 'Pas encore de client — revenez après vos premières livraisons' : 'Aucun client trouvé'}
              </p>
            </div>
          )
          : (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              {filtres.map(c => <LigneClient key={c.id} client={c} />)}
            </div>
          )
        }
      </div>
    </div>
  )
}
