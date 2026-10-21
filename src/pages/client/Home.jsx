import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search, WifiOff, MessageCircle,
  UtensilsCrossed, Drumstick, Sandwich, Flame, Salad, MapPin,
} from 'lucide-react'
import toast from 'react-hot-toast'
import RestaurantCard from '@/components/shared/RestaurantCard'
import { getRestaurants, isRestaurantOpen } from '@/services/restaurantService'
import { contacterSupport } from '@/utils/whatsappMessage'
import { useVille } from '@/hooks/useVille'
import SelectVille from './SelectVille'
import { VILLES_CONGO } from '@/utils/constants'

const JOURS_NOUVEAU = 14

// ── Catégories mises en avant sur l'accueil ────────────────
// `valeur: null` = « Tous », sinon doit correspondre à restaurants.categorie
const CATEGORIES = [
  { valeur: null,                 label: 'Tous',              Icone: UtensilsCrossed, couleur: '#085028' }, // vert du logo
  { valeur: 'Cuisine africaine',  label: 'Cuisine africaine', Icone: Drumstick,       couleur: '#C34F23' }, // terracotta du logo
  { valeur: 'Fast Food',          label: 'Fast Food',         Icone: Sandwich,        couleur: '#D79F05' }, // jaune du logo (foncé)
  { valeur: 'Grillades',          label: 'Grillades',         Icone: Flame,           couleur: '#6D2C14' }, // terracotta foncé
  { valeur: 'Salades',            label: 'Salades',           Icone: Salad,           couleur: '#11AC56' }, // vert du logo (clair)
]

const SEGMENTS = [
  { valeur: 'tous',    label: 'Tous' },
  { valeur: 'ouvert',  label: 'Ouvert' },
  { valeur: 'nouveau', label: 'Nouveau' },
]

function estRecent(dateIso) {
  if (!dateIso) return false
  return (Date.now() - new Date(dateIso).getTime()) / 86_400_000 <= JOURS_NOUVEAU
}

// ── Bandeau d'info (remplace la bannière promo statique) ───
function BandeauInfo({ nbOuverts }) {
  const texte = nbOuverts > 0
    ? `${nbOuverts} restaurant${nbOuverts > 1 ? 's' : ''} ouvert${nbOuverts > 1 ? 's' : ''} près de chez vous`
    : 'Restaurants près de chez vous'

  return (
    <div className="mx-4 md:mx-6 mt-4 max-w-4xl md:mx-auto bg-brand-700 rounded-2xl px-4 py-3
                     flex items-center gap-2.5">
      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="text-white text-[13px] font-semibold">{texte}</span>
    </div>
  )
}

// ── Pastilles de catégories ─────────────────────────────────
function CategoriesPills({ actif, onChange }) {
  return (
    <div className="flex gap-2 px-4 md:px-6 overflow-x-auto scrollbar-hide max-w-4xl mx-auto">
      {CATEGORIES.map(({ valeur, label, Icone, couleur }) => {
        const estActif = actif === valeur
        return (
          <button
            key={label}
            onClick={() => onChange(valeur)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border
                        font-['Manrope'] font-bold text-xs whitespace-nowrap transition-colors
              ${estActif ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
          >
            <Icone className="w-3.5 h-3.5" style={{ color: estActif ? '#FFFFFF' : couleur }} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Segment Tous / Ouvert / Nouveau ─────────────────────────
function Segments({ actif, onChange }) {
  return (
    <div className="flex gap-1.5 px-4 md:px-6 max-w-4xl mx-auto">
      {SEGMENTS.map(({ valeur, label }) => (
        <button
          key={valeur}
          onClick={() => onChange(valeur)}
          className={`px-3 py-1.5 rounded-full font-['Manrope'] font-bold text-[11px] border transition-colors
            ${actif === valeur
              ? 'bg-brand-600 border-brand-600 text-white'
              : 'bg-white border-gray-200 text-gray-700'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

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

// ── Grille unique de restaurants ────────────────────────────
function GrilleRestaurants({ restaurants, loading }) {
  return (
    <section className="px-4 md:px-6 mb-8">
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
  const [search,          setSearch]          = useState('')
  const [categorieActive, setCategorieActive] = useState(null)
  const [segment,         setSegment]         = useState('tous')

  const modeRecherche = search.trim() !== ''

  // Restaurants de la catégorie sélectionnée (null = toutes)
  const tousFiltres = useMemo(
    () => (categorieActive ? tous.filter(r => r.categorie === categorieActive) : tous),
    [tous, categorieActive]
  )

  const nbOuverts = useMemo(
    () => tousFiltres.filter(r => isRestaurantOpen(r.horaires)).length,
    [tousFiltres]
  )

  // Restaurants affichés dans la grille (catégorie + segment Tous/Ouvert/Nouveau)
  const tousAffiches = useMemo(() => {
    if (segment === 'ouvert')  return tousFiltres.filter(r => isRestaurantOpen(r.horaires))
    if (segment === 'nouveau') return tousFiltres.filter(r => estRecent(r.created_at))
    return tousFiltres
  }, [tousFiltres, segment])

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

  // ── Résultats de recherche (texte uniquement) ──────────────
  const resultatsRecherche = useMemo(() => {
    if (!modeRecherche) return []
    const q = search.trim().toLowerCase()
    return tousFiltres.filter(r => r.nom.toLowerCase().includes(q))
  }, [tousFiltres, search, modeRecherche])

  // Écran sélection ville — après TOUS les hooks (règle React)
  if (!ville) return <SelectVille onSelect={setVille} />

  return (
    <div className="min-h-screen bg-[#F7F5EF] pb-24">

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
          <h1 className="font-['Unbounded'] text-white text-xl font-extrabold mb-4">{ville} 🇨🇬</h1>

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

      {/* ── Catégories ──────────────────────────────────── */}
      <div className="pt-4">
        <CategoriesPills actif={categorieActive} onChange={setCategorieActive} />
      </div>

      {/* ── Bandeau d'info ──────────────────────────────── */}
      {!modeRecherche && <BandeauInfo nbOuverts={nbOuverts} />}

      {/* ── Contenu principal ───────────────────────────── */}
      {modeRecherche ? (
        // Mode recherche : grille plate
        <GrilleRecherche
          restaurants={resultatsRecherche}
          loading={loading}
          search={search}
        />
      ) : (
        <div className="mt-5">
          {/* En-tête de section + segment */}
          <div className="px-4 md:px-6 mb-3 max-w-4xl mx-auto">
            <h2 className="font-['Unbounded'] font-extrabold text-gray-900 text-base md:text-lg mb-2.5">
              Pour vous
            </h2>
          </div>
          <Segments actif={segment} onChange={setSegment} />

          {/* Ville sans restaurants */}
          {!loading && tous.length === 0 && (
            <VilleVide ville={ville} onChangerVille={effacerVille} />
          )}

          {/* Catégorie / segment sans résultat (mais la ville a des restaurants) */}
          {!loading && tous.length > 0 && tousAffiches.length === 0 && (
            <div className="px-4 md:px-6 py-10 text-center text-gray-400">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="font-semibold text-gray-600">Aucun restaurant ne correspond pour l'instant</p>
              <button
                onClick={() => { setCategorieActive(null); setSegment('tous') }}
                className="mt-3 text-brand-600 text-sm font-semibold hover:underline"
              >
                Voir tous les restaurants
              </button>
            </div>
          )}

          {/* Grille */}
          {tousAffiches.length > 0 && (
            <div className="mt-5">
              <GrilleRestaurants restaurants={tousAffiches} loading={loading} />
            </div>
          )}
        </div>
      )}

      {/* ── Bouton WhatsApp flottant ────────────────────── */}
      <button
        onClick={() => contacterSupport()}
        className="fixed right-4 w-14 h-14 bg-green-500 text-white rounded-full
                   flex items-center justify-center shadow-lg hover:bg-green-600
                   active:scale-95 transition-all z-30"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        aria-label="Contacter le support Zandofood via WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

    </div>
  )
}
