import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Home, ClipboardList, UtensilsCrossed, LineChart, Menu as IconeMenu, Tag, Star, Users, Settings, LogOut, X } from 'lucide-react'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { useRestaurantPendingCount } from '@/hooks/useRestaurantPendingCount'
import { useRestaurantNotifications } from '@/hooks/useRestaurantNotifications'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { updateRestaurant } from '@/services/menuService'
import { finDePause } from '@/services/restaurantService'
import AlarmeNouvelleCommande from '@/components/restaurant/AlarmeNouvelleCommande'
import PanneauPause from '@/components/restaurant/PanneauPause'
import BandeauHorsLigne from '@/components/shared/BandeauHorsLigne'
import BandeauSuppressionProgrammee from '@/components/shared/BandeauSuppressionProgrammee'

// Les 4 écrans du service — onglets du bas sur téléphone, en tête partout ailleurs
const NAV_PRINCIPALE = [
  { to: '/restaurant/dashboard',  label: 'Accueil',   labelLong: 'Tableau de bord',       Icon: Home            },
  { to: '/restaurant/commandes',  label: 'Commandes', labelLong: 'Commandes',             Icon: ClipboardList   },
  { to: '/restaurant/menu',       label: 'Menu',      labelLong: 'Menu',                  Icon: UtensilsCrossed },
  { to: '/restaurant/historique', label: 'Revenus',   labelLong: 'Revenus et versements', Icon: LineChart       },
]

// Rangés dans « Plus » sur téléphone et tablette
const NAV_SECONDAIRE = [
  { to: '/restaurant/promos',  label: 'Promotions', Icon: Tag      },
  { to: '/restaurant/avis',    label: 'Avis',       Icon: Star     },
  { to: '/restaurant/clients', label: 'Clients',    Icon: Users    },
  { to: '/restaurant/profil',  label: 'Réglages',   Icon: Settings },
]

function Badge({ n, compact = false }) {
  if (!n) return null
  return (
    <span className={`font-extrabold rounded-full flex items-center justify-center
                      ${compact
                        ? 'bg-terracotta-600 text-white min-w-[18px] h-[18px] px-1 text-[11px] ring-2 ring-white'
                        : 'bg-terracotta-50 text-terracotta-700 min-w-[22px] h-[22px] px-1.5 text-xs'}`}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

/**
 * Layout de l'espace restaurant, adapté à l'écran :
 * - téléphone (< md) : 5 onglets en bas, « Plus » ouvre un panneau
 * - tablette (md → lg) : barre d'icônes à gauche
 * - ordinateur (lg+) : menu latéral complet
 */
export default function RestaurantLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { restaurant, setRestaurant } = useMyRestaurant()
  const pendingCount = useRestaurantPendingCount(restaurant?.id)
  const { commandeAlarme, nbEnAttente, enCours, accepter, refuser } = useRestaurantNotifications(restaurant?.id)
  const [plusOuvert, setPlusOuvert] = useState(false)
  const [pauseOuverte, setPauseOuverte] = useState(false)
  const [, rafraichir] = useState(0)

  useEffect(() => { setPlusOuvert(false) }, [location.pathname])

  // La pause se termine toute seule : on réaffiche « Ouvert » sans recharger
  const pause = finDePause(restaurant?.pause_jusqu_a)
  useEffect(() => {
    if (!pause) return
    const id = setTimeout(() => rafraichir(n => n + 1), pause.getTime() - Date.now() + 500)
    return () => clearTimeout(id)
  }, [pause?.getTime()])

  async function changerPause(fin) {
    const { data, error } = await updateRestaurant(restaurant.id, { pause_jusqu_a: fin ? fin.toISOString() : null })
    if (error) { toast.error('Erreur : ' + error); return }
    setRestaurant(data)
    setPauseOuverte(false)
    toast.success(fin ? 'Pause activée' : 'Commandes reprises')
  }

  const secondaireActif = NAV_SECONDAIRE.some(i => location.pathname.startsWith(i.to))

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-white flex">
      <BandeauHorsLigne />
      <BandeauSuppressionProgrammee />

      {/* ── Ordinateur : menu latéral complet ───────────── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 fixed top-0 left-0 h-full z-30 px-3.5 py-6 gap-7">
        <div className="px-2.5">
          <p className="font-['Unbounded'] font-bold text-[17px] text-brand-500">zandofood</p>
          <p className="text-[13px] font-semibold text-gray-500 mt-1 truncate">{restaurant?.nom ?? 'Espace restaurant'}</p>
        </div>
        <nav aria-label="Navigation restaurant" className="flex-1 flex flex-col gap-0.5">
          {[...NAV_PRINCIPALE, ...NAV_SECONDAIRE].map(({ to, label, labelLong, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `h-10 rounded-[10px] px-2.5 flex items-center gap-3 text-sm transition-colors
                 ${isActive ? 'bg-brand-50/70 text-brand-500 font-extrabold' : 'text-gray-600 font-semibold hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
              <span className="flex-1">{labelLong ?? label}</span>
              {to === '/restaurant/commandes' && <Badge n={pendingCount} />}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="h-10 rounded-[10px] px-2.5 flex items-center gap-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.9} />
          Se déconnecter
        </button>
      </aside>

      {/* ── Tablette : barre d'icônes ───────────────────── */}
      <nav aria-label="Navigation restaurant" className="hidden md:flex lg:hidden flex-col w-[88px] bg-white border-r border-gray-100 fixed top-0 left-0 h-full z-30 px-2 py-5 gap-1.5">
        <p className="font-['Unbounded'] font-bold text-lg text-brand-500 text-center pb-3">z</p>
        {NAV_PRINCIPALE.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `h-[60px] rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] relative transition-colors
               ${isActive ? 'bg-brand-50/70 text-brand-500 font-extrabold' : 'text-gray-500 font-bold hover:bg-gray-50'}`
            }
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={1.9} />
            {label}
            {to === '/restaurant/commandes' && pendingCount > 0 && (
              <span className="absolute top-2 right-4"><Badge n={pendingCount} compact /></span>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setPlusOuvert(true)}
          className={`h-[60px] rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] transition-colors
                      ${secondaireActif ? 'bg-brand-50/70 text-brand-500 font-extrabold' : 'text-gray-500 font-bold hover:bg-gray-50'}`}
        >
          <IconeMenu className="w-[22px] h-[22px]" strokeWidth={1.9} />
          Plus
        </button>
      </nav>

      {/* ── Contenu ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 md:ml-[88px] lg:ml-60 pb-24 md:pb-0">
        {pause && (
          <div className="sticky top-0 z-20 bg-white px-4 lg:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 border-b border-gray-100">
            <div className="max-w-3xl flex items-center gap-3 pl-3.5 pr-2 py-2 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-extrabold text-amber-900">En pause</span>
                <span className="block text-[13px] font-semibold text-amber-900">
                  Reprise automatique à {pause.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
              <button onClick={() => changerPause(null)} className="h-10 px-3.5 rounded-xl bg-brand-500 text-white text-sm font-bold shrink-0">
                Reprendre
              </button>
            </div>
          </div>
        )}
        <Outlet context={{ restaurant, pause, ouvrirPause: () => setPauseOuverte(true), reprendre: () => changerPause(null) }} />
      </main>

      {pauseOuverte && <PanneauPause onValider={changerPause} onFermer={() => setPauseOuverte(false)} />}

      {/* ── Téléphone : onglets en bas ──────────────────── */}
      <nav aria-label="Navigation restaurant" className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40 pb-safe-only">
        <div className="grid grid-cols-5 h-16 px-2">
          {NAV_PRINCIPALE.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] relative
                 ${isActive ? 'text-brand-500 font-extrabold' : 'text-gray-500 font-bold'}`
              }
            >
              <span className="relative">
                <Icon className="w-[22px] h-[22px]" strokeWidth={1.9} />
                {to === '/restaurant/commandes' && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-3"><Badge n={pendingCount} compact /></span>
                )}
              </span>
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => setPlusOuvert(true)}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] ${secondaireActif ? 'text-brand-500 font-extrabold' : 'text-gray-500 font-bold'}`}
          >
            <IconeMenu className="w-[22px] h-[22px]" strokeWidth={1.9} />
            Plus
          </button>
        </div>
      </nav>

      {/* ── Panneau « Plus » (téléphone et tablette) ────── */}
      {plusOuvert && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Plus">
          <button className="absolute inset-0 bg-gray-900/40" aria-label="Fermer" onClick={() => setPlusOuvert(false)} />
          <div className="absolute bottom-0 inset-x-0 md:left-[88px] md:right-auto md:top-0 md:w-80 bg-white
                          rounded-t-3xl md:rounded-none p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-lg font-extrabold text-gray-900">Plus</p>
              <button onClick={() => setPlusOuvert(false)} aria-label="Fermer" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            {NAV_SECONDAIRE.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `h-12 rounded-xl px-3 flex items-center gap-3 text-[15px]
                   ${isActive ? 'bg-brand-50/70 text-brand-500 font-extrabold' : 'text-gray-800 font-semibold hover:bg-gray-50'}`
                }
              >
                <Icon className="w-5 h-5" strokeWidth={1.9} />
                {label}
              </NavLink>
            ))}
            <div className="h-px bg-gray-100 my-2" />
            <button onClick={handleLogout} className="h-12 rounded-xl px-3 flex items-center gap-3 text-[15px] font-semibold text-gray-600 hover:bg-gray-50">
              <LogOut className="w-5 h-5" strokeWidth={1.9} />
              Se déconnecter
            </button>
          </div>
        </div>
      )}

      {/* ── Alarme plein écran nouvelle commande ────────── */}
      <AlarmeNouvelleCommande
        commande={commandeAlarme}
        restantes={nbEnAttente}
        enCours={enCours}
        onAccepter={accepter}
        onRefuser={refuser}
      />
    </div>
  )
}
