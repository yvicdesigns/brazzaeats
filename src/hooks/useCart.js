import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ------------------------------------------------------------
// Store panier — persisté dans localStorage sous la clé
// 'brazzaeats-cart' pour survivre aux rechargements de page.
// Un seul restaurant autorisé par panier (logique marketplace).
// ------------------------------------------------------------
const useCart = create(
  persist(
    (set, get) => ({
      // ── État ──────────────────────────────────────────────
      items:        [],   // [{ id, nom, prix, image_url, restaurantId, quantite }]
      restaurantId: null, // Restaurant auquel appartient le panier en cours
      restaurantNom: null,

      // ── Ajout d'un article ────────────────────────────────
      /**
       * @param {object} item — Article du menu (id, nom, prix, image_url)
       * @param {string} restaurantId — UUID du restaurant
       * @param {string} restaurantNom — Nom affiché du restaurant
       * @returns {{ conflitRestaurant: boolean }}
       *   Si true, le composant doit demander confirmation avant de vider le panier.
       */
      addItem: (item, restaurantId, restaurantNom) => {
        const { items, restaurantId: panierRestaurantId } = get()

        // Panier appartient à un autre restaurant → conflit
        if (panierRestaurantId && panierRestaurantId !== restaurantId) {
          return { conflitRestaurant: true }
        }

        const existant = items.find((i) => i.id === item.id)

        if (existant) {
          // Article déjà présent → incrémenter la quantité
          set({
            items: items.map((i) =>
              i.id === item.id ? { ...i, quantite: i.quantite + 1 } : i
            ),
          })
        } else {
          // Nouvel article
          set({
            items:         [...items, { ...item, quantite: 1 }],
            restaurantId,
            restaurantNom,
          })
        }

        return { conflitRestaurant: false }
      },

      // ── Retrait d'un article (décrémente ou supprime) ─────
      /**
       * Décrémente la quantité d'un article.
       * Si quantite === 1, supprime l'article du panier.
       * @param {string} itemId — UUID de l'article menu
       */
      removeItem: (itemId) => {
        const { items } = get()
        const cible = items.find((i) => i.id === itemId)
        if (!cible) return

        if (cible.quantite <= 1) {
          // Suppression complète
          const nouveauxItems = items.filter((i) => i.id !== itemId)
          set({
            items:         nouveauxItems,
            // Réinitialise le restaurant si le panier est vide
            restaurantId:  nouveauxItems.length === 0 ? null : get().restaurantId,
            restaurantNom: nouveauxItems.length === 0 ? null : get().restaurantNom,
          })
        } else {
          set({
            items: items.map((i) =>
              i.id === itemId ? { ...i, quantite: i.quantite - 1 } : i
            ),
          })
        }
      },

      // ── Mise à jour directe de la quantité ───────────────
      /**
       * @param {string} itemId
       * @param {number} quantite — Doit être ≥ 1
       */
      updateQuantite: (itemId, quantite) => {
        if (quantite < 1) {
          get().removeItem(itemId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.id === itemId ? { ...i, quantite } : i
          ),
        })
      },

      // ── Vidage complet du panier ──────────────────────────
      clearCart: () => {
        set({ items: [], restaurantId: null, restaurantNom: null })
      },

      // ── Remplacement panier (après confirmation de conflit) ──
      /**
       * Vide le panier existant et ajoute le nouvel article.
       * À appeler après que l'utilisateur a confirmé changer de restaurant.
       */
      replaceAndAdd: (item, restaurantId, restaurantNom) => {
        set({
          items:         [{ ...item, quantite: 1 }],
          restaurantId,
          restaurantNom,
        })
      },

      // ── Sélecteurs calculés ───────────────────────────────

      /** Nombre total d'articles (somme des quantités) */
      get totalItems() {
        return get().items.reduce((acc, i) => acc + i.quantite, 0)
      },

      /** Sous-total en FCFA (articles uniquement, sans frais de livraison) */
      get sousTotal() {
        return get().items.reduce((acc, i) => acc + i.prix * i.quantite, 0)
      },
    }),

    {
      name:    'brazzaeats-cart',   // Clé localStorage
      version: 1,                   // Incrémenter si la structure change
      // Sérialisation partielle : on ne persiste que ce qui est utile
      partialize: (state) => ({
        items:         state.items,
        restaurantId:  state.restaurantId,
        restaurantNom: state.restaurantNom,
      }),
    }
  )
)

// ------------------------------------------------------------
// Sélecteurs mémoïsés — à utiliser dans les composants pour
// éviter les re-renders inutiles
// ------------------------------------------------------------

/** Renvoie uniquement le nombre d'articles (pour le badge Navbar) */
export function useCartCount() {
  return useCart((s) => s.items.reduce((acc, i) => acc + i.quantite, 0))
}

/** Renvoie le sous-total en FCFA */
export function useCartTotal() {
  return useCart((s) => s.items.reduce((acc, i) => acc + i.prix * i.quantite, 0))
}

/** Renvoie le temps de préparation estimé (max parmi les articles, en minutes) */
export function useCartTempsPrep() {
  return useCart((s) =>
    s.items.length === 0
      ? 0
      : Math.max(...s.items.map(i => i.temps_preparation ?? 15))
  )
}

export default useCart
