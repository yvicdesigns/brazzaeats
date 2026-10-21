import { Link } from 'react-router-dom'
import { Star, MapPin } from 'lucide-react'
import { isRestaurantOpen, getProchainHoraire } from '@/services/restaurantService'

const JOURS_NOUVEAU = 14
const COULEUR_INITIALE = '#0B6E4F'

/**
 * Carte restaurant affichée dans la liste Home.
 * Props :
 *   restaurant — objet complet depuis getRestaurants()
 */
export default function RestaurantCard({ restaurant }) {
  const ouvert    = isRestaurantOpen(restaurant.horaires)
  const prochainH = ouvert ? null : getProchainHoraire(restaurant.horaires)
  const quartier  = restaurant.adresse?.split(',')[1]?.trim() ?? restaurant.adresse ?? ''

  // Note réelle seulement si elle existe vraiment — un "0,0" sur un restaurant
  // qui vient de s'inscrire se lit comme "mauvais", pas comme "nouveau".
  const noteReelle = restaurant.note_moyenne != null && restaurant.note_moyenne > 0
    ? restaurant.note_moyenne
    : null

  const estNouveau = !noteReelle && restaurant.created_at
    ? (Date.now() - new Date(restaurant.created_at).getTime()) / 86_400_000 <= JOURS_NOUVEAU
    : !noteReelle

  // Couverture dédiée si fournie, sinon on retombe sur le logo (comportement historique :
  // beaucoup de restaurants n'ont qu'un logo_url, utilisé comme visuel principal).
  const couverture = restaurant.photo_couverture_url || restaurant.logo_url
  // Dès qu'il y a une couverture distincte du logo, on affiche un badge rond —
  // le vrai logo s'il existe, sinon une initiale colorée, pour que la carte
  // ne paraisse jamais "cassée" faute d'avoir reçu les deux images.
  const afficherBadge = !!restaurant.photo_couverture_url

  return (
    <Link
      to={`/restaurant/${restaurant.id}`}
      className="relative block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-lg
                 active:scale-[0.98] transition-all duration-150"
    >
      {/* ── Visuel (vidéo / couverture / placeholder) ───── */}
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
        ) : couverture ? (
          <img
            src={couverture}
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
        {/* Badge (logo ou initiale), à cheval sur la frontière photo/texte, + nom */}
        <div className={`flex items-end gap-3 ${afficherBadge ? '-mt-11 mb-2' : 'mb-1'}`}>
          {afficherBadge && (
            restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt=""
                className="w-14 h-14 rounded-full object-cover shrink-0 z-10
                           ring-4 ring-white shadow-md bg-white"
                loading="lazy"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full shrink-0 z-10 flex items-center justify-center
                           ring-4 ring-white shadow-md"
                style={{ backgroundColor: COULEUR_INITIALE }}
                aria-hidden="true"
              >
                <span className="font-['Unbounded'] font-bold text-lg text-white">
                  {restaurant.nom?.trim().charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )
          )}
          <h3 className={`font-['Manrope'] font-extrabold text-base leading-snug line-clamp-1 flex-1 min-w-0
            ${ouvert ? 'text-gray-900' : 'text-gray-500'}`}>
            {restaurant.nom}
          </h3>
        </div>

        {restaurant.description && (
          <p className="text-gray-500 text-sm line-clamp-1 mb-3">
            {restaurant.description}
          </p>
        )}

        {/* Méta-données : note réelle ou "Nouveau" · prix · quartier */}
        <div className="flex items-center gap-3 text-sm">
          {noteReelle ? (
            <span className="flex items-center gap-1 text-yellow-500 font-semibold shrink-0">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-gray-800">{noteReelle.toFixed(1)}</span>
            </span>
          ) : estNouveau ? (
            <span className="shrink-0 bg-amber-50 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              Nouveau
            </span>
          ) : null}

          {restaurant.price_tier != null && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-gray-700 font-semibold shrink-0">
                {'₣'.repeat(restaurant.price_tier)}
              </span>
            </>
          )}

          {quartier && (
            <>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1 text-gray-500 truncate min-w-0">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{quartier}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
