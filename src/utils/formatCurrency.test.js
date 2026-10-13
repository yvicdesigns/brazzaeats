import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCurrencyShort, formatCommission } from './formatCurrency'

describe('formatCurrency', () => {
  it('formate un montant avec séparateur de milliers', () => {
    // Intl.NumberFormat('fr-FR') insère une espace insécable FINE (U+202F),
    // pas une espace normale — invisible à l'oeil, donc explicite ici pour
    // ne pas réintroduire le piège si quelqu'un relit/modifie ce test.
    expect(formatCurrency(2500)).toBe('2 500 FCFA')
  })

  it('formate zéro', () => {
    expect(formatCurrency(0)).toBe('0 FCFA')
  })

  it('renvoie un placeholder pour null/undefined/NaN', () => {
    expect(formatCurrency(null)).toBe('— FCFA')
    expect(formatCurrency(undefined)).toBe('— FCFA')
    expect(formatCurrency(NaN)).toBe('— FCFA')
  })
})

describe('formatCurrencyShort', () => {
  it('abrège en k en dessous du million', () => {
    expect(formatCurrencyShort(16000)).toBe('16k FCFA')
  })

  it('abrège en M au-dessus du million', () => {
    expect(formatCurrencyShort(1500000)).toBe('1,5M FCFA')
  })

  it('utilise le format complet en dessous de 1000', () => {
    expect(formatCurrencyShort(500)).toBe('500 FCFA')
  })
})

describe('formatCommission', () => {
  it('calcule un pourcentage et arrondit', () => {
    // Évite une régression du bug classique "commission jamais appliquée"
    // ou d'une inversion montant/taux dans les deux services qui l'utilisent
    // (restaurant/History.jsx, adminService.js).
    expect(formatCommission(5000, 10)).toBe('500 FCFA')
    expect(formatCommission(4500, 10)).toBe('450 FCFA')
  })

  it('gère un taux de 0%', () => {
    expect(formatCommission(5000, 0)).toBe('0 FCFA')
  })
})
