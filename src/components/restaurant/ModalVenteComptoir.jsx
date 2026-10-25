import { useState, useEffect } from 'react'
import { X, Plus, Minus, Loader2, Banknote } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMenuItems } from '@/services/menuService'
import { createOrder } from '@/services/orderService'
import { formatCurrency } from '@/utils/formatCurrency'
import { COMPTOIR_CLIENT_ID, MODES_PAIEMENT } from '@/utils/constants'

/**
 * Vente encaissée directement au comptoir (client physiquement présent) —
 * contrairement à une commande client, pas d'étape "en attente" : le
 * restaurant a déjà accepté sa propre vente en la créant. Rattachée au
 * profil générique COMPTOIR_CLIENT_ID (order.client_id est obligatoire
 * en base, mais il n'y a ici aucun client identifié derrière la vente).
 */
export default function ModalVenteComptoir({ restaurantId, onClose, onCreated }) {
  const [items,        setItems]        = useState([])
  const [loadingItems, setLoadingItems]  = useState(true)
  const [quantites,    setQuantites]    = useState({})   // { menuItemId: qte }
  const [nomClient,    setNomClient]    = useState('')
  const [modePaiement, setModePaiement] = useState('cash')
  const [envoi,        setEnvoi]        = useState(false)

  useEffect(() => {
    getMenuItems(restaurantId).then(({ data, error }) => {
      if (error) toast.error('Impossible de charger le menu')
      else       setItems((data ?? []).filter(i => i.disponible))
      setLoadingItems(false)
    })
  }, [restaurantId])

  function changerQuantite(itemId, delta) {
    setQuantites(prev => {
      const next = Math.max(0, (prev[itemId] ?? 0) + delta)
      return { ...prev, [itemId]: next }
    })
  }

  const lignes = items
    .map(i => ({ item: i, quantite: quantites[i.id] ?? 0 }))
    .filter(l => l.quantite > 0)

  const total = lignes.reduce((acc, l) => acc + l.item.prix * l.quantite, 0)

  async function handleEncaisser() {
    if (lignes.length === 0) return
    setEnvoi(true)

    const notes = nomClient.trim()
      ? `Vente comptoir — ${nomClient.trim()}`
      : 'Vente comptoir'

    const { data, error } = await createOrder({
      clientId:      COMPTOIR_CLIENT_ID,
      restaurantId,
      items: lignes.map(l => ({
        menu_item_id:  l.item.id,
        nom:           l.item.nom,
        quantite:      l.quantite,
        prix_unitaire: l.item.prix,
      })),
      type:           'retrait',
      modePaiement,
      notes,
      fraisLivraison: 0,
      statutInitial:  'acceptée',
    })

    setEnvoi(false)

    if (error) { toast.error(error); return }
    toast.success(`Vente encaissée — ${formatCurrency(total)}`)
    onCreated?.(data)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-brand-500" />
            Vente comptoir
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Articles */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Articles</label>
            {loadingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucun article disponible</p>
            ) : (
              <div className="space-y-2">
                {items.map(item => {
                  const qte = quantites[item.id] ?? 0
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5
                        ${qte > 0 ? 'border-brand-300 bg-brand-50/50' : 'border-gray-200'}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.nom}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.prix)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => changerQuantite(item.id, -1)}
                          disabled={qte === 0}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center
                                     text-gray-600 disabled:opacity-30 active:scale-95 transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-5 text-center font-bold text-sm tabular-nums">{qte}</span>
                        <button
                          type="button"
                          onClick={() => changerQuantite(item.id, 1)}
                          className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center
                                     text-white active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Nom client (facultatif) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nom du client <span className="text-gray-400 font-normal">(facultatif)</span>
            </label>
            <input
              type="text"
              value={nomClient}
              onChange={e => setNomClient(e.target.value)}
              placeholder="Pour s'y retrouver — pas obligatoire"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-brand-400"
            />
          </div>

          {/* Mode de paiement */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Paiement</label>
            <div className="flex gap-2">
              {Object.entries(MODES_PAIEMENT).map(([val, { label, icone }]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setModePaiement(val)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5
                              text-sm font-semibold transition-colors
                              ${modePaiement === val
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-gray-200 text-gray-500'
                              }`}
                >
                  <span>{icone}</span> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pied — total + bouton */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-xl font-black text-gray-900 tabular-nums">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={handleEncaisser}
            disabled={lignes.length === 0 || envoi}
            className="w-full bg-brand-600 text-white rounded-xl py-3.5 font-bold text-sm
                       hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-40
                       flex items-center justify-center gap-2"
          >
            {envoi && <Loader2 className="w-4 h-4 animate-spin" />}
            {envoi ? 'Encaissement…' : `Encaisser ${lignes.length > 0 ? formatCurrency(total) : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
