// Carte de suivi en direct — Leaflet + OpenStreetMap (pas de clé API).
// A = restaurant, B = adresse de livraison, moto = position réelle du
// livreur, reçue via Realtime et interpolée en douceur entre deux points
// GPS (jamais de saut brusque, jamais "aimantée" sur le tracé indicatif).
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed } from 'lucide-react'

// Badge livreur : illustration fournie, sur fond blanc — le livreur est tout
// habillé en vert, un fond blanc (plutôt que notre vert de marque habituel)
// garde le contraste net à 40px. Badge fixe, pas une vue de dessus qui
// tournerait de façon peu lisible avec le cap.
const MOTO_HTML = `
<div style="width:40px;height:40px;border-radius:50%;background:#fff;
            border:3px solid #0B6E4F;box-shadow:0 4px 10px -3px rgba(0,0,0,.4);
            display:flex;align-items:center;justify-content:center;overflow:hidden;">
  <img src="/icons/livreur-marker.png" alt="Livreur" style="width:34px;height:auto;" />
</div>`

function pinIcon(label, bg) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${bg};
             display:flex;align-items:center;justify-content:center;color:#fff;
             font:700 12px 'Baloo 2',sans-serif;box-shadow:0 4px 10px -3px rgba(0,0,0,.4);
             border:2px solid #fff;">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const motoIcon = L.divIcon({
  className: '',
  html: MOTO_HTML,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

function lerp(a, b, t) { return a + (b - a) * t }

/**
 * @param {{ restaurantPos: {lat,lng}|null, destinationPos: {lat,lng}|null,
 *           livreurPos: {lat,lng}|null, className?: string }} props
 */
export default function LivreurMap({ restaurantPos, destinationPos, livreurPos, className = '' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({ restaurant: null, destination: null, livreur: null })
  const animRef = useRef({ from: null, to: null, start: 0, raf: null })
  const [ready, setReady] = useState(false)

  // Init carte une seule fois
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const center = livreurPos || restaurantPos || destinationPos || { lat: -4.2634, lng: 15.2429 }
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([center.lat, center.lng], 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    setReady(true)
    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Marqueurs A / B
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    if (restaurantPos) {
      if (!markersRef.current.restaurant) {
        markersRef.current.restaurant = L.marker([restaurantPos.lat, restaurantPos.lng], { icon: pinIcon('A', '#10201A') }).addTo(map)
      } else {
        markersRef.current.restaurant.setLatLng([restaurantPos.lat, restaurantPos.lng])
      }
    }
    if (destinationPos) {
      if (!markersRef.current.destination) {
        markersRef.current.destination = L.marker([destinationPos.lat, destinationPos.lng], { icon: pinIcon('🏠', '#0B6E4F') }).addTo(map)
      } else {
        markersRef.current.destination.setLatLng([destinationPos.lat, destinationPos.lng])
      }
    }
  }, [ready, restaurantPos?.lat, restaurantPos?.lng, destinationPos?.lat, destinationPos?.lng])

  // Tracé indicatif A → B (OSRM, best-effort — n'affecte jamais la position réelle du livreur)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !restaurantPos || !destinationPos) return
    let annule = false

    fetch(`https://router.project-osrm.org/route/v1/driving/${restaurantPos.lng},${restaurantPos.lat};${destinationPos.lng},${destinationPos.lat}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(json => {
        if (annule) return
        const coords = json?.routes?.[0]?.geometry?.coordinates
        if (!coords) return
        const latlngs = coords.map(([lng, lat]) => [lat, lng])
        L.polyline(latlngs, { color: '#0B6E4F', weight: 5, opacity: .85, lineCap: 'round' }).addTo(map)
        map.fitBounds(latlngs, { padding: [40, 40] })
      })
      .catch(() => {
        // Pas grave — la carte reste utilisable sans le tracé indicatif.
        L.polyline(
          [[restaurantPos.lat, restaurantPos.lng], [destinationPos.lat, destinationPos.lng]],
          { color: '#0B6E4F', weight: 4, opacity: .6, dashArray: '2 10' }
        ).addTo(map)
      })

    return () => { annule = true }
  }, [ready, restaurantPos?.lat, restaurantPos?.lng, destinationPos?.lat, destinationPos?.lng])

  // Position en direct du livreur — interpolation douce entre deux points GPS
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !livreurPos) return

    if (!markersRef.current.livreur) {
      markersRef.current.livreur = L.marker([livreurPos.lat, livreurPos.lng], { icon: motoIcon, zIndexOffset: 1000 }).addTo(map)
      recenter()
      return
    }

    const marker = markersRef.current.livreur
    const from = marker.getLatLng()
    const to = L.latLng(livreurPos.lat, livreurPos.lng)
    if (from.equals(to)) return

    cancelAnimationFrame(animRef.current.raf)
    animRef.current = { from, to, start: performance.now(), raf: null }

    const DURATION = 2600
    function step(ts) {
      const t = Math.min(1, (ts - animRef.current.start) / DURATION)
      const eased = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      marker.setLatLng([
        lerp(animRef.current.from.lat, animRef.current.to.lat, eased),
        lerp(animRef.current.from.lng, animRef.current.to.lng, eased),
      ])
      if (t < 1) animRef.current.raf = requestAnimationFrame(step)
    }
    animRef.current.raf = requestAnimationFrame(step)
    recenter()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, livreurPos?.lat, livreurPos?.lng])

  function recenter() {
    const map = mapRef.current
    const l = markersRef.current.livreur?.getLatLng()
    const d = destinationPos
    if (!map) return
    if (l && d) {
      map.flyToBounds([[l.lat, l.lng], [d.lat, d.lng]], { padding: [60, 60], maxZoom: 16, duration: 1.1 })
    } else if (l) {
      map.flyTo(l, 15, { duration: 1.1 })
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <button
        onClick={recenter}
        className="absolute bottom-3 right-3 z-[400] w-9 h-9 rounded-full bg-white shadow-card
                   flex items-center justify-center text-brand-600"
        aria-label="Recentrer la carte"
      >
        <LocateFixed className="w-4 h-4" />
      </button>
    </div>
  )
}
