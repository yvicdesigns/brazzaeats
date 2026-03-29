import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Plus, Minus, ShoppingCart, Clock } from 'lucide-react'
import useCart, { useCartTotal, useCartTempsPrep } from '@/hooks/useCart'
import { formatCurrency } from '@/utils/formatCurrency'
import { TARIFS } from '@/utils/constants'

export default function Cart() {
  const navigate   = useNavigate()
  const {
    items,
    restaurantNom,
    updateQuantite,
    removeItem,
    clearCart,
  } = useCart()

  const sousTotal      = useCartTotal()
  const tempsPrep      = useCartTempsPrep()
  const fraisLivraison = items.length > 0 ? TARIFS.FRAIS_LIVRAISON_BASE : 0
  const total          = sousTotal + fraisLivraison

  // ── Panier vide ─────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <ShoppingCart className="w-20 h-20 text-gray-200 mb-5" strokeWidth={1.2} />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Votre panier est vide</h2>
        <p className="text-gray-500 text-sm mb-8">
          Ajoutez des plats depuis un restaurant pour commencer
        </p>
        <Link
          to="/"
          className="bg-brand-500 text-white font-bold py-3.5 px-10 rounded-xl
                     hover:bg-brand-600 transition-colors shadow-lg"
        >
          Découvrir les restaurants
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Retour">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 text-lg">Mon panier</h1>
          {restaurantNom && (
            <p className="text-xs text-gray-500 truncate">{restaurantNom}</p>
          )}
        </div>
        {/* Vider le panier */}
        <button
          onClick={() => {
            if (window.confirm('Vider le panier ?')) clearCart()
          }}
          className="text-red-400 hover:text-red-600 p-1 transition-colors"
          aria-label="Vider le panier"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      {/* ── Liste des articles ──────────────────────────── */}
      <section className="px-4 pt-4 space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-3 bg-white rounded-xl p-3.5 shadow-sm"
          >
            {/* Image */}
            <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-gray-100">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.nom}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
              )}
            </div>

            {/* Nom + prix */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1">
                {item.nom}
              </p>
              <p className="text-brand-500 font-bold text-sm mt-0.5">
                {formatCurrency(item.prix)}
              </p>
            </div>

            {/* Contrôle quantité */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => updateQuantite(item.id, item.quantite - 1)}
                className="bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center
                           hover:bg-gray-200 active:scale-95 transition-all"
                aria-label="Réduire la quantité"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-bold text-gray-900 text-sm w-6 text-center tabular-nums">
                {item.quantite}
              </span>
              <button
                onClick={() => updateQuantite(item.id, item.quantite + 1)}
                className="bg-brand-500 text-white rounded-full w-7 h-7 flex items-center justify-center
                           hover:bg-brand-600 active:scale-95 transition-all"
                aria-label="Augmenter la quantité"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Sous-total de la ligne */}
            <p className="text-gray-800 font-semibold text-sm shrink-0 tabular-nums ml-1">
              {formatCurrency(item.prix * item.quantite)}
            </p>
          </div>
        ))}
      </section>

      {/* ── Récapitulatif tarifaire ─────────────────────── */}
      <section className="mx-4 mt-4 bg-white rounded-xl shadow-sm p-4 space-y-2.5">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Sous-total ({items.length} article{items.length > 1 ? 's' : ''})</span>
          <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(sousTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Frais de livraison estimés</span>
          <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(fraisLivraison)}</span>
        </div>
        <div className="border-t border-gray-100 pt-2.5 flex justify-between">
          <span className="font-bold text-gray-900">Total estimé</span>
          <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(total)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Temps de préparation estimé : <strong className="text-gray-600">~{tempsPrep} min</strong></span>
        </div>
        <p className="text-xs text-gray-400">
          * Les frais de livraison définitifs seront confirmés à l'étape suivante.
        </p>
      </section>

      {/* ── Bouton Commander ────────────────────────────── */}
      <div className="px-4 mt-5">
        <Link
          to="/commande"
          className="block w-full bg-brand-500 text-white text-center font-bold py-4 rounded-xl
                     text-base hover:bg-brand-600 active:scale-[0.98] transition-all shadow-lg"
        >
          Commander — {formatCurrency(total)}
        </Link>
      </div>
    </div>
  )
}
