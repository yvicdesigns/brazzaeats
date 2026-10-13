import { describe, it, expect } from 'vitest'
import { distanceKm } from './geo'

describe('distanceKm', () => {
  it('renvoie 0 pour deux points identiques', () => {
    const p = { lat: -4.2634, lng: 15.2429 } // Brazzaville
    expect(distanceKm(p, p)).toBeCloseTo(0, 6)
  })

  it('calcule une distance connue (Brazzaville → Pointe-Noire, ~360 km à vol d\'oiseau)', () => {
    const brazzaville = { lat: -4.2634, lng: 15.2429 }
    const pointeNoire  = { lat: -4.7761, lng: 11.8636 }
    const km = distanceKm(brazzaville, pointeNoire)
    expect(km).toBeGreaterThan(340)
    expect(km).toBeLessThan(380)
  })

  it('est symétrique (A→B == B→A)', () => {
    const a = { lat: -4.26, lng: 15.24 }
    const b = { lat: -4.80, lng: 11.86 }
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9)
  })
})
