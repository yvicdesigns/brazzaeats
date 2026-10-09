/**
 * AlarmeNouvelleLivraison — offre de course plein écran avec compte à
 * rebours de 30 secondes, tant qu'une livraison disponible n'a pas été
 * explicitement acceptée, refusée, ou que le temps n'est pas écoulé.
 * Montée une seule fois dans LivreurLayout — visible depuis n'importe
 * quelle page de l'espace livreur.
 */
import { Check, X, Loader2, Bike, MapPin } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'

const DUREE_TOTALE = 30

export default function AlarmeNouvelleLivraison({ commande, secondesRestantes, restantes, onAccepter, onRefuser, enCours }) {
  if (!commande) return null

  const progression = secondesRestantes / DUREE_TOTALE // 1 → 0
  const rayon = 42
  const circonference = 2 * Math.PI * rayon
  const adresse = commande.adresse_livraison
    ? `${commande.adresse_livraison.rue ?? ''}, ${commande.adresse_livraison.quartier ?? ''}`.replace(/^, |, $/, '') || '—'
    : '—'

  return (
    <div className="fixed inset-0 z-[100] bg-amber-500 flex flex-col animate-pulse-bg-livreur">
      <style>{`
        @keyframes pulse-bg-livreur {
          0%, 100% { background-color: rgb(245 158 11); }
          50%      { background-color: rgb(217 119 6); }
        }
        .animate-pulse-bg-livreur { animation: pulse-bg-livreur 1.1s ease-in-out infinite; }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center text-white">
        {/* Compte à rebours circulaire */}
        <div className="relative w-28 h-28 mb-5">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={rayon} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={rayon} fill="none" stroke="white" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circonference}
              strokeDashoffset={circonference * (1 - progression)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-black tabular-nums">{secondesRestantes}</span>
          </div>
        </div>

        <p className="text-sm font-bold uppercase tracking-widest text-white/80">
          {restantes > 1 ? `1 sur ${restantes} livraisons proposées` : 'Nouvelle livraison'}
        </p>
        <h1 className="text-2xl font-black mt-1 flex items-center gap-2">
          <Bike className="w-6 h-6" /> {commande.restaurant?.nom ?? 'Restaurant'}
        </h1>

        <div className="mt-6 bg-white/15 rounded-2xl px-5 py-4 w-full max-w-sm text-left">
          <p className="text-xs text-white/70 font-medium">Livrer à</p>
          <p className="text-sm font-semibold flex items-start gap-1.5 mt-1">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            {adresse}
          </p>
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-baseline">
            <span className="text-white/70 text-xs">Votre gain</span>
            <span className="text-2xl font-black">{formatCurrency(commande.frais_livraison ?? 0)}</span>
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
          className="flex-[2] min-h-[64px] bg-white text-amber-600 font-black text-lg rounded-2xl
                     flex items-center justify-center gap-2 active:scale-[0.97] transition-transform
                     disabled:opacity-50 shadow-xl"
        >
          {enCours === 'accepter' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-6 h-6" />}
          Accepter
        </button>
      </div>
    </div>
  )
}
