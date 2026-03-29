// Indicateur de chargement animé — tailles sm | md | lg, couleur configurable via className

const TAILLES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

/**
 * @param {{ taille?: 'sm'|'md'|'lg', className?: string }} props
 */
export default function Spinner({ taille = 'md', className = '' }) {
  return (
    <svg
      className={`animate-spin ${TAILLES[taille] ?? TAILLES.md} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Chargement…"
      role="status"
    >
      {/* Cercle de fond (opaque 25%) */}
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      {/* Arc animé */}
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
