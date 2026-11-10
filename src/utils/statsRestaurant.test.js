import { describe, it, expect } from 'vitest'
import { caCommande, calculerStats, variation, compterEtapes } from './statsRestaurant'

const MAINTENANT = new Date('2026-11-10T15:00:00')
const cmd = (jour, statut, montant, frais = 0, extra = {}) => ({
  created_at: `2026-11-${String(jour).padStart(2, '0')}T12:00:00`, statut, montant_total: montant, frais_livraison: frais, ...extra,
})

describe('caCommande', () => {
  it('exclut les frais de livraison', () => {
    expect(caCommande({ montant_total: 3500, frais_livraison: 1000 })).toBe(2500)
  })
  it('tolère les champs manquants', () => {
    expect(caCommande({ montant_total: 1500 })).toBe(1500)
  })
})

describe('variation', () => {
  it('renvoie null sans période de comparaison', () => {
    expect(variation(1000, 0)).toBeNull()
  })
  it('calcule le pourcentage arrondi', () => {
    expect(variation(1100, 1000)).toBe(10)
    expect(variation(900, 1000)).toBe(-10)
  })
})

describe('calculerStats', () => {
  const commandes = [
    cmd(10, 'livrée', 3500, 1000, { temps_preparation_minutes: 20, order_items: [{ quantite: 2, sous_total: 2500, menu_item: { nom: 'Poulet' } }] }),
    cmd(8, 'livrée', 1500, 0, { temps_preparation_minutes: 10, order_items: [{ quantite: 1, sous_total: 1500, menu_item: { nom: 'Frites' } }] }),
    cmd(9, 'annulée', 2000),
    cmd(9, 'en_attente', 5000),
    cmd(2, 'livrée', 2000),
  ]

  it('ne compte que les commandes livrées de la période, sans frais de livraison', () => {
    const s = calculerStats(commandes, 'semaine', MAINTENANT)
    expect(s.ca).toBe(4000)
    expect(s.nbLivrees).toBe(2)
    expect(s.panierMoyen).toBe(2000)
  })

  it('compare à la période précédente', () => {
    const s = calculerStats(commandes, 'semaine', MAINTENANT)
    expect(s.variationCa).toBe(100)
  })

  it('calcule la qualité du service', () => {
    const s = calculerStats(commandes, 'semaine', MAINTENANT)
    expect(s.annulees).toBe(1)
    expect(s.tauxReussite).toBe(67)
    expect(s.delaiMoyen).toBe(15)
  })

  it("limite « aujourd'hui » au jour courant", () => {
    const s = calculerStats(commandes, 'jour', MAINTENANT)
    expect(s.ca).toBe(2500)
    expect(s.parJour.at(-1).ca).toBe(2500)
  })

  it('classe les plats les plus vendus', () => {
    const s = calculerStats(commandes, 'semaine', MAINTENANT)
    expect(s.topPlats[0]).toEqual({ nom: 'Poulet', quantite: 2, ca: 2500 })
  })
})

describe('compterEtapes', () => {
  it('regroupe acceptée et en préparation sous « en cuisine »', () => {
    const e = compterEtapes([{ statut: 'en_attente' }, { statut: 'acceptée' }, { statut: 'en_préparation' }, { statut: 'prête' }])
    expect(e).toEqual({ nouvelles: 1, cuisine: 2, pretes: 1, livraison: 0 })
  })
})
