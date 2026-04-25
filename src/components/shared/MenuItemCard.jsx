import { useState, useEffect } from 'react'
import { Plus, Minus, X, Star, MessageSquare, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/utils/formatCurrency'
import useCart from '@/hooks/useCart'
import { getItemReviews } from '@/services/restaurantService'
import { isItemDisponibleMaintenant, labelHoraires } from '@/utils/disponibilite'

// ── Étoiles ────────────────────────────────────────────────
function Etoiles({ note }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${
          i <= note ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
        }`} />
      ))}
    </div>
  )
}

// ── Modal détail plat ──────────────────────────────────────
function ModalPlat({ item, restaurantId, restaurantNom, onClose }) {
  const { items, addItem, removeItem, replaceAndAdd } = useCart()
  const quantiteEnPanier = items.find(i => i.id === item.id)?.quantite ?? 0

  const disponible = isItemDisponibleMaintenant(item)
  const hasVariantes = item.variantes?.length > 0

  const [avis,                 setAvis]                 = useState([])
  const [loadingAvis,          setLoadingAvis]          = useState(true)
  const [avisOuverts,          setAvisOuverts]          = useState(false)
  const [varianteSelectionnee, setVarianteSelectionnee] = useState(null)

  useEffect(() => {
    getItemReviews(item.id).then(({ data }) => {
      setAvis(data ?? [])
      setLoadingAvis(false)
    })
  }, [item.id])

  const noteMoyenne = avis.length
    ? (avis.reduce((s, a) => s + a.note, 0) / avis.length)
    : null

  // Prix affiché : celui de la variante sélectionnée, sinon le prix de base
  const prixAffiché = varianteSelectionnee ? varianteSelectionnee.prix : item.prix

  function doAdd(payload) {
    const { conflitRestaurant } = addItem(payload, restaurantId, restaurantNom)
    if (conflitRestaurant) {
      toast(t => (
        <div className="text-sm">
          <p className="font-semibold mb-2">Changer de restaurant ?</p>
          <p className="text-gray-600 mb-3">Votre panier sera vidé et remplacé par cet article.</p>
          <div className="flex gap-2">
            <button
              onClick={() => { replaceAndAdd(payload, restaurantId, restaurantNom); toast.dismiss(t.id) }}
              className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-xs font-semibold"
            >
              Vider et continuer
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      ), { duration: 10000 })
    }
  }

  function handleAdd() {
    if (hasVariantes && !varianteSelectionnee) return
    const nomComplet = varianteSelectionnee
      ? `${item.nom} (${varianteSelectionnee.nom})`
      : item.nom
    const payload = {
      id:               item.id,
      nom:              nomComplet,
      prix:             prixAffiché,
      image_url:        item.image_url ?? null,
      temps_preparation: item.temps_preparation ?? 15,
    }
    doAdd(payload)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh]
                      flex flex-col overflow-hidden shadow-2xl">

        {/* Image */}
        <div className="relative h-52 bg-gray-100 shrink-0">
          {item.image_url
            ? <img src={item.image_url} alt={item.nom} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
          }
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Nom + prix + note */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-black text-gray-900 leading-tight">{item.nom}</h2>
              <span className="font-black text-brand-500 text-lg shrink-0">
                {hasVariantes && !varianteSelectionnee
                  ? `dès ${formatCurrency(Math.min(...item.variantes.map(v => v.prix)))}`
                  : formatCurrency(prixAffiché)
                }
              </span>
            </div>

            {/* Note moyenne plat */}
            {noteMoyenne !== null && (
              <div className="flex items-center gap-2 mt-1.5">
                <Etoiles note={Math.round(noteMoyenne)} />
                <span className="text-sm font-semibold text-gray-700">{noteMoyenne.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({avis.length} avis)</span>
              </div>
            )}

            {item.description && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.description}</p>
            )}
            {item.temps_preparation && (
              <p className="text-xs text-gray-400 mt-1">⏱ {item.temps_preparation} min de préparation</p>
            )}
          </div>

          {/* Variantes */}
          {hasVariantes && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-bold text-gray-800 mb-3">
                Choisir une taille <span className="text-red-500">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {item.variantes.map((v, idx) => {
                  const sel = varianteSelectionnee?.nom === v.nom
                  return (
                    <button
                      key={idx}
                      onClick={() => setVarianteSelectionnee(sel ? null : v)}
                      className={`flex flex-col items-center px-4 py-2.5 rounded-xl border-2 transition-all
                        ${sel
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <span className="text-sm font-semibold">{v.nom}</span>
                      <span className={`text-xs font-bold mt-0.5 ${sel ? 'text-brand-600' : 'text-gray-500'}`}>
                        {formatCurrency(v.prix)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Avis clients — section repliable */}
          <div className="border-t border-gray-100">
            <button
              onClick={() => setAvisOuverts(v => !v)}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">Avis sur ce plat</span>
                {loadingAvis
                  ? <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                  : avis.length > 0
                    ? <span className="bg-brand-100 text-brand-600 text-xs font-bold px-2 py-0.5 rounded-full">
                        {avis.length}
                      </span>
                    : <span className="text-xs text-gray-400">Aucun avis</span>
                }
              </div>
              {avisOuverts
                ? <ChevronUp  className="w-4 h-4 text-gray-400 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              }
            </button>

            {avisOuverts && (
              avis.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Aucun avis pour ce plat pour l'instant.
                </p>
              ) : (
              <div className="space-y-3 pb-2">
                {avis.map(a => (
                  <div key={a.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center
                                        text-brand-600 font-bold text-xs shrink-0">
                          {(a.client?.nom ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {a.client?.nom ?? 'Client'}
                        </span>
                      </div>
                      <Etoiles note={a.note} />
                    </div>
                    {a.commentaire && (
                      <p className="text-xs text-gray-600 leading-relaxed">{a.commentaire}</p>
                    )}
                    {a.reponse_restaurant && (
                      <div className="mt-2 bg-brand-50 rounded-lg px-2.5 py-2">
                        <p className="text-xs font-semibold text-brand-600 flex items-center gap-1 mb-0.5">
                          <MessageSquare className="w-3 h-3" /> Réponse du restaurant
                        </p>
                        <p className="text-xs text-gray-600">{a.reponse_restaurant}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bouton ajouter au panier — fixé en bas */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          {!disponible ? (
            <div className="bg-gray-50 rounded-2xl py-4 px-5 flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-500">Non disponible actuellement</p>
                {item.horaires && (
                  <p className="text-xs text-gray-400 mt-0.5">{labelHoraires(item.horaires)}</p>
                )}
              </div>
            </div>
          ) : quantiteEnPanier === 0 || hasVariantes ? (
            <button
              onClick={handleAdd}
              disabled={hasVariantes && !varianteSelectionnee}
              className={`w-full rounded-2xl py-4 font-bold text-base transition-all
                         flex items-center justify-center gap-2 min-h-[56px]
                         ${hasVariantes && !varianteSelectionnee
                           ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                           : 'bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98]'
                         }`}
            >
              <Plus className="w-5 h-5" />
              {hasVariantes && !varianteSelectionnee
                ? 'Choisir une taille'
                : `Ajouter au panier · ${formatCurrency(prixAffiché)}`
              }
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Dans le panier</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => removeItem(item.id)}
                  className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center
                             hover:bg-gray-200 active:scale-95 transition-all"
                >
                  <Minus className="w-4 h-4 text-gray-700" />
                </button>
                <span className="font-black text-gray-900 text-lg w-6 text-center tabular-nums">
                  {quantiteEnPanier}
                </span>
                <button
                  onClick={handleAdd}
                  className="bg-brand-500 text-white rounded-full w-10 h-10 flex items-center justify-center
                             hover:bg-brand-600 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Carte article
//   • Clic sur la carte  → ouvre le modal détail
//   • Clic sur le "+"    → ajoute au panier directement (sans modal)
// ══════════════════════════════════════════════════════════
export default function MenuItemCard({ item, restaurantId, restaurantNom }) {
  const { items, addItem } = useCart()
  const quantiteEnPanier = items.find(i => i.id === item.id)?.quantite ?? 0
  const [modalOuvert, setModalOuvert] = useState(false)

  const disponible = isItemDisponibleMaintenant(item)

  // Ajout direct depuis la carte (bouton +)
  // Si l'article a des variantes, ouvre le modal pour que l'utilisateur choisisse
  function handleAddDirect(e) {
    e.stopPropagation()
    if (item.variantes?.length > 0) {
      setModalOuvert(true)
      return
    }
    const payload = {
      id: item.id,
      nom: item.nom,
      prix: item.prix,
      image_url: item.image_url ?? null,
      temps_preparation: item.temps_preparation ?? 15,
    }
    const { conflitRestaurant } = addItem(payload, restaurantId, restaurantNom)
    if (conflitRestaurant) {
      setModalOuvert(true)
    }
  }

  return (
    <>
      <div
        onClick={() => setModalOuvert(true)}
        className={`flex gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100
                   cursor-pointer hover:shadow-md active:scale-[0.99] transition-all
                   ${!disponible ? 'opacity-60' : ''}`}
      >
        {/* Image */}
        <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100 relative">
          {item.image_url ? (
            <img src={item.image_url} alt={item.nom} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl select-none">🍽️</span>
            </div>
          )}
          {!disponible && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1">
              {item.nom}
            </h4>
            {item.description && (
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
            {!disponible && item.horaires ? (
              <p className="text-xs text-orange-500 font-medium mt-1">
                {labelHoraires(item.horaires)}
              </p>
            ) : item.temps_preparation > 0 ? (
              <p className="text-gray-400 text-xs mt-1">⏱ {item.temps_preparation} min</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-brand-500 text-sm">
              {formatCurrency(item.prix)}
            </span>

            {!disponible ? (
              <Clock className="w-4 h-4 text-gray-400" />
            ) : quantiteEnPanier > 0 ? (
              /* Badge quantité — clic ouvre le modal pour modifier */
              <button
                onClick={e => { e.stopPropagation(); setModalOuvert(true) }}
                className="bg-brand-500 text-white text-xs font-bold
                           rounded-full w-6 h-6 flex items-center justify-center
                           hover:bg-brand-600 transition-colors"
              >
                {quantiteEnPanier}
              </button>
            ) : (
              /* Bouton + — ajoute directement au panier */
              <button
                onClick={handleAddDirect}
                className="bg-brand-500 text-white rounded-full w-7 h-7
                           flex items-center justify-center
                           hover:bg-brand-600 active:scale-95 transition-all"
                aria-label={`Ajouter ${item.nom} au panier`}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {modalOuvert && (
        <ModalPlat
          item={item}
          restaurantId={restaurantId}
          restaurantNom={restaurantNom}
          onClose={() => setModalOuvert(false)}
        />
      )}
    </>
  )
}
