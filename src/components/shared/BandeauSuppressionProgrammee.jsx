/**
 * Bandeau discret affiché sur toutes les pages restaurant tant qu'une
 * suppression est en attente (deleted_at renseigné) — sur le modèle de
 * BandeauHorsLigne. Ne bloque jamais la navigation : le propriétaire garde
 * accès à son espace pour pouvoir annuler la suppression depuis son Profil.
 */
import { AlertTriangle } from 'lucide-react'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'

const JOURS_RETENTION = 30

export default function BandeauSuppressionProgrammee() {
  const { restaurant } = useMyRestaurant()
  if (!restaurant?.deleted_at) return null

  const dateEffacement = new Date(restaurant.deleted_at)
  dateEffacement.setDate(dateEffacement.getDate() + JOURS_RETENTION)

  return (
    <div
      className="fixed top-0 inset-x-0 z-[90] bg-red-600 text-white text-xs font-semibold
                 px-4 py-2 flex items-center justify-center gap-2 shadow-md text-center"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      {`Restaurant supprimé le ${dateEffacement.toLocaleDateString('fr-FR')} — annulez depuis votre Profil`}
    </div>
  )
}
