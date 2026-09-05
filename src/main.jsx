import { createRoot } from 'react-dom/client'
import toast, { Toaster } from 'react-hot-toast'
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

// ── Mise à jour PWA — propose la mise à jour, ne recharge jamais seul ──
// vite-plugin-pwa revérifie une nouvelle version à chaque fois que l'onglet
// redevient visible. En période de déploiements fréquents, un rechargement
// automatique à ce moment-là (updateSW(true) direct) interrompait l'utilisateur
// sans prévenir dès qu'il revenait sur l'onglet — perçu comme "ça recharge
// tout seul en boucle". On affiche maintenant un toast persistant et c'est
// l'utilisateur qui déclenche la mise à jour, quand il le souhaite.
const updateSW = registerSW({
  onNeedRefresh() {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-xl">🚀</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">Nouvelle version disponible</p>
          <p className="text-xs text-gray-500">Mettez à jour quand vous êtes prêt.</p>
        </div>
        <button
          onClick={() => { toast.dismiss(t.id); updateSW(true) }}
          className="shrink-0 bg-brand-500 text-white text-xs font-bold px-3 py-1.5
                     rounded-lg hover:bg-brand-600 transition-colors"
        >
          Mettre à jour
        </button>
      </div>
    ), { duration: Infinity, style: { maxWidth: '380px' } })
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
