import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, Clock, MapPin, ShoppingCart, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import MenuItemCard from '@/components/shared/MenuItemCard'
import { getRestaurantById, getMenuByRestaurant, getRestaurantReviews } from '@/services/restaurantService'
import useCart, { useCartCount, useCartTotal } from '@/hooks/useCart'
import { formatCurrency } from '@/utils/formatCurrency'

// ── Squelette menu ─────────────────────────────────────────
function SkeletonMenu() {
  return (
    <div className="animate-pulse space-y-6 px-4 py-4">
      <div className="h-5 bg-gray-200 rounded-lg w-1/3" />
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3 p-3 bg-white rounded-xl">
          <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
            <div className="h-3 bg-gray-200 rounded-lg w-full" />
            <div className="h-3 bg-gray-200 rounded-lg w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Restaurant() {
  const { id }     = useParams()
  const navigate   = useNavigate()

  const [restaurant,      setRestaurant]      = useState(null)
  const [menu,            setMenu]            = useState([])
  const [avis,            setAvis]            = useState([])
  const [loading,         setLoading]         = useState(true)
  const [erreur,          setErreur]          = useState(null)
  const [activeCategorie, setActiveCategorie] = useState(null)
  const [voirAvis,        setVoirAvis]        = useState(false)

  // Refs pour le scroll vers les sections du menu
  const categorieRefs = useRef({})

  const totalItems = useCartCount()
  const totalPrix  = useCartTotal()

  // ── Chargement restaurant + menu ────────────────────────
  useEffect(() => {
    async function charger() {
      setLoading(true)

      const [
        { data: resto, error: errResto },
        { data: menuData, error: errMenu },
        { data: avisData },
      ] = await Promise.all([
        getRestaurantById(id),
        getMenuByRestaurant(id),
        getRestaurantReviews(id),
      ])

      if (errResto || errMenu) {
        setErreur(errResto || errMenu)
        toast.error('Impossible de charger le restaurant')
      } else {
        setRestaurant(resto)
        setMenu(menuData)
        setAvis(avisData ?? [])
        if (menuData.length > 0) setActiveCategorie(menuData[0].id)
      }

      setLoading(false)
    }

    charger()
  }, [id])

  // ── Scroll fluide vers la catégorie ────────────────────
  function scrollVers(categorieId) {
    setActiveCategorie(categorieId)
    categorieRefs.current[categorieId]?.scrollIntoView({
      behavior: 'smooth',
      block:    'start',
    })
  }

  // ── Intersection Observer : met à jour l'onglet actif ──
  useEffect(() => {
    if (menu.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveCategorie(entry.target.dataset.categorieId)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    menu.forEach(cat => {
      const el = categorieRefs.current[cat.id]
      if (el) {
        el.dataset.categorieId = cat.id
        observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [menu])

  // ── Écran d'erreur ──────────────────────────────────────
  if (!loading && erreur) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-5xl mb-4">😔</p>
        <p className="font-bold text-gray-800 mb-2">Restaurant introuvable</p>
        <Link to="/" className="text-brand-500 underline text-sm">Retour à l'accueil</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header : vidéo ou photo de couverture ───────── */}
      <div className="relative h-56 bg-gray-900 overflow-hidden">
        {restaurant?.video_url ? (
          <video
            src={restaurant.video_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : restaurant?.logo_url ? (
          <img
            src={restaurant.logo_url}
            alt={restaurant?.nom}
            className="w-full h-full object-cover"
          />
        ) : null}

        {/* Dégradé lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />

        {/* Bouton retour */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>

        {/* Informations du restaurant par-dessus */}
        {restaurant && (
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="text-xl font-bold leading-tight">{restaurant.nom}</h1>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-white/90">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 stroke-yellow-400" />
                {restaurant.note_moyenne?.toFixed(1) ?? '—'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                20-35 min
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{restaurant.adresse?.split(',')[0]}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Onglets catégories + Avis (sticky sous le header) */}
      {!loading && (
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex gap-1 px-4 py-2.5 overflow-x-auto scrollbar-none">
            {menu.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setVoirAvis(false); scrollVers(cat.id) }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${!voirAvis && activeCategorie === cat.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {cat.nom}
              </button>
            ))}
            {/* Onglet Avis */}
            <button
              onClick={() => setVoirAvis(true)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                flex items-center gap-1
                ${voirAvis
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <Star className="w-3.5 h-3.5" />
              Avis {avis.length > 0 && `(${avis.length})`}
            </button>
          </div>
        </div>
      )}

      {/* ── Contenu ─────────────────────────────────────── */}
      {loading ? (
        <SkeletonMenu />
      ) : voirAvis ? (

        /* ── Section Avis ──────────────────────────────── */
        <div className="px-4 py-4 space-y-4" style={{ paddingBottom: '2rem' }}>
          {/* Résumé note */}
          {avis.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="text-center shrink-0">
                <p className="text-3xl font-black text-gray-900">
                  {(avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1)}
                </p>
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-3.5 h-3.5 ${
                      i <= Math.round(avis.reduce((s,a)=>s+a.note,0)/avis.length)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{avis.length} avis</p>
              </div>
              <div className="flex-1 space-y-1">
                {[5,4,3,2,1].map(n => {
                  const count = avis.filter(a => a.note === n).length
                  const pct   = avis.length ? (count / avis.length) * 100 : 0
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-3">{n}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Liste des avis */}
          {avis.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Star className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-semibold text-gray-500">Aucun avis pour l'instant</p>
              <p className="text-sm mt-1">Soyez le premier à donner votre avis !</p>
            </div>
          ) : avis.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
              {/* Client + note + date */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center
                                  text-brand-600 font-bold text-sm shrink-0">
                    {(a.client?.nom ?? '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{a.client?.nom ?? 'Client'}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i <= a.note ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                  ))}
                </div>
              </div>

              {/* Commentaire */}
              {a.commentaire && (
                <p className="text-sm text-gray-700 leading-relaxed">{a.commentaire}</p>
              )}

              {/* Réponse restaurant */}
              {a.reponse_restaurant && (
                <div className="mt-3 bg-brand-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-brand-600 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Réponse du restaurant
                  </p>
                  <p className="text-sm text-gray-700">{a.reponse_restaurant}</p>
                </div>
              )}
            </div>
          ))}
        </div>

      ) : (

        /* ── Section Menu ───────────────────────────────── */
        <div
          className="space-y-8 px-4 py-4"
          style={{ paddingBottom: totalItems > 0 ? '6rem' : '2rem' }}
        >
          {menu.map(categorie => (
            <section
              key={categorie.id}
              ref={el => { categorieRefs.current[categorie.id] = el }}
            >
              <h2 className="text-base font-bold text-gray-800 mb-3">
                {categorie.nom}
              </h2>
              <div className="space-y-3">
                {categorie.items.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    restaurantId={id}
                    restaurantNom={restaurant?.nom}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Barre panier flottante ───────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 pointer-events-none z-30">
          <Link
            to="/panier"
            className="flex items-center justify-between bg-brand-500 text-white
                       rounded-xl px-4 py-4 shadow-xl pointer-events-auto
                       active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/25 rounded-lg w-8 h-8 flex items-center justify-center font-bold text-sm">
                {totalItems}
              </span>
              <span className="font-semibold">Voir le panier</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{formatCurrency(totalPrix)}</span>
              <ShoppingCart className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
