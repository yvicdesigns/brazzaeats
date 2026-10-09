/**
 * CropModal — recadrage circulaire d'une photo de profil avant upload.
 * Utilisé par les profils client, restaurant (logo) et livreur.
 *
 * Props :
 *   imageUrl — URL locale (createObjectURL) de l'image source
 *   onSave   — (blob: Blob) => void — appelé avec le JPEG recadré
 *   onClose  — callback annulation
 *   saving   — désactive le bouton pendant l'upload
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Loader2 } from 'lucide-react'

const CROP_SIZE = 260

export default function CropModal({ imageUrl, onSave, onClose, saving }) {
  const canvasRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos = useRef(null)
  const imgEl = useRef(null)

  const draw = useCallback((img, off, sc) => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE)

    const s = sc * Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight)
    const w = img.naturalWidth * s
    const h = img.naturalHeight * s
    const x = (CROP_SIZE - w) / 2 + off.x
    const y = (CROP_SIZE - h) / 2 + off.y
    ctx.drawImage(img, x, y, w, h)

    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2 - 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2 - 6, 0, Math.PI * 2)
    ctx.stroke()
  }, [])

  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgEl.current = img; draw(img, { x: 0, y: 0 }, 1) }
    img.src = imageUrl
  }, [imageUrl, draw])

  useEffect(() => {
    if (imgEl.current) draw(imgEl.current, offset, scale)
  }, [offset, scale, draw])

  const getEventPos = e => e.touches
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
    : { x: e.clientX, y: e.clientY }

  const onPointerDown = e => { dragging.current = true; lastPos.current = getEventPos(e) }
  const onPointerMove = e => {
    if (!dragging.current || !lastPos.current) return
    const pos = getEventPos(e)
    setOffset(prev => ({ x: prev.x + pos.x - lastPos.current.x, y: prev.y + pos.y - lastPos.current.y }))
    lastPos.current = pos
  }
  const onPointerUp = () => { dragging.current = false }

  function handleSave() {
    const out = document.createElement('canvas')
    out.width = CROP_SIZE; out.height = CROP_SIZE
    const ctx = out.getContext('2d')
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const img = imgEl.current
    if (!img) return
    const s = scale * Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight)
    const w = img.naturalWidth * s; const h = img.naturalHeight * s
    const x = (CROP_SIZE - w) / 2 + offset.x; const y = (CROP_SIZE - h) / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)
    out.toBlob(blob => onSave(blob), 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-4
                    max-h-[92dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <h3 className="font-bold text-gray-900 text-center mb-1">Recadrer la photo</h3>
        <p className="text-xs text-center text-gray-400 mb-5">Glissez · Zoomez avec le curseur</p>

        <div className="flex justify-center mb-5">
          <canvas
            ref={canvasRef}
            width={CROP_SIZE} height={CROP_SIZE}
            className="cursor-grab active:cursor-grabbing touch-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE, borderRadius: '50%', overflow: 'hidden' }}
            onMouseDown={onPointerDown} onMouseMove={onPointerMove}
            onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
          />
        </div>

        <div className="px-2 mb-5">
          <input
            type="range" min={0.5} max={3} step={0.05}
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>−</span><span>Zoom</span><span>+</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm
                       active:scale-[0.97] transition-transform"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm
                       disabled:opacity-60 flex items-center justify-center gap-2
                       active:scale-[0.97] transition-transform"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
