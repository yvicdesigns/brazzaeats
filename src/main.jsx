import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

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
