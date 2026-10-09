/**
 * Bandeau discret "Mode hors-ligne" — n'apparaît que si le réseau est
 * coupé OU qu'il reste des actions non encore synchronisées. Ne bloque
 * jamais l'utilisation de l'app (pas de modal, pas d'écran figé).
 */
import { WifiOff, RefreshCw } from 'lucide-react'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'

export default function BandeauHorsLigne() {
  const { taille, enLigne } = useOfflineQueue()
  if (enLigne && taille === 0) return null

  return (
    <div
      className="fixed top-0 inset-x-0 z-[90] bg-amber-500 text-white text-xs font-semibold
                 px-4 py-2 flex items-center justify-center gap-2 shadow-md text-center"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
    >
      {enLigne
        ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        : <WifiOff className="w-3.5 h-3.5 shrink-0" />
      }
      {enLigne
        ? `Synchronisation en cours… (${taille})`
        : taille > 0
          ? `Mode hors-ligne — ${taille} action${taille > 1 ? 's' : ''} en attente de synchronisation`
          : 'Mode hors-ligne'
      }
    </div>
  )
}
