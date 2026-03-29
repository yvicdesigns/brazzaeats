// Bannière PWA — détecte beforeinstallprompt et propose l'installation

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

export default function InstallBanner() {
  const [prompt,  setPrompt]  = useState(null)  // événement beforeinstallprompt
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // beforeinstallprompt se déclenche quand Chrome/Edge juge l'app installable
    function handleBeforeInstall(e) {
      e.preventDefault()        // empêche la mini-infobar automatique du navigateur
      setPrompt(e)              // sauvegarde l'événement pour le déclencher plus tard
      setVisible(true)
    }

    // appinstalled : masquer la bannière si l'utilisateur vient d'installer
    function handleInstalled() {
      setVisible(false)
      setPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled',        handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled',        handleInstalled)
    }
  }, [])

  // Masquer si déjà en mode standalone (PWA déjà installée)
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setVisible(false)
    }
  }, [])

  // ── Installer ────────────────────────────────────────────
  async function handleInstall() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    // Peu importe le choix, on ferme la bannière
    setVisible(false)
    setPrompt(null)
    if (outcome === 'accepted') {
      // Optionnel : envoyer un événement analytics
    }
  }

  // ── Fermer pour la session ────────────────────────────────
  function handleDismiss() {
    setVisible(false)
    // Ne pas setPrompt(null) — permet de réessayer si l'utilisateur revient
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50
                 w-[calc(100%-2rem)] max-w-sm
                 bg-white border border-gray-200 rounded-2xl shadow-xl
                 flex items-center gap-3 px-4 py-3
                 animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="banner"
      aria-label="Installer BrazzaEats"
    >
      {/* Icône */}
      <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
        <span className="text-xl">🍽️</span>
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-tight">
          📲 Installer BrazzaEats
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Accès rapide depuis votre téléphone
        </p>
      </div>

      {/* Bouton installer */}
      <button
        onClick={handleInstall}
        className="shrink-0 flex items-center gap-1.5 bg-brand-500 text-white
                   text-xs font-bold px-3 py-2 rounded-xl hover:bg-brand-600
                   transition-colors min-h-[36px]"
      >
        <Download className="w-3.5 h-3.5" />
        Installer
      </button>

      {/* Bouton fermer */}
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1.5 rounded-xl hover:bg-gray-100 transition-colors
                   text-gray-400 hover:text-gray-600"
        aria-label="Plus tard"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
