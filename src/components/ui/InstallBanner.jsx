// Bannière installation — PWA (Chrome/Edge) + APK Android direct

import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

const APK_URL = '/app.apk'

function isAndroid() {
  return /android/i.test(navigator.userAgent)
}

export default function InstallBanner() {
  const [prompt,      setPrompt]      = useState(null)
  const [visible,     setVisible]     = useState(false)
  const [modeAndroid, setModeAndroid] = useState(false)

  useEffect(() => {
    // Déjà installée en mode standalone → ne rien afficher
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Android sans prompt PWA → proposer l'APK directement
    if (isAndroid()) {
      setModeAndroid(true)
      setVisible(true)
      return
    }

    // Autres plateformes : attendre beforeinstallprompt (Chrome/Edge)
    function handleBeforeInstall(e) {
      e.preventDefault()
      setPrompt(e)
      setVisible(true)
    }
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

  async function handleInstallPWA() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    setVisible(false)
    setPrompt(null)
  }

  function handleDismiss() {
    setVisible(false)
  }

  if (!visible) return null

  // ── Mode Android : téléchargement APK ─────────────────────
  if (modeAndroid) {
    return (
      <div
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50
                   w-[calc(100%-2rem)] max-w-sm
                   bg-white border border-gray-200 rounded-2xl shadow-xl
                   px-4 py-3
                   animate-in fade-in slide-in-from-bottom-4 duration-300"
        role="banner"
        aria-label="Télécharger Zandofood"
      >
        <div className="flex items-center gap-3">
          {/* Icône */}
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl">🍽️</span>
          </div>

          {/* Texte */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">
              Télécharger l'app
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Version Android disponible
            </p>
          </div>

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

        {/* Bouton téléchargement pleine largeur */}
        <a
          href={APK_URL}
          download="Zandofood.apk"
          onClick={handleDismiss}
          className="mt-3 w-full flex items-center justify-center gap-2
                     bg-brand-500 text-white text-sm font-bold px-4 py-3
                     rounded-xl hover:bg-brand-600 transition-colors min-h-[48px]"
        >
          <Smartphone className="w-4 h-4" />
          Télécharger Zandofood (.apk)
        </a>

        <p className="text-[10px] text-gray-400 text-center mt-2">
          Autorisez l'installation depuis sources inconnues si demandé
        </p>
      </div>
    )
  }

  // ── Mode PWA (Chrome/Edge desktop ou iOS) ──────────────────
  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50
                 w-[calc(100%-2rem)] max-w-sm
                 bg-white border border-gray-200 rounded-2xl shadow-xl
                 flex items-center gap-3 px-4 py-3
                 animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="banner"
      aria-label="Installer Zandofood"
    >
      <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
        <span className="text-xl">🍽️</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-tight">
          📲 Installer Zandofood
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Accès rapide depuis votre téléphone
        </p>
      </div>

      <button
        onClick={handleInstallPWA}
        className="shrink-0 flex items-center gap-1.5 bg-brand-500 text-white
                   text-xs font-bold px-3 py-2 rounded-xl hover:bg-brand-600
                   transition-colors min-h-[36px]"
      >
        <Download className="w-3.5 h-3.5" />
        Installer
      </button>

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
