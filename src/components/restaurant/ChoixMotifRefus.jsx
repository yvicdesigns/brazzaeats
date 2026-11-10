import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { MOTIFS_REFUS } from '@/utils/constants'

/**
 * Choix du motif au moment de refuser (ou d'annuler) une commande.
 * onConfirmer(motifTexte, menuItemIdEnRupture | null)
 */
export default function ChoixMotifRefus({ commande, titre, onConfirmer, onRetour, envoi }) {
  const [motif, setMotif] = useState(null)
  const [platId, setPlatId] = useState(null)
  const [autre, setAutre] = useState('')

  const plats = (commande.order_items ?? []).filter(oi => oi.menu_item?.id)
  const texte = motif === 'autre'
    ? autre.trim()
    : motif === 'rupture'
      ? `Plat en rupture${platId ? ` : ${plats.find(p => p.menu_item.id === platId)?.menu_item.nom}` : ''}`
      : MOTIFS_REFUS.find(m => m.id === motif)?.label
  const valide = motif && (motif !== 'autre' || autre.trim().length >= 3)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[17px] font-extrabold text-gray-900">{titre}</p>
        <p className="text-sm font-semibold text-gray-500">Le client reçoit ce motif tout de suite.</p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Motif</legend>
        {MOTIFS_REFUS.map(m => (
          <label key={m.id}
                 className={`flex flex-col gap-2.5 px-3.5 py-3 rounded-2xl border cursor-pointer
                             ${motif === m.id ? 'border-2 border-brand-500 bg-brand-50/60' : 'border-gray-200'}`}>
            <span className="flex items-center gap-3 text-[15px] font-bold text-gray-900">
              <input type="radio" name={`motif-${commande.id}`} checked={motif === m.id}
                     onChange={() => setMotif(m.id)} className="w-5 h-5 accent-brand-500 m-0" />
              {m.label}
            </span>
            {motif === 'rupture' && m.id === 'rupture' && plats.length > 0 && (
              <span className="flex flex-col gap-2 pl-8">
                <span className="flex flex-wrap gap-2">
                  {plats.map(oi => (
                    <button key={oi.menu_item.id} type="button" onClick={() => setPlatId(id => id === oi.menu_item.id ? null : oi.menu_item.id)}
                            aria-pressed={platId === oi.menu_item.id}
                            className={`px-2.5 py-1.5 rounded-lg text-[13px] font-bold bg-white
                                        ${platId === oi.menu_item.id ? 'border-[1.5px] border-brand-500 text-brand-500' : 'border border-gray-200 text-gray-900'}`}>
                      {oi.menu_item.nom}
                    </button>
                  ))}
                </span>
                <span className="text-[13px] font-semibold text-gray-600">Le plat choisi sera aussi marqué en rupture dans le menu.</span>
              </span>
            )}
            {motif === 'autre' && m.id === 'autre' && (
              <input type="text" value={autre} onChange={e => setAutre(e.target.value)} maxLength={140} autoFocus
                     placeholder="Précisez le motif"
                     className="ml-8 h-11 px-3 rounded-xl border border-gray-200 text-[15px] font-semibold outline-none focus:border-brand-500" />
            )}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-[1fr_1.6fr] gap-2.5 pt-1">
        <button type="button" onClick={onRetour} disabled={envoi}
                className="h-[52px] rounded-2xl border border-gray-200 font-bold text-gray-900">Retour</button>
        <button type="button" onClick={() => onConfirmer(texte, motif === 'rupture' ? platId : null)} disabled={!valide || envoi}
                className="h-[52px] rounded-2xl bg-terracotta-700 text-white font-extrabold flex items-center justify-center gap-2 disabled:opacity-40">
          {envoi && <Loader2 className="w-5 h-5 animate-spin" />}
          Confirmer
        </button>
      </div>
    </div>
  )
}
