// Sidebar latérale pour les dashboards livreur et admin (desktop md+)

import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bike, History, Settings, User,
  Users, Store, LogOut, ChevronRight, Wallet, Star, ShoppingBag, Tag, CalendarRange,
  TriangleAlert, MessageSquare, Menu as MenuIcon, X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ── Liens par rôle ─────────────────────────────────────────
const NAV_PAR_ROLE = {
  livreur: [
    { to: '/livreur/dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
    { to: '/livreur/disponible', label: 'Disponibles', Icon: Bike            },
    { to: '/livreur/historique', label: 'Historique',  Icon: History         },
    { to: '/livreur/profil',     label: 'Profil',      Icon: User            },
  ],
  admin: [
    { to: '/admin/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
    { to: '/admin/commandes',    label: 'Commandes',    Icon: ShoppingBag     },
    { to: '/admin/historique',   label: 'Historique',   Icon: CalendarRange   },
    { to: '/admin/restaurants',  label: 'Restaurants',  Icon: Store           },
    { to: '/admin/livreurs',     label: 'Livreurs',     Icon: Bike            },
    { to: '/admin/utilisateurs', label: 'Utilisateurs', Icon: Users           },
    { to: '/admin/promos',       label: 'Promos',       Icon: Tag             },
    { to: '/admin/versements',   label: 'Versements',   Icon: Wallet          },
    { to: '/admin/avis',         label: 'Avis',         Icon: Star            },
    { to: '/admin/signalements', label: 'Signalements', Icon: TriangleAlert   },
    { to: '/admin/messages',     label: 'Messages',     Icon: MessageSquare   },
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
// ── Contenu partagé desktop/mobile (liens + profil + déconnexion) ──
function ContenuNav({ liens, labelRole, profile, role, onNavigate, onLogout }) {
  return (
    <>
      <div className="px-5 mb-8">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Zandofood</p>
        <p className="text-sm font-bold text-gray-800 mt-0.5">{labelRole}</p>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" onClick={onNavigate}>
        {liens.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="px-3 pb-6 pt-4 border-t border-gray-100 mt-auto">
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

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.8} />
          Se déconnecter
        </button>
      </div>
    </>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { profile, role, logout } = useAuth()
  const [drawerOuvert, setDrawerOuvert] = useState(false)

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
    <>
      {/* ── Sidebar desktop (md+) ──────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200
                        fixed top-0 left-0 h-full z-30 pt-6">
        <ContenuNav
          liens={liens} labelRole={labelRole} profile={profile} role={role}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Barre + menu mobile (md-) ──────────────────────────
          Seul l'admin n'a pas d'autre navigation mobile (le livreur a
          déjà sa barre du bas + déconnexion dans son Profil) — limité à
          ce rôle pour ne pas chevaucher le bandeau hors-ligne du livreur,
          lui aussi fixe en haut d'écran. */}
      {role === 'admin' && (
        <>
          <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-gray-200
                             flex items-center justify-between px-4 h-14"
                  style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Zandofood</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5 leading-none">{labelRole}</p>
            </div>
            <button
              onClick={() => setDrawerOuvert(true)}
              aria-label="Ouvrir le menu"
              className="p-2 -mr-2 rounded-xl hover:bg-gray-100 text-gray-700"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </header>

          {drawerOuvert && (
            <div
              className="md:hidden fixed inset-0 z-50 bg-black/50"
              onClick={e => { if (e.target === e.currentTarget) setDrawerOuvert(false) }}
            >
              <aside className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-white
                                flex flex-col pt-6 shadow-2xl"
                     style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
                <button
                  onClick={() => setDrawerOuvert(false)}
                  aria-label="Fermer le menu"
                  className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 text-gray-500"
                  style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
                >
                  <X className="w-5 h-5" />
                </button>
                <ContenuNav
                  liens={liens} labelRole={labelRole} profile={profile} role={role}
                  onNavigate={() => setDrawerOuvert(false)}
                  onLogout={handleLogout}
                />
              </aside>
            </div>
          )}
        </>
      )}
    </>
  )
}
