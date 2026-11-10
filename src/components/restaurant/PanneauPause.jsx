import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const DUREES = [
  { id: '15',   label: '15 min',  minutes: 15 },
  { id: '30',   label: '30 min',  minutes: 30 },
  { id: '60',   label: '1 heure', minutes: 60 },
  { id: '120',  label: '2 heures', minutes: 120 },
  { id: 'jour', label: 'Fermer pour le reste de la journée', finDeJournee: true },
]

function finPause(d) {
  if (d.finDeJournee) {
    const fin = new Date()
    fin.setHours(23, 59, 0, 0)
    return fin
  }
  return new Date(Date.now() + d.minutes * 60000)
}

/** Panneau de mise en pause des nouvelles commandes. onValider(Date) */
export default function PanneauPause({ onValider, onFermer }) {
  const [choix, setChoix] = useState('30')
  const [envoi, setEnvoi] = useState(false)
  const duree = DUREES.find(d => d.id === choix)

  async function valider() {
    setEnvoi(true)
    await onValider(finPause(duree))
    setEnvoi(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="pause-titre">
      <button className="absolute inset-0 bg-gray-900/40" aria-label="Fermer" onClick={onFermer} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="pause-titre" className="text-lg font-extrabold text-gray-900">Mettre en pause</h2>
            <p className="text-sm font-semibold text-gray-600 mt-1">
              Vous ne recevez plus de nouvelles commandes pendant la pause. Les commandes en cours continuent normalement.
            </p>
          </div>
          <button onClick={onFermer} aria-label="Fermer" className="w-11 h-11 -mr-2 -mt-1 rounded-full flex items-center justify-center hover:bg-gray-50 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <fieldset className="grid grid-cols-2 gap-2.5">
          <legend className="text-[13px] font-bold text-gray-500 mb-2.5">Durée</legend>
          {DUREES.map(d => (
            <label key={d.id}
                   className={`h-14 rounded-2xl flex items-center justify-center gap-2 text-[15px] cursor-pointer px-3 text-center
                               ${d.finDeJournee ? 'col-span-2' : ''}
                               ${choix === d.id ? 'border-2 border-brand-500 bg-brand-50/60 text-brand-500 font-extrabold' : 'border border-gray-200 text-gray-900 font-bold'}`}>
              <input type="radio" name="duree-pause" checked={choix === d.id} onChange={() => setChoix(d.id)} className="accent-brand-500 m-0" />
              {d.label}
            </label>
          ))}
        </fieldset>
        <button onClick={valider} disabled={envoi}
                className="h-[54px] rounded-2xl bg-gray-900 text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-60">
          {envoi && <Loader2 className="w-5 h-5 animate-spin" />}
          {duree.finDeJournee ? 'Fermer pour aujourd’hui' : `Mettre en pause ${duree.label}`}
        </button>
      </div>
    </div>
  )
}
