// Barrel export — import unique depuis '@/components/ui'
// ex: import { Button, Badge, Modal, InstallBanner } from '@/components/ui'

export { default as Button }        from './Button'
export { default as Modal }         from './Modal'
export { default as Spinner }       from './Spinner'
export { default as InstallBanner } from './InstallBanner'

// Badge — export nommés + défaut
export {
  default as Badge,
  BadgeStatutCommande,
  BadgeStatutRestaurant,
} from './Badge'

// Skeleton — export nommés + défaut
export {
  default as Skeleton,
  SkeletonBlock,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
  SkeletonLigneCommande,
} from './Skeleton'
