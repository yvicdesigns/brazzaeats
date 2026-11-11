import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Capacitor } from '@capacitor/core'
import { Copy, Check, Download, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  lienRestaurant, texteInvitation, partagerLien, copierTexte, lienWhatsApp, lienFacebook,
} from '@/utils/partage'

const VERT = '#085028'

// Affiche prête à imprimer : nom, consigne, QR code, adresse courte
async function dessinerAffiche(restaurant, lien) {
  const L = 1200, H = 1600
  const canvas = document.createElement('canvas')
  canvas.width = L; canvas.height = H
  const ctx = canvas.getContext('2d')
  await document.fonts?.ready

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, L, H)
  ctx.textAlign = 'center'

  ctx.fillStyle = '#111827'
  ctx.font = '800 76px Manrope, sans-serif'
  ctx.fillText(restaurant.nom, L / 2, 210, L - 160)

  ctx.fillStyle = '#4B5563'
  ctx.font = '600 44px Manrope, sans-serif'
  ctx.fillText('Scannez pour commander', L / 2, 300)

  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, lien, { width: 860, margin: 0, errorCorrectionLevel: 'M', color: { dark: VERT, light: '#FFFFFF' } })
  ctx.drawImage(qr, (L - 860) / 2, 380)

  ctx.fillStyle = VERT
  ctx.font = '800 46px Manrope, sans-serif'
  ctx.fillText(lien.replace('https://', ''), L / 2, 1350, L - 120)

  ctx.fillStyle = '#6B7280'
  ctx.font = '600 38px Manrope, sans-serif'
  ctx.fillText('Livraison et retrait avec Zandofood', L / 2, 1440)
  return canvas
}

/** Bloc « QR code et partage » des Réglages du restaurant */
export default function PartageRestaurant({ restaurant }) {
  const canvasRef = useRef(null)
  const [copie, setCopie] = useState(false)
  const lien = lienRestaurant(restaurant)
  const texte = texteInvitation(restaurant)
  const natif = Capacitor.isNativePlatform()

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, lien, {
      width: 220, margin: 1, errorCorrectionLevel: 'M', color: { dark: VERT, light: '#FFFFFF' },
    }).catch(() => {})
  }, [lien])

  async function copier() {
    if (await copierTexte(lien)) {
      setCopie(true)
      toast.success('Lien copié')
      setTimeout(() => setCopie(false), 2000)
    } else {
      toast.error('Impossible de copier — sélectionnez le lien à la main')
    }
  }

  async function partager() {
    const ok = await partagerLien({ titre: restaurant.nom, texte, url: lien })
    if (!ok) copier()
  }

  async function telecharger() {
    try {
      const affiche = await dessinerAffiche(restaurant, lien)
      const a = document.createElement('a')
      a.href = affiche.toDataURL('image/png')
      a.download = `qr-${restaurant.slug ?? 'restaurant'}.png`
      a.click()
    } catch {
      toast.error("Impossible de créer l'image")
    }
  }

  const bouton = 'h-12 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 flex items-center justify-center gap-2 hover:bg-gray-50'

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <h2 className="font-bold text-gray-800">QR code et partage</h2>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Vos clients scannent le QR code ou ouvrent le lien et arrivent directement sur votre restaurant.
      </p>

      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <canvas ref={canvasRef} width={220} height={220} aria-label={`QR code de ${restaurant.nom}`}
                className="w-[220px] h-[220px] rounded-xl border border-gray-100 shrink-0" />

        <div className="flex-1 w-full flex flex-col gap-2.5">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 pl-3 pr-1 h-12">
            <span className="flex-1 text-sm font-semibold text-gray-900 truncate select-all">{lien.replace('https://', '')}</span>
            <button type="button" onClick={copier} aria-label="Copier le lien"
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-600 hover:bg-white">
              {copie ? <Check className="w-4 h-4 text-brand-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button type="button" onClick={partager}
                  className="h-12 rounded-xl bg-gray-900 text-white text-sm font-extrabold flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> Partager le lien
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <a href={lienWhatsApp(texte, lien)} target="_blank" rel="noreferrer" className={bouton}>WhatsApp</a>
            <a href={lienFacebook(lien)} target="_blank" rel="noreferrer" className={bouton}>Facebook</a>
          </div>

          {natif ? (
            <p className="text-xs text-gray-500">
              Pour imprimer l'affiche, ouvrez Réglages sur zandofood.com depuis un ordinateur, ou faites une capture d'écran du QR code.
            </p>
          ) : (
            <button type="button" onClick={telecharger} className={bouton}>
              <Download className="w-4 h-4" /> Télécharger l'affiche à imprimer
            </button>
          )}
          <p className="text-xs text-gray-500">
            Instagram : collez le lien dans votre bio, ou publiez l'affiche en story.
          </p>
        </div>
      </div>
    </div>
  )
}
