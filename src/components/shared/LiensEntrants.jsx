import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

// Un lien zandofood.com (QR code, partage) ouvert sur le téléphone lance l'app :
// on affiche la page correspondante au lieu de l'accueil.
export default function LiensEntrants() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const ecoute = App.addListener('appUrlOpen', ({ url }) => {
      try {
        const { hostname, pathname, search } = new URL(url)
        if (!/(^|\.)zandofood\.com$/.test(hostname)) return
        if (/^\/(r|restaurant)\//.test(pathname)) navigate(pathname + search)
      } catch { /* lien illisible : on reste où on est */ }
    })
    return () => { ecoute.then(l => l.remove()) }
  }, [navigate])

  return null
}
