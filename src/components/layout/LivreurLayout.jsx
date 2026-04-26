import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Bike, History } from 'lucide-react'
import { useLivreurNotifications } from '@/hooks/useLivreurNotifications'
import Sidebar from '@/components/layout/Sidebar'

const NAV_LIVREUR = [
  { to: '/livreur/dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
  { to: '/livreur/disponible', label: 'Disponibles', Icon: Bike            },
  { to: '/livreur/historique', label: 'Historique',  Icon: History         },
]

function LivreurBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200
                    shadow-bottom z-40 pb-safe">
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
  // Notifications globales — son + browser notif + toast sur toutes les pages livreur
  useLivreurNotifications()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        <Outlet />
      </main>
      <LivreurBottomNav />
    </div>
  )
}
