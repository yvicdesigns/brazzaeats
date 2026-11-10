import { describe, it, expect, beforeEach } from 'vitest'
import { getPrefs, setPrefs, getPreset, PRESETS } from './notificationPrefs'

beforeEach(() => {
  localStorage.clear()
})

const DEFAUTS = {
  sonActif:        true,
  volume:          0.85,
  preset:          'sirene',
  vibrationActive: true,
  tts:             false,
}

describe('getPrefs', () => {
  it('renvoie les valeurs par défaut sans rien en localStorage', () => {
    expect(getPrefs()).toEqual(DEFAUTS)
  })

  it('fusionne avec les valeurs sauvegardées', () => {
    setPrefs({ volume: 0.3 })
    expect(getPrefs()).toEqual({ ...DEFAUTS, volume: 0.3 })
  })

  it('ne plante pas sur un contenu localStorage corrompu', () => {
    localStorage.setItem('zando_notif_prefs_v1', '{not valid json')
    expect(getPrefs()).toEqual(DEFAUTS)
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
    expect(getPrefs()).toEqual({ ...DEFAUTS, volume: 0.5, tts: true })
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
