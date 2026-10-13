import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isItemDisponibleMaintenant, isRuptureStock, labelHoraires, prochainCreneau } from './disponibilite'

describe('isRuptureStock', () => {
  it('false quand le stock n\'est pas suivi (null/undefined)', () => {
    expect(isRuptureStock({ stock_quantite: null })).toBe(false)
    expect(isRuptureStock({})).toBe(false)
  })

  it('true quand le stock suivi est à 0', () => {
    expect(isRuptureStock({ stock_quantite: 0 })).toBe(true)
  })

  it('false quand le stock suivi est positif', () => {
    expect(isRuptureStock({ stock_quantite: 5 })).toBe(false)
  })
})

describe('isItemDisponibleMaintenant', () => {
  it('false si disponible=false, même sans restriction horaire', () => {
    expect(isItemDisponibleMaintenant({ disponible: false })).toBe(false)
  })

  it('true si disponible=true et aucune restriction (horaires/stock)', () => {
    expect(isItemDisponibleMaintenant({ disponible: true, horaires: null })).toBe(true)
  })

  it('false dès que le stock suivi est épuisé, même si disponible=true', () => {
    // Le cas qu'on vient de câbler : un article reste "disponible=true" en base
    // (le restaurant ne l'a pas désactivé manuellement) mais le stock est à 0.
    expect(isItemDisponibleMaintenant({ disponible: true, stock_quantite: 0, horaires: null })).toBe(false)
  })

  it('true si le stock suivi est encore positif', () => {
    expect(isItemDisponibleMaintenant({ disponible: true, stock_quantite: 3, horaires: null })).toBe(true)
  })

  describe('avec restriction horaire', () => {
    beforeEach(() => {
      // Mardi (jour=2) à 12h00 — dans le créneau déjeuner d'un restaurant type
      vi.setSystemTime(new Date('2026-10-13T12:00:00'))
    })
    afterEach(() => vi.useRealTimers())

    it('disponible dans le créneau du bon jour', () => {
      const item = { disponible: true, horaires: { jours: [2], heure_debut: '11:00', heure_fin: '15:00' } }
      expect(isItemDisponibleMaintenant(item)).toBe(true)
    })

    it('indisponible hors créneau horaire (avant heure_debut)', () => {
      const item = { disponible: true, horaires: { jours: [2], heure_debut: '18:00', heure_fin: '23:00' } }
      expect(isItemDisponibleMaintenant(item)).toBe(false)
    })

    it('indisponible un jour non inclus', () => {
      const item = { disponible: true, horaires: { jours: [1, 3], heure_debut: '11:00', heure_fin: '15:00' } }
      expect(isItemDisponibleMaintenant(item)).toBe(false)
    })
  })
})

describe('labelHoraires', () => {
  it('null si pas de restriction', () => {
    expect(labelHoraires(null)).toBeNull()
  })

  it('"Tous les jours" si jours vide/absent', () => {
    expect(labelHoraires({ heure_debut: '11:00', heure_fin: '15:00' }))
      .toBe('Tous les jours · 11:00–15:00')
  })

  it('liste les jours sélectionnés quand ce n\'est pas tous les jours', () => {
    expect(labelHoraires({ jours: [1, 5], heure_debut: '11:00', heure_fin: '15:00' }))
      .toBe('Lun, Ven · 11:00–15:00')
  })
})

describe('prochainCreneau', () => {
  it('null sans heure_debut', () => {
    expect(prochainCreneau(null)).toBeNull()
    expect(prochainCreneau({})).toBeNull()
  })

  it('formate l\'heure de début', () => {
    expect(prochainCreneau({ heure_debut: '18:00' })).toBe('à partir de 18:00')
  })
})
