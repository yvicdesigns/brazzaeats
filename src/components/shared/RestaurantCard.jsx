import { Link } from 'react-router-dom'
import { Star, Clock, MapPin } from 'lucide-react'
import { isRestaurantOpen, getProchainHoraire } from '@/services/restaurantService'

/**
 * Carte restaurant affichée dans la liste Home.
 * Props :
 *   restaurant — objet complet depuis getRestaurants()
 */
export default function RestaurantCard({ restaurant }) {
  const ouvert    = isRestaurantOpen(restaurant.horaires)
  const prochainH = ouvert ? null : getProchainHoraire(restaurant.horaires)
  const quartier  = restaurant.adresse?.split(',')[1]?.trim() ?? restaurant.adresse ?? ''
  const note      = restaurant.note_moyenne

  return (
    <Link
      to={`/restaurant/${restaurant.id}`}
      className="block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-lg
                 active:scale-[0.98] transition-all duration-150"
    >
      {/* ── Visuel (vidéo / logo / placeholder) ─────────── */}
      <div className="relative h-44 bg-gray-900">
        {restaurant.video_apercu_url ? (
          <video
            src={restaurant.video_apercu_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : restaurant.logo_url ? (
          <img
            src={restaurant.logo_url}
            alt={restaurant.nom}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-50">
            <span className="text-5xl select-none">🍽️</span>
          </div>
        )}

        {/* Overlay fermé */}
        {!ouvert && (
          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-1.5">
            <span className="text-white font-black text-2xl tracking-wide">Fermé</span>
            {prochainH && (
              <span className="text-white/80 text-xs font-medium bg-black/40 px-3 py-1 rounded-full">
                {prochainH}
              </span>
            )}
          </div>
        )}

        {/* Badge ouvert / fermé (petit, coin haut-droit) */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold
            ${ouvert ? 'bg-green-500 text-white' : 'bg-gray-700/80 text-white'}`}
        >
          {ouvert ? 'Ouvert' : 'Fermé'}
        </span>

        {/* Dégradé bas */}
        {ouvert && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
        )}
      </div>

      {/* ── Informations ─────────────────────────────────── */}
      <div className="p-4">
        <h3 className={`font-bold text-base leading-snug mb-1 line-clamp-1
          ${ouvert ? 'text-gray-900' : 'text-gray-500'}`}>
          {restaurant.nom}
        </h3>

        {restaurant.description && (
          <p className="text-gray-500 text-sm line-clamp-1 mb-3">
            {restaurant.description}
          </p>
        )}

        {/* Méta-données : note · temps · quartier */}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-yellow-500 font-semibold">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-gray-800">
              {note != null ? note.toFixed(1) : '—'}
            </span>
          </span>

          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="w-4 h-4" />
            20-35 min
          </span>

          {quartier && (
            <span className="flex items-center gap-1 text-gray-500 truncate">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-[90px]">{quartier}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
