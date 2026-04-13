// Sidebar latérale pour les dashboards livreur et admin (desktop md+)

import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bike, History, Settings,
  Users, Store, LogOut, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ── Liens par rôle ─────────────────────────────────────────
const NAV_PAR_ROLE = {
  livreur: [
    { to: '/livreur/dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
    { to: '/livreur/disponible', label: 'Disponibles', Icon: Bike            },
    { to: '/livreur/historique', label: 'Historique',  Icon: History         },
  ],
  admin: [
    { to: '/admin/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
    { to: '/admin/restaurants',  label: 'Restaurants',  Icon: Store           },
    { to: '/admin/utilisateurs', label: 'Utilisateurs', Icon: Users           },
    { to: '/admin/parametres',   label: 'Paramètres',   Icon: Settings        },
  ],
}

// ── Élément de navigation ──────────────────────────────────
function NavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
         transition-colors relative group
         ${isActive
           ? 'bg-brand-50 text-brand-600'
           : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
         }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
          <span className="flex-1">{label}</span>
          {isActive && (
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          )}
        </>
      )}
    </NavLink>
  )
}

// ══════════════════════════════════════════════════════════
// Sidebar
// ══════════════════════════════════════════════════════════
export default function Sidebar() {
  const navigate = useNavigate()
  const { profile, role, logout } = useAuth()

  const liens = NAV_PAR_ROLE[role] ?? []

  const labelRole = {
    livreur: 'Espace livreur',
    admin:   'Administration',
  }[role] ?? 'Dashboard'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200
                      fixed top-0 left-0 h-full z-30 pt-6">

      {/* ── Logo / titre ──────────────────────────────────── */}
      <div className="px-5 mb-8">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Zandofood</p>
        <p className="text-sm font-bold text-gray-800 mt-0.5">{labelRole}</p>
      </div>

      {/* ── Liens de navigation ───────────────────────────── */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {liens.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* ── Zone profil + déconnexion ─────────────────────── */}
      <div className="px-3 pb-6 pt-4 border-t border-gray-100 mt-auto">
        {/* Infos utilisateur */}
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600
                          flex items-center justify-center text-sm font-bold shrink-0">
            {(profile?.nom ?? 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {profile?.nom ?? '—'}
            </p>
            <p className="text-xs text-gray-400 capitalize">{role}</p>
          </div>
        </div>

        {/* Bouton déconnexion */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.8} />
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
