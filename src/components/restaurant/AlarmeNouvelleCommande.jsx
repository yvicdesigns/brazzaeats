/**
 * AlarmeNouvelleCommande — prise de contrôle plein écran à chaque nouvelle
 * commande, tant qu'elle n'a pas été explicitement acceptée ou refusée.
 * Montée une seule fois dans RestaurantLayout — visible depuis n'importe
 * quelle page de l'espace restaurant.
 */
import { useState, useEffect } from 'react'
import { Loader2, Bell, Minus, Plus } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { tempsPreparationParDefaut } from '@/hooks/useRestaurantNotifications'
import ChoixMotifRefus from '@/components/restaurant/ChoixMotifRefus'

const PAS_MINUTES = 5

export default function AlarmeNouvelleCommande({ commande, restantes, onAccepter, onRefuser, enCours }) {
  const [minutes, setMinutes] = useState(15)
  const [confirmerRefus, setConfirmerRefus] = useState(false)

  useEffect(() => {
    if (!commande) return
    setMinutes(tempsPreparationParDefaut(commande))
    setConfirmerRefus(false)
  }, [commande?.id])

  if (!commande) return null

  const articles  = commande.order_items ?? []
  const totalPlats = (commande.montant_total ?? 0) - (commande.frais_livraison ?? 0)
  const mobileMoney = commande.mode_paiement && commande.mode_paiement !== 'cash'
  const autres = restantes - 1

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="alarme-titre"
         className="fixed inset-0 z-[100] bg-white flex flex-col overflow-y-auto">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col px-6 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] gap-6">

        <div className="flex flex-col items-center gap-3.5 text-center">
          <span className="w-[88px] h-[88px] rounded-full bg-terracotta-50 ring-[12px] ring-terracotta-50/50 flex items-center justify-center animate-pulse">
            <Bell className="w-10 h-10 text-terracotta-700" strokeWidth={2} />
          </span>
          <div>
            <h1 id="alarme-titre" className="text-[26px] font-extrabold text-gray-900 tracking-tight">Nouvelle commande</h1>
            <p className="text-[15px] font-semibold text-gray-500 mt-1">
              #{commande.id?.slice(0, 6).toUpperCase()} · {commande.type === 'retrait' ? 'Retrait' : 'Livraison'} · {commande.client?.nom ?? 'Client'}
            </p>
          </div>
        </div>

        <section className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-2.5">
          <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {articles.map((oi, i) => (
              <li key={oi.id ?? i} className="text-[17px] font-semibold text-gray-900">
                <span className="font-extrabold">{oi.quantite} ×</span> {oi.menu_item?.nom ?? '—'}
              </li>
            ))}
          </ul>
          {commande.notes && (
            <p className="text-sm font-semibold text-gray-600 bg-gray-50 rounded-xl px-3 py-2">Note : « {commande.notes} »</p>
          )}
          <div className="flex justify-between pt-2.5 border-t border-gray-100 text-[15px]">
            <span className="font-semibold text-gray-600">Total plats</span>
            <span className="font-extrabold tabular-nums">{formatCurrency(totalPlats)}</span>
          </div>
          {mobileMoney && (
            commande.preuve_paiement_url ? (
              <a href={commande.preuve_paiement_url} target="_blank" rel="noreferrer"
                 className="flex justify-between items-center h-11 px-3 rounded-xl bg-amber-50 text-amber-900 text-sm font-bold">
                Mobile Money · preuve reçue <span className="font-extrabold">Vérifier</span>
              </a>
            ) : (
              <p className="h-11 px-3 rounded-xl bg-amber-50 text-amber-900 text-sm font-bold flex items-center">
                Mobile Money · aucune preuve envoyée
              </p>
            )
          )}
        </section>

        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-gray-900">Prête dans</span>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Moins 5 minutes" onClick={() => setMinutes(m => Math.max(PAS_MINUTES, m - PAS_MINUTES))}
                    className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center active:bg-gray-50">
              <Minus className="w-5 h-5" />
            </button>
            <span className="min-w-[76px] text-center text-[19px] font-extrabold tabular-nums">{minutes} min</span>
            <button type="button" aria-label="Plus 5 minutes" onClick={() => setMinutes(m => Math.min(120, m + PAS_MINUTES))}
                    className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center active:bg-gray-50">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          {confirmerRefus ? (
            <ChoixMotifRefus
              commande={commande}
              titre="Pourquoi refuser cette commande ?"
              envoi={enCours === 'refuser'}
              onRetour={() => setConfirmerRefus(false)}
              onConfirmer={(motif, platId) => onRefuser(commande.id, motif, platId)}
            />
          ) : (
            <>
              <button type="button" onClick={() => onAccepter(commande.id, minutes)} disabled={!!enCours}
                      className="h-[60px] rounded-2xl bg-brand-500 text-white font-extrabold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50">
                {enCours === 'accepter' && <Loader2 className="w-5 h-5 animate-spin" />}
                Accepter la commande
              </button>
              <button type="button" onClick={() => setConfirmerRefus(true)} disabled={!!enCours}
                      className="h-[52px] rounded-2xl border border-gray-200 font-bold text-gray-900 disabled:opacity-50">
                Refuser
              </button>
            </>
          )}
          <p className="text-center text-[13px] font-semibold text-gray-500">
            La sonnerie s'arrête dès que vous répondez, ou si la commande est prise sur un autre appareil.
          </p>
          {autres > 0 && (
            <p className="text-center text-[13px] font-bold text-terracotta-700">
              + {autres} autre{autres > 1 ? 's' : ''} commande{autres > 1 ? 's' : ''} en attente
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
