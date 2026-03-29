// Bouton réutilisable — variants, tailles, état loading, icône optionnelle

import Spinner from './Spinner'

// ── Styles par variant ─────────────────────────────────────
const VARIANTS = {
  primary:   'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40',
  danger:    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:bg-red-300',
  success:   'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 disabled:bg-green-300',
}

// ── Styles par taille ──────────────────────────────────────
const TAILLES = {
  sm: 'text-xs px-3 py-2 min-h-[36px] rounded-xl',
  md: 'text-sm px-4 py-3 min-h-[48px] rounded-xl',
  lg: 'text-base px-5 py-3.5 min-h-[56px] rounded-2xl',
}

/**
 * @param {{
 *   variant?:   'primary'|'secondary'|'ghost'|'danger'|'success',
 *   taille?:    'sm'|'md'|'lg',
 *   loading?:   boolean,
 *   fullWidth?: boolean,
 *   IconLeft?:  React.ComponentType,
 *   IconRight?: React.ComponentType,
 *   children:   React.ReactNode,
 *   className?: string,
 *   disabled?:  boolean,
 *   type?:      'button'|'submit'|'reset',
 *   onClick?:   () => void,
 * }} props
 */
export default function Button({
  variant   = 'primary',
  taille    = 'md',
  loading   = false,
  fullWidth = false,
  IconLeft,
  IconRight,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) {
  const estDesactive = disabled || loading

  return (
    <button
      type={type}
      disabled={estDesactive}
      className={[
        // Base
        'inline-flex items-center justify-center gap-2 font-semibold',
        'transition-colors select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        // Variant + taille
        VARIANTS[variant] ?? VARIANTS.primary,
        TAILLES[taille]   ?? TAILLES.md,
        // Largeur
        fullWidth ? 'w-full' : '',
        // Curseur désactivé
        estDesactive ? 'cursor-not-allowed' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {/* Spinner de chargement (remplace l'icône gauche) */}
      {loading
        ? <Spinner taille="sm" />
        : IconLeft && <IconLeft className="w-4 h-4 shrink-0" strokeWidth={2} />
      }

      {children}

      {/* Icône droite (masquée en loading) */}
      {!loading && IconRight && (
        <IconRight className="w-4 h-4 shrink-0" strokeWidth={2} />
      )}
    </button>
  )
}
