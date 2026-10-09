/**
 * AlarmeNouvelleCommande — prise de contrôle plein écran à chaque nouvelle
 * commande, tant qu'elle n'a pas été explicitement acceptée ou refusée.
 * Montée une seule fois dans RestaurantLayout — visible depuis n'importe
 * quelle page de l'espace restaurant.
 */
import { Check, X, Loader2, Bell } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'

export default function AlarmeNouvelleCommande({ commande, restantes, onAccepter, onRefuser, enCours }) {
  if (!commande) return null

  const nbArticles = commande.order_items?.length ?? 0

  return (
    <div className="fixed inset-0 z-[100] bg-red-600 flex flex-col animate-pulse-bg">
      <style>{`
        @keyframes pulse-bg {
          0%, 100% { background-color: rgb(220 38 38); }
          50%      { background-color: rgb(185 28 28); }
        }
        .animate-pulse-bg { animation: pulse-bg 1.1s ease-in-out infinite; }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-5 animate-bounce">
          <Bell className="w-10 h-10" strokeWidth={2} />
        </div>

        <p className="text-sm font-bold uppercase tracking-widest text-white/80">
          {restantes > 1 ? `1 sur ${restantes} nouvelles commandes` : 'Nouvelle commande'}
        </p>
        <h1 className="text-3xl font-black mt-1">{commande.client?.nom ?? 'Client'}</h1>

        <div className="mt-6 bg-white/15 rounded-2xl px-5 py-4 w-full max-w-sm">
          <div className="flex justify-between text-sm text-white/80">
            <span>{nbArticles} article{nbArticles > 1 ? 's' : ''}</span>
            <span>#{commande.id?.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto text-left">
            {(commande.order_items ?? []).map((oi, i) => (
              <p key={i} className="text-sm text-white/90">
                {oi.quantite}× {oi.menu_item?.nom ?? '—'}
              </p>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-baseline">
            <span className="text-white/70 text-xs">Total</span>
            <span className="text-2xl font-black">{formatCurrency(commande.montant_total ?? 0)}</span>
          </div>
        </div>
      </div>

      <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex gap-3">
        <button
          onClick={() => onRefuser(commande.id)}
          disabled={enCours}
          className="flex-1 min-h-[64px] bg-white/15 text-white font-bold rounded-2xl
                     flex items-center justify-center gap-2 active:scale-[0.97] transition-transform
                     disabled:opacity-50"
        >
          {enCours === 'refuser' ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
          Refuser
        </button>
        <button
          onClick={() => onAccepter(commande.id)}
          disabled={enCours}
          className="flex-[2] min-h-[64px] bg-white text-red-600 font-black text-lg rounded-2xl
                     flex items-center justify-center gap-2 active:scale-[0.97] transition-transform
                     disabled:opacity-50 shadow-xl"
        >
          {enCours === 'accepter' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-6 h-6" />}
          Accepter la commande
        </button>
      </div>
    </div>
  )
}
