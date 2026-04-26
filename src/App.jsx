// Routeur principal React Router v6 — toutes les routes + PrivateRoute par rôle

import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Navbar           from '@/components/layout/Navbar'
import BottomNav        from '@/components/layout/BottomNav'
import Sidebar          from '@/components/layout/Sidebar'
import RestaurantLayout from '@/components/layout/RestaurantLayout'
import LivreurLayout    from '@/components/layout/LivreurLayout'
import InstallBanner    from '@/components/ui/InstallBanner'

// ── Pages Auth ─────────────────────────────────────────────
import Login    from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'

// ── Pages Client ───────────────────────────────────────────
import Home      from '@/pages/client/Home'
import Restaurant from '@/pages/client/Restaurant'
import Cart       from '@/pages/client/Cart'
import Checkout   from '@/pages/client/Checkout'
import Tracking   from '@/pages/client/Tracking'
import Orders     from '@/pages/client/Orders'
import Profile    from '@/pages/client/Profile'

// ── Pages Restaurant ───────────────────────────────────────
import RestaurantDashboard from '@/pages/restaurant/Dashboard'
import RestaurantOrders    from '@/pages/restaurant/Orders'
import RestaurantMenu      from '@/pages/restaurant/Menu'
import RestaurantReviews   from '@/pages/restaurant/Reviews'
import RestaurantProfile   from '@/pages/restaurant/Profile'
import RestaurantPromos    from '@/pages/restaurant/Promotions'
import RestaurantHistory   from '@/pages/restaurant/History'

// ── Pages Livreur ──────────────────────────────────────────
import LivreurDashboard from '@/pages/livreur/Dashboard'
import LivreurAvailable from '@/pages/livreur/Available'
import LivreurHistory   from '@/pages/livreur/History'

// ── Pages Admin ────────────────────────────────────────────
import AdminDashboard    from '@/pages/admin/Dashboard'
import AdminRestaurants  from '@/pages/admin/Restaurants'
import AdminLivreurs     from '@/pages/admin/Livreurs'
import AdminUsers        from '@/pages/admin/Users'
import AdminVersements   from '@/pages/admin/Versements'
import AdminAvis         from '@/pages/admin/Avis'
import AdminCommandes    from '@/pages/admin/Commandes'
import AdminPromos       from '@/pages/admin/Promos'
import AdminHistorique   from '@/pages/admin/Historique'
import AdminSettings     from '@/pages/admin/Settings'

// ── Écran de chargement plein écran ───────────────────────
function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center
                        mx-auto mb-4">
          <span className="text-xl">🍽️</span>
        </div>
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" strokeWidth={1.5} />
      </div>
    </div>
  )
}

// ── Page accès refusé ─────────────────────────────────────
function Unauthorized() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="w-8 h-8 text-red-500" strokeWidth={1.5} />
      </div>
      <h1 className="text-xl font-black text-gray-900 mb-2">Accès refusé</h1>
      <p className="text-sm text-gray-500 mb-6">
        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold
                   hover:bg-brand-600 transition-colors"
      >
        Retour
      </button>
    </div>
  )
}

// ── Garde de route — vérifie session + rôle ───────────────
/**
 * @param {{ role?: string }} props
 *   role — rôle requis. Omis = authentification seule requise.
 */
function PrivateRoute({ role: roleRequis }) {
  const { user, role, loading } = useAuth()

  // Attendre la vérification initiale de session
  if (loading) return <FullScreenLoader />

  // Non authentifié → page de connexion
  if (!user) return <Navigate to="/login" replace />

  // Mauvais rôle → page d'erreur
  if (roleRequis && role !== roleRequis) return <Navigate to="/unauthorized" replace />

  return <Outlet />
}

// ── Layout espace client (Navbar + contenu + BottomNav) ───
function ClientLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar visible uniquement sur desktop — mobile utilise la BottomNav */}
      <div className="hidden md:block">
        <Navbar />
      </div>
      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
      {/* BottomNav visible uniquement sur mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>
      <InstallBanner />
    </div>
  )
}


// ── Layout espace admin (Sidebar desktop uniquement) ──────
function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 md:ml-56">
        <Outlet />
      </main>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// App — arbre de routes complet
// ══════════════════════════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>

        {/* ── Routes publiques (auth) ───────────────────── */}
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ── Espace client ─────────────────────────────── */}
        {/* Pages publiques : accueil, restaurant, panier */}
        <Route element={<ClientLayout />}>
          <Route path="/"               element={<Home />} />
          <Route path="/restaurant/:id" element={<Restaurant />} />
          <Route path="/panier"         element={<Cart />} />

          {/* Pages protégées (authentification requise) */}
          <Route element={<PrivateRoute />}>
            <Route path="/commande"       element={<Checkout />} />
            <Route path="/mes-commandes"  element={<Orders />} />
            <Route path="/suivi/:id"      element={<Tracking />} />
            <Route path="/profil"         element={<Profile />} />
          </Route>
        </Route>

        {/* ── Espace restaurant ─────────────────────────── */}
        <Route element={<PrivateRoute role="restaurant" />}>
          <Route element={<RestaurantLayout />}>
            <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
            <Route path="/restaurant/commandes" element={<RestaurantOrders />} />
            <Route path="/restaurant/menu"      element={<RestaurantMenu />} />
            <Route path="/restaurant/promos"     element={<RestaurantPromos />} />
            <Route path="/restaurant/historique" element={<RestaurantHistory />} />
            <Route path="/restaurant/avis"      element={<RestaurantReviews />} />
            <Route path="/restaurant/profil"    element={<RestaurantProfile />} />
          </Route>
        </Route>

        {/* ── Espace livreur ────────────────────────────── */}
        <Route element={<PrivateRoute role="livreur" />}>
          <Route element={<LivreurLayout />}>
            <Route path="/livreur/dashboard"  element={<LivreurDashboard />} />
            <Route path="/livreur/disponible" element={<LivreurAvailable />} />
            <Route path="/livreur/historique" element={<LivreurHistory />} />
          </Route>
        </Route>

        {/* ── Espace admin ──────────────────────────────── */}
        <Route element={<PrivateRoute role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard"    element={<AdminDashboard />} />
            <Route path="/admin/restaurants"  element={<AdminRestaurants />} />
            <Route path="/admin/livreurs"     element={<AdminLivreurs />} />
            <Route path="/admin/utilisateurs" element={<AdminUsers />} />
            <Route path="/admin/commandes"    element={<AdminCommandes />} />
            <Route path="/admin/promos"       element={<AdminPromos />} />
            <Route path="/admin/historique"   element={<AdminHistorique />} />
            <Route path="/admin/versements"   element={<AdminVersements />} />
            <Route path="/admin/avis"         element={<AdminAvis />} />
            <Route path="/admin/parametres"   element={<AdminSettings />} />
          </Route>
        </Route>

        {/* ── Route inconnue → accueil ──────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}
