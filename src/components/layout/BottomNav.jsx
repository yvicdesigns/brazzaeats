import { NavLink } from 'react-router-dom'
import { Home, ShoppingBag, ShoppingCart, User } from 'lucide-react'
import { useCartCount } from '@/hooks/useCart'

const NAV_ITEMS = [
  { to: '/',              label: 'Accueil',   Icon: Home,        end: true  },
  { to: '/mes-commandes', label: 'Commandes', Icon: ShoppingBag, end: false },
  { to: '/panier',        label: 'Panier',    Icon: ShoppingCart, end: false },
  { to: '/profil',        label: 'Profil',    Icon: User,        end: false },
]

/**
 * Navigation mobile fixe en bas d'écran.
 * Hauteur : 4rem (h-16)
 */
export default function BottomNav() {
  const cartCount = useCartCount()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-bottom z-40">
      <div className="flex h-16">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
               ${isActive ? 'text-brand-500' : 'text-gray-400 hover:text-gray-500'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {/* Badge panier */}
                  {to === '/panier' && cartCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-brand-500 text-white
                                     text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
