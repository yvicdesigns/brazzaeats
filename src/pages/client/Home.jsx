import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, WifiOff, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import RestaurantCard from '@/components/shared/RestaurantCard'
import { getRestaurants, isRestaurantOpen } from '@/services/restaurantService'
import { contacterSupport } from '@/utils/whatsappMessage'
import { useVille } from '@/hooks/useVille'
import SelectVille from './SelectVille'
import { VILLES_CONGO } from '@/utils/constants'

// ── Squelette de chargement ────────────────────────────────
function CarteSkeleton({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-card animate-pulse shrink-0 ${className}`}>
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

// ── Section thématique avec défilement horizontal ──────────
function SectionRow({ titre, emoji, restaurants, loading, nbSkeletons = 4 }) {
  const scrollRef = useRef(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  const checkArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkArrows()
    el.addEventListener('scroll', checkArrows, { passive: true })
    window.addEventListener('resize', checkArrows)
    return () => {
      el.removeEventListener('scroll', checkArrows)
      window.removeEventListener('resize', checkArrows)
    }
  }, [restaurants])

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  if (!loading && restaurants.length === 0) return null

  return (
    <section className="mb-8">
      {/* En-tête de section */}
      <div className="flex items-center justify-between px-4 md:px-6 mb-3">
        <h2 className="font-bold text-gray-900 text-lg md:text-xl flex items-center gap-2">
          {emoji && <span>{emoji}</span>}
          {titre}
        </h2>
      </div>

      {/* Conteneur défilant */}
      <div className="relative group/row">
        {/* Flèche gauche (desktop) */}
        <button
          onClick={() => scroll(-1)}
          aria-label="Précédent"
          className={`hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10
                      w-10 h-10 bg-white shadow-lg rounded-full items-center justify-center
                      border border-gray-100 hover:bg-gray-50 transition-all
                      ${canLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>

        {/* Ligne de cartes */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-none px-4 md:px-6
                     snap-x snap-mandatory"
        >
          {loading
            ? Array.from({ length: nbSkeletons }).map((_, i) => (
                <CarteSkeleton key={i} className="w-[72vw] max-w-[300px] md:w-72 snap-start" />
              ))
            : restaurants.map(r => (
                <div key={r.id} className="shrink-0 w-[72vw] max-w-[300px] md:w-72 snap-start">
                  <RestaurantCard restaurant={r} />
                </div>
              ))
          }
        </div>

        {/* Flèche droite (desktop) */}
        <button
          onClick={() => scroll(1)}
          aria-label="Suivant"
          className={`hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10
                      w-10 h-10 bg-white shadow-lg rounded-full items-center justify-center
                      border border-gray-100 hover:bg-gray-50 transition-all
                      ${canRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </section>
  )
}

// ── Grille "Tous les restaurants" ──────────────────────────
function GrilleTous({ restaurants, loading }) {
  return (
    <section className="px-4 md:px-6 mb-8">
      <h2 className="font-bold text-gray-900 text-lg md:text-xl mb-3 flex items-center gap-2">
        <span>🗺️</span> Tous les restaurants
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <CarteSkeleton key={i} />)
          : restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)
        }
      </div>
    </section>
  )
}

// ── Grille résultats de recherche ──────────────────────────
function GrilleRecherche({ restaurants, loading, search }) {
  return (
    <main className="px-4 md:px-6 pb-4">
      {!loading && (
        <p className="text-xs text-gray-400 mb-3">
          {restaurants.length} résultat{restaurants.length !== 1 ? 's' : ''} pour « {search} »
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CarteSkeleton key={i} />)
          : restaurants.length === 0
            ? (
                <div className="col-span-full text-center py-16 text-gray-400">
                  <p className="text-5xl mb-4">🍽️</p>
                  <p className="font-semibold text-gray-600">Aucun restaurant trouvé</p>
                  <p className="text-sm mt-1">Essayez de modifier vos filtres</p>
                </div>
              )
            : restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)
        }
      </div>
    </main>
  )
}

// ── Ville sans restaurants ─────────────────────────────────
function VilleVide({ ville, onChangerVille }) {
  const emoji = VILLES_CONGO.find(v => v.nom === ville)?.emoji ?? '📍'
  const { contacterSupport: wa } = { contacterSupport: () => contacterSupport() }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-5">
        <span className="text-4xl">{emoji}</span>
      </div>

      <h2 className="text-xl font-black text-gray-900 mb-2">
        Bientôt à {ville} !
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">
        Nous n'avons pas encore de restaurants partenaires dans votre ville.
        Vous pouvez inviter vos restaurants préférés à rejoindre Zandofood !
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => contacterSupport(`Bonjour, je voudrais suggérer un restaurant à ${ville} pour Zandofood.`)}
          className="w-full bg-brand-500 text-white font-bold py-3.5 rounded-2xl
                     hover:bg-brand-600 active:scale-95 transition-all text-sm"
        >
          📲 Suggérer un restaurant
        </button>

        <button
          onClick={onChangerVille}
          className="w-full bg-gray-100 text-gray-700 font-semibold py-3.5 rounded-2xl
                     hover:bg-gray-200 active:scale-95 transition-all text-sm"
        >
          Choisir une autre ville
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-8 leading-relaxed max-w-xs">
        Vous êtes restaurateur à {ville} ? Contactez-nous pour rejoindre la plateforme et toucher plus de clients.
      </p>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────
export default function Home() {
  const { ville, setVille, effacerVille } = useVille()
  const [tous,        setTous]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [isOffline,   setIsOffline]   = useState(!navigator.onLine)

  // Filtres
  const [search,           setSearch]           = useState('')
  const [noteMin,          setNoteMin]          = useState(0)
  const [ouvertMaintenant, setOuvertMaintenant] = useState(false)

  const modeRecherche = search.trim() !== '' || noteMin > 0 || ouvertMaintenant

  // ── Surveillance réseau ───────────────────────────────────
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

  // ── Chargement initial (restaurants de la ville sélectionnée) ──
  useEffect(() => {
    if (!ville) return
    let cancelled = false
    const charger = async () => {
      setLoading(true)
      const { data, error } = await getRestaurants({ page: 0, limit: 100, ville })
      if (cancelled) return
      if (error) toast.error('Impossible de charger les restaurants')
      else setTous(data ?? [])
      setLoading(false)
    }
    charger()
    return () => { cancelled = true }
  }, [ville])

  // Écran sélection ville — affiché après tous les hooks
  if (!ville) return <SelectVille onSelect={setVille} />

  // ── Sections thématiques (calculées côté client) ──────────
  const sections = useMemo(() => {
    if (!tous.length) return {}

    // Populaires : note >= 4.5, triés par note desc
    const populaires = [...tous]
      .filter(r => (r.note_moyenne ?? 0) >= 4.5)
      .sort((a, b) => (b.note_moyenne ?? 0) - (a.note_moyenne ?? 0))
      .slice(0, 10)

    // Ouverts maintenant
    const ouverts = tous.filter(r => isRestaurantOpen(r.horaires)).slice(0, 10)

    // Nouveaux : triés par created_at desc
    const nouveaux = [...tous]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)

    // Mieux notés : note >= 4, triés desc (excluant déjà dans populaires)
    const mieuxNotes = [...tous]
      .filter(r => (r.note_moyenne ?? 0) >= 4 && (r.note_moyenne ?? 0) < 4.5)
      .sort((a, b) => (b.note_moyenne ?? 0) - (a.note_moyenne ?? 0))
      .slice(0, 10)

    return { populaires, ouverts, nouveaux, mieuxNotes }
  }, [tous])

  // ── Résultats de recherche (filtres actifs) ───────────────
  const resultatsRecherche = useMemo(() => {
    if (!modeRecherche) return []
    return tous.filter(r => {
      const matchSearch = !search.trim() || r.nom.toLowerCase().includes(search.trim().toLowerCase())
      const matchNote   = noteMin === 0 || (r.note_moyenne ?? 0) >= noteMin
      const matchOuvert = !ouvertMaintenant || isRestaurantOpen(r.horaires)
      return matchSearch && matchNote && matchOuvert
    })
  }, [tous, search, noteMin, ouvertMaintenant, modeRecherche])

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Bannière hors-ligne ─────────────────────────── */}
      {isOffline && (
        <div className="bg-red-500 text-white text-xs font-medium py-2 px-4
                        flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          Pas de connexion — les données peuvent être obsolètes
        </div>
      )}

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-brand-500 px-4 md:px-6 pt-12 pb-6 md:pt-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-brand-100 text-xs mb-0.5">Livraison à</p>
          <h1 className="text-white text-xl font-bold mb-4">{ville} 🇨🇬</h1>

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
        </div>
      </header>

      {/* ── Filtres ─────────────────────────────────────── */}
      <div className="flex gap-2 px-4 md:px-6 py-3 overflow-x-auto scrollbar-none max-w-4xl mx-auto">
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

      {/* ── Contenu principal ───────────────────────────── */}
      {modeRecherche ? (
        // Mode recherche : grille plate
        <GrilleRecherche
          restaurants={resultatsRecherche}
          loading={loading}
          search={search || `note ≥ ${noteMin}`}
        />
      ) : (
        // Mode sections thématiques
        <div className="mt-2">
          {/* Populaires */}
          <SectionRow
            titre="Les plus populaires"
            emoji="🔥"
            restaurants={sections.populaires ?? []}
            loading={loading}
          />

          {/* Ouverts maintenant */}
          <SectionRow
            titre="Ouverts maintenant"
            emoji="🟢"
            restaurants={sections.ouverts ?? []}
            loading={loading}
          />

          {/* Nouveaux */}
          <SectionRow
            titre="Nouveaux restaurants"
            emoji="✨"
            restaurants={sections.nouveaux ?? []}
            loading={loading}
          />

          {/* Mieux notés */}
          <SectionRow
            titre="Bien notés"
            emoji="⭐"
            restaurants={sections.mieuxNotes ?? []}
            loading={loading}
          />

          {/* Ville sans restaurants */}
          {!loading && tous.length === 0 && (
            <VilleVide ville={ville} onChangerVille={effacerVille} />
          )}

          {/* Séparateur */}
          {!loading && tous.length > 0 && (
            <div className="px-4 md:px-6 mb-4 max-w-screen-xl mx-auto">
              <div className="border-t border-gray-200" />
            </div>
          )}

          {/* Tous */}
          {tous.length > 0 && <GrilleTous restaurants={tous} loading={loading} />}
        </div>
      )}

      {/* ── Bouton WhatsApp flottant ────────────────────── */}
      <button
        onClick={() => contacterSupport()}
        className="fixed bottom-20 right-4 w-14 h-14 bg-green-500 text-white rounded-full
                   flex items-center justify-center shadow-lg hover:bg-green-600
                   active:scale-95 transition-all z-30"
        aria-label="Contacter le support Zandofood via WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

    </div>
  )
}
