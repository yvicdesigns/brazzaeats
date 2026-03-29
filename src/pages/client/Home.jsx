import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, WifiOff, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import RestaurantCard from '@/components/shared/RestaurantCard'
import { getRestaurants } from '@/services/restaurantService'
import { contacterSupport } from '@/utils/whatsappMessage'

const LIMIT = 20

// ── Squelette de chargement pour une carte restaurant ──────
function CarteSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-200 rounded-lg w-1/2" />
        <div className="flex justify-between mt-3 gap-4">
          <div className="h-3 bg-gray-200 rounded-lg flex-1" />
          <div className="h-3 bg-gray-200 rounded-lg flex-1" />
          <div className="h-3 bg-gray-200 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [restaurants,   setRestaurants]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [loadingPlus,   setLoadingPlus]   = useState(false)
  const [hasMore,       setHasMore]       = useState(false)
  const [pageActuelle,  setPageActuelle]  = useState(0)
  const [isOffline,     setIsOffline]     = useState(!navigator.onLine)

  // Filtres
  const [search,           setSearch]           = useState('')
  const [noteMin,          setNoteMin]          = useState(0)
  const [ouvertMaintenant, setOuvertMaintenant] = useState(false)

  // Ref pour éviter les requêtes en double lors du montage
  const initialCharge = useRef(false)

  // ── Surveillance de la connectivité réseau ─────────────
  useEffect(() => {
    const goOnline  = () => { setIsOffline(false); toast.success('Connexion rétablie') }
    const goOffline = () => { setIsOffline(true);  toast.error('Connexion perdue') }
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // ── Chargement initial (reset = true) ──────────────────
  const charger = useCallback(async (reset = false) => {
    const page = reset ? 0 : pageActuelle

    if (reset) {
      setLoading(true)
      setPageActuelle(0)
    } else {
      setLoadingPlus(true)
    }

    const { data, hasMore: more, error } = await getRestaurants({
      page,
      limit: LIMIT,
      noteMin,
      ouvertMaintenant,
      search,
    })

    if (error) {
      toast.error('Impossible de charger les restaurants')
    } else {
      setRestaurants(prev => reset ? data : [...prev, ...data])
      setHasMore(more)
      if (!reset) setPageActuelle(p => p + 1)
    }

    setLoading(false)
    setLoadingPlus(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteMin, ouvertMaintenant, search])

  // Rechargement avec debounce à chaque changement de filtre
  useEffect(() => {
    if (!initialCharge.current) {
      initialCharge.current = true
      charger(true)
      return
    }
    const timer = setTimeout(() => charger(true), 350)
    return () => clearTimeout(timer)
  }, [charger])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Bannière hors-ligne ─────────────────────────── */}
      {isOffline && (
        <div className="bg-red-500 text-white text-xs font-medium py-2 px-4
                        flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          Pas de connexion — les données peuvent être obsolètes
        </div>
      )}

      {/* ── En-tête avec barre de recherche ────────────── */}
      <header className="bg-brand-500 px-4 pt-12 pb-5">
        <p className="text-brand-100 text-xs mb-0.5">Livraison à</p>
        <h1 className="text-white text-xl font-bold mb-4">Brazzaville 🇨🇬</h1>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Rechercher un restaurant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </header>

      {/* ── Filtres ─────────────────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
        {/* Filtre note minimale */}
        {[
          { valeur: 0,   label: 'Tous' },
          { valeur: 4,   label: '★ 4+' },
          { valeur: 4.5, label: '★ 4,5+' },
        ].map(({ valeur, label }) => (
          <button
            key={valeur}
            onClick={() => setNoteMin(valeur)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
              ${noteMin === valeur
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
              }`}
          >
            {label}
          </button>
        ))}

        {/* Filtre "ouvert maintenant" */}
        <button
          onClick={() => setOuvertMaintenant(v => !v)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
            flex items-center gap-1.5
            ${ouvertMaintenant
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
            }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${ouvertMaintenant ? 'bg-white' : 'bg-green-400'}`} />
          Ouvert maintenant
        </button>
      </div>

      {/* ── Liste restaurants ───────────────────────────── */}
      <main className="px-4 pb-4">
        {!loading && (
          <p className="text-xs text-gray-400 mb-3">
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <CarteSkeleton key={i} />)
            : restaurants.length === 0
              ? (
                  <div className="text-center py-16 text-gray-400">
                    <p className="text-5xl mb-4">🍽️</p>
                    <p className="font-semibold text-gray-600">Aucun restaurant trouvé</p>
                    <p className="text-sm mt-1">Essayez de modifier vos filtres</p>
                  </div>
                )
              : restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)
          }
        </div>

        {/* Bouton "Charger plus" */}
        {!loading && hasMore && (
          <button
            onClick={() => charger(false)}
            disabled={loadingPlus}
            className="w-full mt-5 py-3.5 bg-white text-brand-500 font-semibold rounded-xl
                       border border-brand-200 hover:bg-brand-50 disabled:opacity-50 transition-colors"
          >
            {loadingPlus ? 'Chargement…' : 'Charger plus'}
          </button>
        )}
      </main>

      {/* ── Bouton WhatsApp flottant ────────────────────── */}
      <button
        onClick={() => contacterSupport()}
        className="fixed bottom-20 right-4 w-14 h-14 bg-green-500 text-white rounded-full
                   flex items-center justify-center shadow-lg hover:bg-green-600
                   active:scale-95 transition-all z-30"
        aria-label="Contacter le support BrazzaEats via WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

    </div>
  )
}
