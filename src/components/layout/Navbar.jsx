// Barre de navigation desktop — logo, liens contextuels selon le rôle, panier avec badge, menu profil

import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, User, LogOut, Settings,
  ChevronDown, LayoutDashboard,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCartCount } from '@/hooks/useCart'

// ── Liens de navigation selon le rôle ─────────────────────
const LIENS_PAR_ROLE = {
  client: [
    { to: '/',              label: 'Accueil',    end: true  },
    { to: '/mes-commandes', label: 'Commandes',  end: false },
  ],
  restaurant: [
    { to: '/restaurant/dashboard', label: 'Dashboard',  end: false },
    { to: '/restaurant/commandes', label: 'Commandes',  end: false },
    { to: '/restaurant/menu',      label: 'Menu',       end: false },
    { to: '/restaurant/avis',      label: 'Avis',       end: false },
  ],
  livreur: [
    { to: '/livreur/dashboard',  label: 'Dashboard',    end: false },
    { to: '/livreur/disponible', label: 'Disponibles',  end: false },
    { to: '/livreur/historique', label: 'Historique',   end: false },
  ],
  admin: [
    { to: '/admin/dashboard',    label: 'Dashboard',    end: false },
    { to: '/admin/restaurants',  label: 'Restaurants',  end: false },
    { to: '/admin/utilisateurs', label: 'Utilisateurs', end: false },
  ],
}

// ── Menu déroulant profil ──────────────────────────────────
function MenuProfil({ profile, role, onLogout }) {
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef(null)

  // Fermer en cliquant hors du menu
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initiale = (profile?.nom ?? 'U')[0].toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOuvert(o => !o)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl
                   hover:bg-gray-100 transition-colors"
      >
        {/* Avatar initiale */}
        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-600
                        flex items-center justify-center text-xs font-bold shrink-0">
          {initiale}
        </div>
        <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate hidden sm:block">
          {profile?.nom ?? 'Profil'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {ouvert && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl
                        border border-gray-100 py-1.5 z-50">
          {/* Infos utilisateur */}
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-800 truncate">{profile?.nom ?? '—'}</p>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{role ?? '—'}</p>
          </div>

          {/* Lien dashboard (si pas client) */}
          {role && role !== 'client' && (
            <Link
              to={`/${role}/dashboard`}
              onClick={() => setOuvert(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700
                         hover:bg-gray-50 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-gray-400" />
              Mon dashboard
            </Link>
          )}

          {/* Profil / paramètres */}
          <Link
            to={role === 'client' ? '/profil' : `/${role}/profil`}
            onClick={() => setOuvert(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700
                       hover:bg-gray-50 transition-colors"
          >
            <User className="w-4 h-4 text-gray-400" />
            Mon profil
          </Link>

          {/* Paramètres admin */}
          {role === 'admin' && (
            <Link
              to="/admin/parametres"
              onClick={() => setOuvert(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700
                         hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              Paramètres
            </Link>
          )}

          {/* Déconnexion */}
          <button
            onClick={() => { setOuvert(false); onLogout() }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500
                       hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Navbar
// ══════════════════════════════════════════════════════════
export default function Navbar() {
  const navigate = useNavigate()
  const { profile, role, logout } = useAuth()
  const cartCount = useCartCount()

  const liens = LIENS_PAR_ROLE[role] ?? LIENS_PAR_ROLE.client

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link
          to={role === 'client' || !role ? '/' : `/${role}/dashboard`}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-sm">🍽️</span>
          </div>
          <span className="font-black text-gray-900 text-base hidden sm:block">BrazzaEats</span>
        </Link>

        {/* ── Liens de navigation (desktop) ───────────────── */}
        <nav className="hidden md:flex items-center gap-1 flex-1 px-4">
          {liens.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ── Actions droite ───────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Panier (client uniquement) */}
          {(!role || role === 'client') && (
            <Link
              to="/panier"
              className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Panier"
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" strokeWidth={1.8} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white
                                 text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Menu profil ou lien connexion */}
          {profile
            ? (
              <MenuProfil
                profile={profile}
                role={role}
                onLogout={handleLogout}
              />
            )
            : (
              <Link
                to="/login"
                className="bg-brand-500 text-white text-sm font-semibold
                           px-4 py-2 rounded-xl hover:bg-brand-600 transition-colors"
              >
                Connexion
              </Link>
            )
          }
        </div>
      </div>
    </header>
  )
}
