/**
 * ReglagesNotifications — son, vibration et lecture vocale (TTS), chacun
 * activable indépendamment, réutilisé dans les profils restaurant / livreur
 * / client / admin. Réglages par appareil (localStorage) — voir
 * notificationPrefs.js.
 */
import { useState } from 'react'
import { Volume2, Vibrate, Mic, ToggleLeft, ToggleRight, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrefs, setPrefs, PRESETS } from '@/utils/notificationPrefs'
import { demarrerAlarme, arreterAlarme, resumeAudio } from '@/utils/notificationSound'

// ── Interrupteur générique on/off, avec titre + description ──────
function Interrupteur({ Icone, titre, description, actif, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 pr-3">
        <Icone className={`w-4 h-4 shrink-0 ${actif ? 'text-brand-500' : 'text-gray-300'}`} />
        <div>
          <p className="text-sm font-medium text-gray-700">{titre}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={actif ? 'text-brand-500 shrink-0' : 'text-gray-300 shrink-0'}
        aria-label={`Activer ${titre}`}
      >
        {actif ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
      </button>
    </div>
  )
}

export default function ReglagesNotifications() {
  const [prefs, setLocalPrefs] = useState(getPrefs())

  function maj(partiel) {
    setLocalPrefs(setPrefs(partiel))
  }

  async function tester() {
    try {
      await resumeAudio()
      demarrerAlarme('Ceci est un test')
      setTimeout(() => arreterAlarme(), 1700)
    } catch (err) {
      toast.error('Erreur audio : ' + (err?.message ?? String(err)), { duration: 6000 })
    }
  }

  const rienActif = !prefs.sonActif && !prefs.vibrationActive && !prefs.tts

  return (
    <div className="space-y-4">
      {/* Son */}
      <div className="space-y-3">
        <Interrupteur
          Icone={Volume2}
          titre="Son"
          description="Sirène/cloche/... jouée à l'arrivée d'une notification"
          actif={prefs.sonActif}
          onToggle={() => maj({ sonActif: !prefs.sonActif })}
        />

        {prefs.sonActif && (
          <div className="pl-[26px] space-y-3">
            {/* Volume */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 font-medium">Volume</label>
                <span className="text-xs font-semibold text-gray-500">
                  {Math.round(prefs.volume * 100)}%
                </span>
              </div>
              <input
                type="range" min={0.15} max={1} step={0.05}
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
          </div>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* Vibration */}
      <Interrupteur
        Icone={Vibrate}
        titre="Vibration"
        description="Vibre par à-coups en même temps que la notification"
        actif={prefs.vibrationActive}
        onToggle={() => maj({ vibrationActive: !prefs.vibrationActive })}
      />

      <div className="border-t border-gray-100" />

      {/* Lecture vocale */}
      <Interrupteur
        Icone={Mic}
        titre="Lire à voix haute"
        description="Annonce vocale (ex : « Nouvelle commande »)"
        actif={prefs.tts}
        onToggle={() => maj({ tts: !prefs.tts })}
      />

      {rienActif && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Tout est désactivé — vous ne serez prévenu·e d'aucune notification tant qu'au moins
          un réglage ci-dessus n'est pas réactivé.
        </p>
      )}

      <button
        type="button"
        onClick={tester}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200
                   text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
      >
        <Play className="w-4 h-4" /> Tester les notifications
      </button>
    </div>
  )
}
