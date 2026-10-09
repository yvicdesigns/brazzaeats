/**
 * ReglagesNotifications — volume, choix du son d'alerte et lecture vocale
 * (TTS), réutilisé dans les profils restaurant / livreur / client / admin.
 * Réglages par appareil (localStorage) — voir notificationPrefs.js.
 */
import { useState } from 'react'
import { Volume2, ToggleLeft, ToggleRight, Play } from 'lucide-react'
import { getPrefs, setPrefs, PRESETS } from '@/utils/notificationPrefs'
import { demarrerAlarme, arreterAlarme, resumeAudio } from '@/utils/notificationSound'

export default function ReglagesNotifications() {
  const [prefs, setLocalPrefs] = useState(getPrefs())

  function maj(partiel) {
    setLocalPrefs(setPrefs(partiel))
  }

  async function tester() {
    await resumeAudio()
    demarrerAlarme('Ceci est un test')
    setTimeout(() => arreterAlarme(), 1700)
  }

  return (
    <div className="space-y-4">
      {/* Volume */}
      <div>
        <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5" /> Volume
        </label>
        <input
          type="range" min={0} max={1} step={0.05}
          value={prefs.volume}
          onChange={e => maj({ volume: parseFloat(e.target.value) })}
          className="w-full accent-brand-500 mt-1.5"
        />
      </div>

      {/* Son d'alerte */}
      <div>
        <label className="text-xs text-gray-500 font-medium">Son d'alerte</label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {Object.entries(PRESETS).map(([cle, { label }]) => (
            <button
              key={cle}
              type="button"
              onClick={() => maj({ preset: cle })}
              className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                prefs.preset === cle
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lecture vocale */}
      <div className="flex items-center justify-between pt-1">
        <div className="pr-3">
          <p className="text-sm font-medium text-gray-700">Lire à voix haute</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Annonce vocale en plus du son (ex : "Nouvelle commande")
          </p>
        </div>
        <button
          type="button"
          onClick={() => maj({ tts: !prefs.tts })}
          className={prefs.tts ? 'text-brand-500 shrink-0' : 'text-gray-300 shrink-0'}
          aria-label="Activer la lecture vocale"
        >
          {prefs.tts ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
        </button>
      </div>

      <button
        type="button"
        onClick={tester}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200
                   text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
      >
        <Play className="w-4 h-4" /> Tester le son
      </button>
    </div>
  )
}
