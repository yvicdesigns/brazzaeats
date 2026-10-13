import { describe, it, expect, beforeEach } from 'vitest'
import { getPrefs, setPrefs, getPreset, PRESETS } from './notificationPrefs'

beforeEach(() => {
  localStorage.clear()
})

describe('getPrefs', () => {
  it('renvoie les valeurs par défaut sans rien en localStorage', () => {
    expect(getPrefs()).toEqual({ volume: 0.85, preset: 'sirene', tts: false })
  })

  it('fusionne avec les valeurs sauvegardées', () => {
    setPrefs({ volume: 0.3 })
    expect(getPrefs()).toEqual({ volume: 0.3, preset: 'sirene', tts: false })
  })

  it('ne plante pas sur un contenu localStorage corrompu', () => {
    localStorage.setItem('zando_notif_prefs_v1', '{not valid json')
    expect(getPrefs()).toEqual({ volume: 0.85, preset: 'sirene', tts: false })
  })
})

describe('setPrefs', () => {
  it('persiste et renvoie le nouvel état complet', () => {
    const resultat = setPrefs({ tts: true })
    expect(resultat.tts).toBe(true)
    expect(getPrefs().tts).toBe(true)
  })

  it('les appels successifs s\'accumulent (pas d\'écrasement total)', () => {
    setPrefs({ volume: 0.5 })
    setPrefs({ tts: true })
    expect(getPrefs()).toEqual({ volume: 0.5, preset: 'sirene', tts: true })
  })
})

describe('getPreset', () => {
  it('renvoie le préréglage demandé', () => {
    expect(getPreset('cloche')).toBe(PRESETS.cloche)
  })

  it('retombe sur sirene pour un nom inconnu', () => {
    expect(getPreset('inexistant')).toBe(PRESETS.sirene)
  })
})
