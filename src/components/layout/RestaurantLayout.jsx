import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Star, Settings, Tag, BarChart2 } from 'lucide-react'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { useRestaurantPendingCount } from '@/hooks/useRestaurantPendingCount'
import { useRestaurantNotifications } from '@/hooks/useRestaurantNotifications'

const NAV_ITEMS = [
  { to: '/restaurant/dashboard',   label: 'Dashboard',   Icon: LayoutDashboard  },
  { to: '/restaurant/commandes',   label: 'Commandes',   Icon: ClipboardList    },
  { to: '/restaurant/menu',        label: 'Menu',        Icon: UtensilsCrossed  },
  { to: '/restaurant/promos',      label: 'Promos',      Icon: Tag              },
  { to: '/restaurant/historique',  label: 'Revenus',     Icon: BarChart2        },
  { to: '/restaurant/avis',        label: 'Avis',        Icon: Star             },
  { to: '/restaurant/profil',      label: 'Profil',      Icon: Settings         },
]

/**
 * Layout partagé de toutes les pages du dashboard restaurant.
 * - Desktop (md+) : sidebar latérale fixe de 64px de large
 * - Mobile : navigation fixe en bas d'écran
 *
 * Utilisé dans App.jsx en tant que layout wrapper :
 *   <Route element={<RestaurantLayout />}>
 *     <Route path="dashboard" element={<Dashboard />} />
 *     …
 *   </Route>
 *
 * @param {{ pendingCount?: number }} props
 *   pendingCount — nombre de commandes en attente (badge rouge)
 */
export default function RestaurantLayout() {
  const { restaurant } = useMyRestaurant()
  const pendingCount = useRestaurantPendingCount(restaurant?.id)
  useRestaurantNotifications(restaurant?.id)

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar desktop (md+) ───────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200
                        fixed top-0 left-0 h-full z-30 pt-6">
        {/* Logo / titre */}
        <div className="px-5 mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">BrazzaEats</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">Espace restaurant</p>
        </div>

        {/* Liens de navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-colors relative
                 ${isActive
                   ? 'bg-brand-50 text-brand-600'
                   : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{label}</span>
                  {/* Badge commandes en attente */}
                  {label === 'Commandes' && pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold
                                     min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Contenu principal ───────────────────────────── */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* ── Navigation mobile en bas ─────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200
                      shadow-bottom z-40 pb-safe">
        <div className="flex h-16">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 relative
                 transition-colors
                 ${isActive ? 'text-brand-500' : 'text-gray-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 1.8} />
                    {label === 'Commandes' && pendingCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-red-500 text-white
                                       text-[9px] font-bold min-w-[1rem] h-4 px-0.5 rounded-full
                                       flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
