import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Bike, History, User } from 'lucide-react'
import { useLivreurNotifications } from '@/hooks/useLivreurNotifications'
import { useLivreurPositionReporter } from '@/hooks/useLivreurPositionReporter'
import Sidebar from '@/components/layout/Sidebar'
import AlarmeNouvelleLivraison from '@/components/livreur/AlarmeNouvelleLivraison'
import BandeauHorsLigne from '@/components/shared/BandeauHorsLigne'

const NAV_LIVREUR = [
  { to: '/livreur/dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
  { to: '/livreur/disponible', label: 'Disponibles', Icon: Bike            },
  { to: '/livreur/historique', label: 'Historique',  Icon: History         },
  { to: '/livreur/profil',     label: 'Profil',      Icon: User            },
]

function LivreurBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200
                    shadow-bottom z-40 pb-safe-only">
      <div className="flex h-16">
        {NAV_LIVREUR.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
               ${isActive ? 'text-brand-500' : 'text-gray-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function LivreurLayout() {
  // Notifications globales — alarme + compte à rebours sur toutes les pages livreur
  const { commandeAlarme, nbEnAttente, secondesRestantes, enCours, accepter, refuser } = useLivreurNotifications()
  // Remonte la position GPS réelle au serveur pendant une livraison active
  useLivreurPositionReporter()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <BandeauHorsLigne />
      <Sidebar />
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        <Outlet />
      </main>
      <LivreurBottomNav />

      {/* ── Alarme plein écran nouvelle livraison ────────── */}
      <AlarmeNouvelleLivraison
        commande={commandeAlarme}
        restantes={nbEnAttente}
        secondesRestantes={secondesRestantes}
        enCours={enCours}
        onAccepter={accepter}
        onRefuser={refuser}
      />
    </div>
  )
}
