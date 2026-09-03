import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import App from './App'
import { supabase } from '@/supabase/client'
import './index.css'

// ── Cycle de vie natif — reconnexion au réveil de l'app ────────────
// iOS/Android suspendent le WebView (donc les WebSockets Realtime et le
// timer d'auto-refresh du token) quand l'écran se verrouille ou que l'app
// passe en arrière-plan. Sans ceci, l'app revient bloquée (spinner infini)
// ou avec un suivi de commande qui ne se met plus à jour en temps réel.
// Pattern recommandé par Supabase pour les apps Capacitor/React Native.
//
// Uniquement en natif : sur le web, @capacitor/app émule ces événements
// via document.visibilitychange (changement d'onglet), un cas bien plus
// fréquent et anodin qu'une vraie mise en veille OS — y couper l'auto-refresh
// du token a déjà causé des déconnexions "accès refusé" après un simple
// changement d'onglet resté ouvert un moment.
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      supabase.auth.startAutoRefresh()
      supabase.realtime.disconnect()
      supabase.realtime.connect()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}

// ── Mise à jour PWA — recharge auto quand nouvelle version dispo ──
// registerType: 'prompt' laisse le nouveau service worker en attente tant
// qu'on ne l'active pas explicitement. Recharger sans appeler updateSW()
// ne fait JAMAIS passer la main au nouveau SW : l'ancien reste actif, la
// vérification détecte à nouveau une mise à jour en attente, et on obtient
// une boucle de rechargement infinie (observé sur le site déployé).
const updateSW = registerSW({
  onNeedRefresh() {
    // Active le nouveau SW puis recharge une seule fois.
    updateSW(true)
  },
  onOfflineReady() {},
})

// ── Montage de l'application ───────────────────────────────
const racine = document.getElementById('root')

createRoot(racine).render(
  <>
    {/* Notifications toast globales */}
    <Toaster
      position="top-center"
      toastOptions={{
        // Durée par défaut : 3 secondes
        duration: 3000,
        style: {
          borderRadius: '12px',
          fontSize:     '14px',
          fontWeight:   '500',
          maxWidth:     '360px',
          padding:      '12px 16px',
        },
        success: {
          iconTheme: { primary: '#22c55e', secondary: '#fff' },
        },
        error: {
          duration: 4000,
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
        },
      }}
    />
    <App />
  </>
)
