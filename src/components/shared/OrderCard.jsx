// Carte commande réutilisable — id court, restaurant, statut, montant, date, actions contextuelles

import { Link } from 'react-router-dom'
import { ChevronRight, Clock } from 'lucide-react'
import { BadgeStatutCommande } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'

// ── Formatage date courte ──────────────────────────────────
function dateFR(isoDate) {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── ID court (8 premiers caractères de l'UUID) ─────────────
function idCourt(id) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : '—'
}

/**
 * Carte commande réutilisable.
 *
 * @param {{
 *   commande:        object,   // objet order complet
 *   role?:           string,   // 'client' | 'restaurant' | 'livreur' | 'admin'
 *   onClick?:        () => void,
 *   lienTracking?:   boolean,  // affiche un lien vers /suivi/:id (client uniquement)
 *   actions?:        React.ReactNode, // boutons contextuels custom
 *   className?:      string,
 * }} props
 */
export default function OrderCard({
  commande,
  role = 'client',
  onClick,
  lienTracking = false,
  actions,
  className = '',
}) {
  const montantTotal = (commande.montant_total ?? 0) + (commande.frais_livraison ?? 0)
  const statutCfg    = STATUTS_COMMANDE[commande.statut]

  const contenu = (
    <div className={`bg-white rounded-2xl shadow-card overflow-hidden ${className}`}>

      {/* ── Barre de statut colorée (2px en haut) ─────────── */}
      {statutCfg && (
        <div className={`h-1 w-full ${statutCfg.couleurDot}`} />
      )}

      <div className="p-4">
        {/* ── En-tête : id + statut + date ────────────────── */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs font-mono font-bold text-gray-500">
              {idCourt(commande.id)}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 shrink-0" />
              {dateFR(commande.created_at)}
            </p>
          </div>
          <BadgeStatutCommande statut={commande.statut} dot />
        </div>

        {/* ── Restaurant ──────────────────────────────────── */}
        {commande.restaurant && (
          <div className="flex items-center gap-2.5 mb-3">
            {/* Logo miniature */}
            <div className="w-8 h-8 rounded-xl bg-brand-100 overflow-hidden shrink-0
                            flex items-center justify-center text-brand-600 font-bold text-xs">
              {commande.restaurant.logo_url
                ? <img src={commande.restaurant.logo_url} alt=""
                       className="w-full h-full object-cover" />
                : commande.restaurant.nom?.[0]?.toUpperCase() ?? '🍽️'
              }
            </div>
            <p className="font-semibold text-gray-800 text-sm truncate">
              {commande.restaurant.nom}
            </p>
          </div>
        )}

        {/* ── Articles (résumé sur 2 lignes max) ───────────── */}
        {commande.order_items?.length > 0 && (
          <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3">
            {commande.order_items.slice(0, 2).map((oi, i) => (
              <p key={i} className="text-xs text-gray-600 truncate">
                {oi.quantite}× {oi.menu_item?.nom ?? '—'}
              </p>
            ))}
            {commande.order_items.length > 2 && (
              <p className="text-xs text-gray-400 mt-0.5">
                +{commande.order_items.length - 2} autre
                {commande.order_items.length - 2 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* ── Bas : montant + actions ──────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-black text-gray-900 tabular-nums">
              {formatCurrency(montantTotal)}
            </p>
            {/* Commissions visibles pour admin */}
            {role === 'admin' && commande.commission > 0 && (
              <p className="text-xs text-green-600 font-medium">
                +{formatCurrency(commande.commission)} comm.
              </p>
            )}
            {/* Type livraison/retrait */}
            <p className="text-xs text-gray-400 mt-0.5 capitalize">
              {commande.type === 'livraison' ? '🛵 Livraison' : '🏪 Retrait'}
            </p>
          </div>

          {/* Actions custom ou chevron de navigation */}
          {actions
            ? <div className="flex items-center gap-2">{actions}</div>
            : lienTracking && commande.statut !== 'livrée' && commande.statut !== 'annulée'
              ? (
                <Link
                  to={`/suivi/${commande.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-500
                             bg-brand-50 px-3 py-2 rounded-xl hover:bg-brand-100 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  Suivre <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )
              : onClick
              ? <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
              : null
          }
        </div>
      </div>
    </div>
  )

  // Si onClick fourni → wrapper cliquable
  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {contenu}
      </button>
    )
  }

  return contenu
}
