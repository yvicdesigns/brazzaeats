import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Check, XCircle, ChefHat, Package, Bike, Loader2, Phone, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/supabase/client'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { useAuth } from '@/hooks/useAuth'
import { getOrdersByRestaurant } from '@/services/menuService'
import { updateOrderStatus } from '@/services/orderService'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE, STATUTS_ACTIFS } from '@/utils/constants'
import { resumeAudio } from '@/utils/notificationSound'
import ChatModal from '@/components/shared/ChatModal'

// ── Transitions de statut autorisées côté restaurant ───────
const TRANSITIONS = {
  en_attente:     [
    { statut: 'acceptée', label: 'Accepter',    Icon: Check,    classe: 'bg-green-500 hover:bg-green-600' },
    { statut: 'annulée',  label: 'Refuser',     Icon: XCircle,  classe: 'bg-red-500   hover:bg-red-600'   },
  ],
  acceptée: [
    { statut: 'en_préparation', label: 'Commencer',   Icon: ChefHat, classe: 'bg-indigo-500 hover:bg-indigo-600' },
  ],
  en_préparation: [
    { statut: 'prête', label: 'Marquer prête', Icon: Package, classe: 'bg-purple-500 hover:bg-purple-600' },
  ],
  prête: [
    { statut: 'en_livraison', label: 'Confier au livreur', Icon: Bike,  classe: 'bg-orange-500 hover:bg-orange-600' },
    { statut: 'livrée',       label: 'Marquer livrée',     Icon: Check, classe: 'bg-green-500  hover:bg-green-600'  },
  ],
  en_livraison: [
    { statut: 'livrée', label: 'Marquer livrée', Icon: Check, classe: 'bg-green-500 hover:bg-green-600' },
  ],
}

// ── Badge statut ─────────────────────────────────────────────
function BadgeStatut({ statut }) {
  const info = STATUTS_COMMANDE[statut] ?? { label: statut, couleur: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${info.couleur}`}>
      {info.couleurDot && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${info.couleurDot} mr-1.5 align-middle`} />
      )}
      {info.label}
    </span>
  )
}

// ── Modal de détail commande ─────────────────────────────────
function ModalCommande({ commande, onClose, onStatusChange, userId }) {
  const [envoi,         setEnvoi]         = useState(false)
  const [chatOuvert,    setChatOuvert]    = useState(false)
  const [confirmerAnnul, setConfirmerAnnul] = useState(false)
  const transitions = TRANSITIONS[commande.statut] ?? []
  const refCourte   = commande.id.slice(0, 8).toUpperCase()
  // L'annulation manuelle est disponible pour tout statut actif qui n'a pas déjà ce bouton
  const peutAnnuler = commande.statut !== 'annulée' && commande.statut !== 'livrée'
  const annulationDansTransitions = transitions.some(t => t.statut === 'annulée')

  const tempsPrep = Math.max(
    ...(commande.order_items ?? []).map(oi => oi.menu_item?.temps_preparation ?? 15),
    15
  )

  async function changerStatut(nouveauStatut) {
    setEnvoi(true)
    const { error } = await updateOrderStatus(commande.id, nouveauStatut)
    setEnvoi(false)
    if (error) {
      toast.error(`Erreur : ${error}`)
    } else {
      const infos = STATUTS_COMMANDE[nouveauStatut]
      toast.success(`Commande ${infos?.label?.toLowerCase() ?? nouveauStatut}`)
      onStatusChange(commande.id, nouveauStatut)
      if (nouveauStatut === 'annulée' || nouveauStatut === 'livrée') onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh]
                      overflow-y-auto shadow-2xl">
        {/* En-tête modal */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex
                        items-center justify-between z-10 rounded-t-3xl sm:rounded-t-3xl">
          <div>
            <p className="font-black text-gray-900 text-lg">Commande #{refCourte}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <BadgeStatut statut={commande.statut} />
              <span className="text-xs text-gray-400">
                {new Date(commande.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors min-h-[48px] min-w-[48px]
                       flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Infos client */}
          {commande.client && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Client</p>
                <p className="font-semibold text-gray-900">{commande.client.nom}</p>
              </div>
              {commande.client.telephone && (
                <a
                  href={`tel:${commande.client.telephone}`}
                  className="flex items-center gap-1.5 text-sm text-green-600 font-semibold
                             bg-green-50 px-3 py-2 rounded-xl min-h-[48px]"
                >
                  <Phone className="w-4 h-4" />
                  Appeler
                </a>
              )}
            </div>
          )}

          {/* Mode de récupération */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
            <span className="text-xl">{commande.type === 'livraison' ? '🛵' : '🏪'}</span>
            <div>
              <p className="text-xs text-gray-500">
                {commande.type === 'livraison' ? 'Livraison à domicile' : 'Retrait en boutique'}
              </p>
              {commande.type === 'livraison' && commande.adresse_livraison && (
                <p className="text-sm font-medium text-gray-800">
                  {commande.adresse_livraison.rue}, {commande.adresse_livraison.quartier}
                </p>
              )}
            </div>
          </div>

          {/* Articles */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Articles</p>
            <div className="space-y-2">
              {(commande.order_items ?? []).map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    <span className="font-bold text-gray-900">{item.quantite}×</span>{' '}
                    {item.menu_item?.nom ?? '—'}
                  </span>
                  <span className="font-semibold text-gray-800 tabular-nums shrink-0 ml-2">
                    {formatCurrency(item.sous_total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Temps de préparation estimé */}
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200
                          rounded-xl px-3 py-2.5">
            <span className="text-base">⏱</span>
            <div>
              <p className="text-xs text-orange-600 font-semibold">Temps de préparation estimé</p>
              <p className="text-sm font-bold text-orange-800">~{tempsPrep} min</p>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-black text-brand-500 text-lg tabular-nums">
              {formatCurrency(commande.montant_total + (commande.frais_livraison ?? 0))}
            </span>
          </div>

          {/* Mode paiement */}
          <p className="text-xs text-gray-400">
            Paiement : {commande.mode_paiement === 'cash' ? '💵 Espèces' : '📱 Mobile Money'}
          </p>

          {/* Notes client */}
          {commande.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-xs font-bold text-yellow-700 mb-1">📝 Instructions client</p>
              <p className="text-sm text-yellow-800">{commande.notes}</p>
            </div>
          )}

          {/* Boutons d'action — min-h-[48px] obligatoire */}
          {transitions.length > 0 && (
            <div className="space-y-3 pt-2">
              {transitions.map(({ statut, label, Icon, classe }) => (
                <button
                  key={statut}
                  onClick={() => changerStatut(statut)}
                  disabled={envoi}
                  className={`w-full min-h-[52px] flex items-center justify-center gap-2
                             text-white font-bold text-base rounded-xl ${classe}
                             disabled:opacity-60 active:scale-[0.98] transition-all`}
                >
                  {envoi
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Icon className="w-5 h-5" />
                  }
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Bouton chat client */}
          <button
            onClick={() => setChatOuvert(true)}
            className="w-full min-h-[48px] flex items-center justify-center gap-2
                       border border-gray-200 text-gray-700 font-semibold rounded-xl
                       hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-brand-500" />
            Messagerie client
          </button>

          {/* Annulation manuelle (pour statuts sans bouton "Refuser" direct) */}
          {peutAnnuler && !annulationDansTransitions && (
            confirmerAnnul ? (
              <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-red-700 text-center">
                  Confirmer l'annulation de cette commande ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmerAnnul(false)}
                    className="flex-1 min-h-[44px] border border-gray-200 rounded-xl text-gray-600
                               font-semibold text-sm hover:bg-gray-50 transition-colors"
                  >
                    Non, garder
                  </button>
                  <button
                    onClick={() => changerStatut('annulée')}
                    disabled={envoi}
                    className="flex-1 min-h-[44px] bg-red-500 text-white rounded-xl font-semibold
                               text-sm hover:bg-red-600 disabled:opacity-60 transition-colors
                               flex items-center justify-center gap-1.5"
                  >
                    {envoi
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <XCircle className="w-4 h-4" />
                    }
                    Oui, annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmerAnnul(true)}
                className="w-full min-h-[48px] flex items-center justify-center gap-2
                           border border-red-200 text-red-500 font-semibold rounded-xl
                           hover:bg-red-50 transition-colors text-sm"
              >
                <XCircle className="w-4 h-4" />
                Annuler la commande
              </button>
            )
          )}
        </div>
      </div>

      {/* Chat modal */}
      {chatOuvert && userId && (
        <ChatModal
          orderId={commande.id}
          monRole="restaurant"
          monId={userId}
          titreChat={`${commande.client?.nom ?? 'Client'} — #${refCourte}`}
          onClose={() => setChatOuvert(false)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Commandes restaurant
// ══════════════════════════════════════════════════════════
export default function RestaurantOrders() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()
  const { user } = useAuth()

  const [commandes,    setCommandes]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modalOuverte, setModalOuverte] = useState(null)
  const [nbNouveaux,   setNbNouveaux]   = useState(0)
  const [filtreStatut, setFiltreStatut] = useState('actives')

  // Titre original de l'onglet (pour restauration au démontage)
  const titreOriginal = useRef(document.title)

  // ── Chargement initial des commandes ───────────────────
  const charger = useCallback(async () => {
    if (!restaurant?.id) return
    setLoading(true)
    const { data, error } = await getOrdersByRestaurant(restaurant.id)
    if (error) toast.error('Impossible de charger les commandes')
    else       setCommandes(data)
    setLoading(false)
  }, [restaurant?.id])

  useEffect(() => { charger() }, [charger])

  // ── Abonnement Realtime ─────────────────────────────────
  useEffect(() => {
    if (!restaurant?.id) return

    // Activer l'audio dès que l'utilisateur interagit avec la page
    const activerAudio = () => resumeAudio()
    document.addEventListener('click', activerAudio, { once: true })

    const canal = supabase
      .channel(`restaurant_orders:${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Son + vibration déjà gérés par useRestaurantNotifications (RestaurantLayout)
            // → On gère seulement l'UI ici pour éviter le doublon
            setNbNouveaux(n => n + 1)

            // Récupérer la commande complète (avec les items)
            const { data: cmdComplete } = await supabase
              .from('orders')
              .select(`
                *,
                client:profiles!orders_client_id_fkey(nom, telephone),
                order_items(id, quantite, prix_unitaire, sous_total, menu_item:menu_items(nom))
              `)
              .eq('id', payload.new.id)
              .single()

            const nouvelleCmd = cmdComplete ?? payload.new

            setCommandes(prev => [nouvelleCmd, ...prev])
            // Ouvrir automatiquement la modal pour la nouvelle commande
            setModalOuverte(nouvelleCmd)

          } else if (payload.eventType === 'UPDATE') {
            setCommandes(prev =>
              prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
      document.removeEventListener('click', activerAudio)
    }
  }, [restaurant?.id])

  // ── Badge sur l'onglet navigateur ──────────────────────
  useEffect(() => {
    if (nbNouveaux > 0) {
      document.title = `(${nbNouveaux}) Nouvelles commandes — BrazzaEats`
    } else {
      document.title = titreOriginal.current
    }
    return () => { document.title = titreOriginal.current }
  }, [nbNouveaux])

  // ── Mise à jour locale du statut après action ──────────
  function handleStatusChange(commandeId, nouveauStatut) {
    setCommandes(prev =>
      prev.map(c => c.id === commandeId ? { ...c, statut: nouveauStatut } : c)
    )
  }

  // ── Filtrage des commandes selon l'onglet actif ─────────
  const commandesFiltrees = commandes.filter(c => {
    if (filtreStatut === 'actives')   return STATUTS_ACTIFS.includes(c.statut)
    if (filtreStatut === 'terminees') return c.statut === 'livrée' || c.statut === 'annulée'
    return true
  })

  const nbEnAttente = commandes.filter(c => c.statut === 'en_attente').length

  if (loadingResto || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-0 md:pt-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-gray-900">Commandes</h1>
            {nbEnAttente > 0 && (
              <p className="text-sm text-red-500 font-semibold mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping-slow inline-block" />
                {nbEnAttente} en attente de votre réponse
              </p>
            )}
          </div>
          <button
            onClick={() => { charger(); setNbNouveaux(0) }}
            className="text-brand-500 text-sm font-semibold px-3 py-2 hover:bg-brand-50 rounded-xl
                       transition-colors min-h-[48px]"
          >
            Actualiser
          </button>
        </div>

        {/* Onglets filtre */}
        <div className="flex border-b border-gray-100">
          {[
            { val: 'actives',   label: 'Actives',   count: commandes.filter(c => STATUTS_ACTIFS.includes(c.statut)).length },
            { val: 'terminees', label: 'Terminées', count: null },
          ].map(({ val, label, count }) => (
            <button
              key={val}
              onClick={() => setFiltreStatut(val)}
              className={`flex-1 pb-3 text-sm font-semibold flex items-center justify-center gap-1.5
                         transition-colors border-b-2
                         ${filtreStatut === val
                           ? 'border-brand-500 text-brand-600'
                           : 'border-transparent text-gray-400 hover:text-gray-600'
                         }`}
            >
              {label}
              {count != null && count > 0 && (
                <span className={`rounded-full text-xs px-1.5 py-0.5 font-bold
                  ${filtreStatut === val ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Liste commandes ─────────────────────────────── */}
      <main className="px-4 pt-4 space-y-3">
        {commandesFiltrees.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-gray-500">Aucune commande</p>
            <p className="text-sm mt-1">
              {filtreStatut === 'actives' ? 'Toutes les commandes sont traitées ✓' : 'L\'historique est vide'}
            </p>
          </div>
        ) : (
          commandesFiltrees.map(commande => {
            const refCourte    = commande.id.slice(0, 8).toUpperCase()
            const estEnAttente = commande.statut === 'en_attente'

            return (
              <div
                key={commande.id}
                className={`bg-white rounded-2xl shadow-card overflow-hidden
                  ${estEnAttente ? 'ring-2 ring-red-400' : ''}`}
              >
                {/* Bandeau urgence */}
                {estEnAttente && (
                  <div className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    NOUVELLE COMMANDE — Réponse requise
                  </div>
                )}

                <div className="p-4">
                  {/* Ligne 1 : ID + statut + heure */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-black text-gray-900">#{refCourte}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(commande.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <BadgeStatut statut={commande.statut} />
                  </div>

                  {/* Client + mode */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {commande.client?.nom ?? 'Client'}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-500">
                      {commande.type === 'livraison' ? '🛵 Livraison' : '🏪 Retrait'}
                    </span>
                  </div>

                  {/* Résumé articles */}
                  <p className="text-xs text-gray-500 line-clamp-1 mb-3">
                    {(commande.order_items ?? [])
                      .map(i => `${i.quantite}× ${i.menu_item?.nom ?? '?'}`)
                      .join(' · ')}
                  </p>

                  {/* Total + bouton détail */}
                  <div className="flex items-center justify-between">
                    <span className="font-black text-brand-500 tabular-nums">
                      {formatCurrency(commande.montant_total + (commande.frais_livraison ?? 0))}
                    </span>
                    <button
                      onClick={() => { setModalOuverte(commande); setNbNouveaux(0) }}
                      className={`min-h-[48px] px-4 rounded-xl font-bold text-sm flex items-center gap-1.5
                        transition-colors
                        ${estEnAttente
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {estEnAttente ? (
                        <>
                          <Check className="w-4 h-4" />
                          Répondre
                        </>
                      ) : 'Détails'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </main>

      {/* ── Modal détail commande ────────────────────────── */}
      {modalOuverte && (
        <ModalCommande
          commande={modalOuverte}
          onClose={() => setModalOuverte(null)}
          userId={user?.id}
          onStatusChange={(id, statut) => {
            handleStatusChange(id, statut)
            // Mettre à jour la commande dans la modal aussi
            setModalOuverte(prev => prev?.id === id ? { ...prev, statut } : prev)
          }}
        />
      )}
    </div>
  )
}
