import { useState, useEffect, useCallback, useRef } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { X, Loader2, Phone, Minus, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/supabase/client'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { getOrdersByRestaurant, updateMenuItem } from '@/services/menuService'
import ChoixMotifRefus from '@/components/restaurant/ChoixMotifRefus'
import { updateOrderStatus } from '@/services/orderService'
import { getPlatformSettings } from '@/services/adminService'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'
import { enfiler, estErreurReseau } from '@/utils/offlineQueue'
import { tempsPreparationParDefaut } from '@/hooks/useRestaurantNotifications'
import LienCarte from '@/components/shared/LienCarte'
import ModalVenteComptoir from '@/components/restaurant/ModalVenteComptoir'

// ── Étapes du service (onglets sur téléphone/tablette, colonnes sur ordinateur) ──
const ETAPES = [
  { id: 'nouvelles',  label: 'Nouvelles',    statuts: ['en_attente'] },
  { id: 'cuisine',    label: 'En cuisine',   statuts: ['acceptée', 'en_préparation'] },
  { id: 'pretes',     label: 'Prêtes',       statuts: ['prête'] },
  { id: 'livraison',  label: 'En livraison', statuts: ['en_livraison'] },
]
const ETAPE_TERMINEES = { id: 'terminees', label: 'Terminées', statuts: ['livrée', 'annulée'] }

const refCourte = (c) => c.id.slice(0, 6).toUpperCase()
const minutesDepuis = (iso, maintenant) => Math.max(0, Math.floor((maintenant - new Date(iso).getTime()) / 60000))
const duree = (min) => min < 60 ? `${min} min` : min < 1440 ? `${Math.floor(min / 60)} h` : `${Math.floor(min / 1440)} j`
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const totalPlats = (c) => (c.montant_total ?? 0) - (c.frais_livraison ?? 0)
const resumeArticles = (c) => (c.order_items ?? []).map(i => `${i.quantite} × ${i.menu_item?.nom ?? '?'}`).join(', ')

/**
 * Prochaine étape « en un geste » d'une commande, telle qu'affichée sur sa carte.
 * Quand la livraison est gérée par un acteur externe (livreurs indépendants ou
 * Zando Delivery), le restaurant ne marque jamais lui-même « livrée » une
 * commande à livrer : c'est le livreur qui confirme la remise.
 */
function actionSuivante(c, livraisonExterne) {
  switch (c.statut) {
    case 'acceptée':       return { statut: 'en_préparation', label: 'Commencer' }
    case 'en_préparation': return { statut: 'prête', label: 'Marquer prête' }
    case 'prête':
      if (c.type === 'retrait') return { statut: 'livrée', label: 'Remise au client' }
      return livraisonExterne ? null : { statut: 'livrée', label: 'Marquer livrée' }
    default: return null
  }
}

// ── Carte d'une commande ─────────────────────────────────────
function CarteCommande({ commande, maintenant, livraisonExterne, onOuvrir, onAction, actionEnCours }) {
  const ecoule = minutesDepuis(commande.created_at, maintenant)
  const prevu  = commande.temps_preparation_minutes
  const enCuisine = ['acceptée', 'en_préparation'].includes(commande.statut)
  const enRetard  = enCuisine && prevu != null && ecoule > prevu
  const action = actionSuivante(commande, livraisonExterne)
  const estNouvelle = commande.statut === 'en_attente'

  return (
    <article className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 ${enRetard ? 'border-terracotta-200' : 'border-gray-200'}`}>
      <button type="button" onClick={() => onOuvrir(commande)} className="text-left flex flex-col gap-2.5">
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-base font-extrabold text-gray-900">#{refCourte(commande)}</span>
          {estNouvelle ? (
            <span className="text-sm font-extrabold text-terracotta-700">il y a {duree(ecoule)}</span>
          ) : enCuisine && prevu != null ? (
            <span className={`text-sm font-bold tabular-nums ${enRetard ? 'text-terracotta-700 font-extrabold' : 'text-gray-500'}`}>
              {ecoule} / {prevu} min{enRetard ? ' · en retard' : ''}
            </span>
          ) : (
            <span className="text-sm font-bold text-gray-500">{heure(commande.created_at)}</span>
          )}
        </div>
        <span className="text-[13px] font-semibold text-gray-500 -mt-1.5">
          {commande.client?.nom ?? 'Client'} · {commande.type === 'retrait' ? 'Retrait' : 'Livraison'} · {commande.mode_paiement === 'cash' ? 'Espèces' : 'Mobile Money'}
        </span>
        {enCuisine && prevu != null && (
          <span className="h-1 rounded-full bg-gray-100 overflow-hidden block">
            <span className={`block h-1 ${enRetard ? 'bg-terracotta-500' : 'bg-brand-400'}`}
                  style={{ width: `${Math.min(100, Math.round((ecoule / prevu) * 100))}%` }} />
          </span>
        )}
        <p className="text-[15px] font-semibold text-gray-900 leading-relaxed">{resumeArticles(commande)}</p>
        {commande.notes && <p className="text-sm font-semibold text-gray-600">Note : « {commande.notes} »</p>}
      </button>

      {estNouvelle && (
        <button type="button" onClick={() => onOuvrir(commande)}
                className="h-12 rounded-xl bg-brand-500 text-white font-bold text-[15px] active:scale-[0.98] transition-transform">
          Répondre
        </button>
      )}
      {action && (
        <button type="button" onClick={() => onAction(commande, action.statut)} disabled={actionEnCours === commande.id}
                className="h-11 rounded-xl border border-gray-200 text-brand-500 font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
          {actionEnCours === commande.id && <Loader2 className="w-4 h-4 animate-spin" />}
          {action.label}
        </button>
      )}
      {commande.statut === 'prête' && !action && (
        <p className="text-[13px] font-semibold text-gray-500">En attente d'un livreur — il confirmera la remise.</p>
      )}
      {commande.statut === 'annulée' && (
        <p className="text-[13px] font-bold text-terracotta-700">Annulée{commande.motif_refus ? ` · ${commande.motif_refus}` : ''}</p>
      )}
    </article>
  )
}

// ── Détail d'une commande ────────────────────────────────────
function ModalCommande({ commande, onClose, onStatusChange, livraisonExterne }) {
  const [envoi, setEnvoi] = useState(false)
  const [confirmerAnnul, setConfirmerAnnul] = useState(false)
  const [minutes, setMinutes] = useState(commande.temps_preparation_minutes ?? tempsPreparationParDefaut(commande))

  const estNouvelle = commande.statut === 'en_attente'
  const action = actionSuivante(commande, livraisonExterne)
  // Comme avant : le restaurant peut toujours confirmer une livraison en cours
  const peutMarquerLivree = commande.statut === 'en_livraison'
  const peutAnnuler = !['annulée', 'livrée'].includes(commande.statut)
  const fraisLivraison = commande.frais_livraison ?? 0

  async function changerStatut(nouveauStatut, motif = null, platEnRupture = null) {
    setEnvoi(true)
    const champsSupplementaires = nouveauStatut === 'acceptée' ? { temps_preparation_minutes: minutes }
      : motif ? { motif_refus: motif } : {}
    if (platEnRupture) updateMenuItem(platEnRupture, { disponible: false })
    const { error } = await updateOrderStatus(commande.id, nouveauStatut, champsSupplementaires)
    setEnvoi(false)

    // Transition idempotente sur une commande du restaurant : rejouable sans risque
    if (error && estErreurReseau(error)) {
      enfiler('updateOrderStatus', { orderId: commande.id, statut: nouveauStatut, champsSupplementaires })
      toast.success('Hors-ligne — sera synchronisé automatiquement')
      onStatusChange(commande.id, nouveauStatut, champsSupplementaires)
      onClose()
      return
    }
    if (error) { toast.error(`Erreur : ${error}`); return }
    toast.success(`Commande ${STATUTS_COMMANDE[nouveauStatut]?.label?.toLowerCase() ?? nouveauStatut}`)
    onStatusChange(commande.id, nouveauStatut, champsSupplementaires)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-end sm:items-center justify-center"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="detail-titre"
           className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">

        <header className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-gray-100">
          <div>
            <h2 id="detail-titre" className="text-lg font-extrabold text-gray-900">Commande #{refCourte(commande)}</h2>
            <p className="text-[13px] font-bold text-gray-500 mt-0.5">
              {STATUTS_COMMANDE[commande.statut]?.label ?? commande.statut} · reçue à {heure(commande.created_at)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -mr-2 -mt-1 rounded-full flex items-center justify-center hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 divide-y divide-gray-100">
          <section className="py-4 flex flex-col gap-2">
            <h3 className="text-[13px] font-bold text-gray-500">Articles</h3>
            {(commande.order_items ?? []).map((item, i) => (
              <div key={item.id ?? i} className="flex justify-between gap-3 text-[15px]">
                <span className="font-semibold text-gray-900"><span className="font-extrabold">{item.quantite} ×</span> {item.menu_item?.nom ?? '—'}</span>
                <span className="font-bold text-gray-700 tabular-nums shrink-0">{formatCurrency(item.sous_total)}</span>
              </div>
            ))}
            {commande.notes && (
              <p className="mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm font-semibold text-gray-700">Note du client : « {commande.notes} »</p>
            )}
          </section>

          <section className="py-4 flex flex-col gap-2">
            <h3 className="text-[13px] font-bold text-gray-500">Client</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-gray-900">{commande.client?.nom ?? 'Client'}</p>
                {commande.client?.telephone && <p className="text-sm font-semibold text-gray-500">{commande.client.telephone}</p>}
              </div>
              {commande.client?.telephone && (
                <a href={`tel:${commande.client.telephone}`}
                   className="h-11 px-4 rounded-xl border border-gray-200 flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Phone className="w-4 h-4" /> Appeler
                </a>
              )}
            </div>
            {commande.type === 'livraison' && commande.adresse_livraison ? (
              <div className="text-sm font-semibold text-gray-700">
                Livraison : {commande.adresse_livraison.rue}, {commande.adresse_livraison.quartier}
                <LienCarte adresseLivraison={commande.adresse_livraison} className="mt-0.5" />
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-700">Retrait sur place</p>
            )}
          </section>

          <section className="py-4 flex flex-col gap-2">
            <h3 className="text-[13px] font-bold text-gray-500">
              Paiement · {commande.mode_paiement === 'cash' ? 'Espèces' : `Mobile Money ${commande.operateur_paiement ?? ''}`}
            </h3>
            {commande.mode_paiement === 'mobile_money' && (
              commande.preuve_paiement_url ? (
                <a href={commande.preuve_paiement_url} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                  <img src={commande.preuve_paiement_url} alt="Preuve de paiement envoyée par le client"
                       className="h-16 w-16 object-cover rounded-xl border border-gray-200" />
                  <span className="text-sm font-bold text-brand-500">Voir la preuve en grand</span>
                </a>
              ) : (
                <p className="text-sm font-bold text-amber-800 bg-amber-50 rounded-xl px-3 py-2">Aucune preuve de paiement envoyée</p>
              )
            )}
            <div className="flex justify-between text-base font-extrabold pt-1">
              <span>Pour le restaurant</span>
              <span className="tabular-nums">{formatCurrency(totalPlats(commande))}</span>
            </div>
            {fraisLivraison > 0 && (
              <p className="text-[13px] font-semibold text-gray-500">Frais de livraison ({formatCurrency(fraisLivraison)}) : pour le livreur.</p>
            )}
          </section>

          {estNouvelle && (
            <section className="py-4 flex items-center justify-between">
              <span className="text-[15px] font-bold text-gray-900">Prête dans</span>
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label="Moins 5 minutes" onClick={() => setMinutes(m => Math.max(5, m - 5))}
                        className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                <span className="min-w-[70px] text-center text-lg font-extrabold tabular-nums">{minutes} min</span>
                <button type="button" aria-label="Plus 5 minutes" onClick={() => setMinutes(m => Math.min(120, m + 5))}
                        className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
              </div>
            </section>
          )}
          {!estNouvelle && commande.temps_preparation_minutes != null && (
            <p className="py-4 text-sm font-semibold text-gray-600">Délai annoncé au client : {commande.temps_preparation_minutes} min</p>
          )}
        </div>

        <footer className="px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-gray-100 flex flex-col gap-2">
          {confirmerAnnul ? (
            <ChoixMotifRefus
              commande={commande}
              titre={estNouvelle ? 'Pourquoi refuser cette commande ?' : 'Pourquoi annuler cette commande ?'}
              envoi={envoi}
              onRetour={() => setConfirmerAnnul(false)}
              onConfirmer={(motif, platId) => changerStatut('annulée', motif, platId)}
            />
          ) : estNouvelle ? (
            <div className="grid grid-cols-[1fr_1.6fr] gap-2.5">
              <button onClick={() => setConfirmerAnnul(true)} disabled={envoi}
                      className="h-[52px] rounded-xl border border-gray-200 font-bold text-gray-900">Refuser</button>
              <button onClick={() => changerStatut('acceptée')} disabled={envoi}
                      className="h-[52px] rounded-xl bg-brand-500 text-white font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
                {envoi && <Loader2 className="w-4 h-4 animate-spin" />}
                Accepter
              </button>
            </div>
          ) : (
            <>
              {(action || peutMarquerLivree) && (
                <button onClick={() => changerStatut(action?.statut ?? 'livrée')} disabled={envoi}
                        className="h-[52px] rounded-xl bg-brand-500 text-white font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
                  {envoi && <Loader2 className="w-4 h-4 animate-spin" />}
                  {action?.label ?? 'Marquer livrée'}
                </button>
              )}
              {peutAnnuler && (
                <button onClick={() => setConfirmerAnnul(true)} className="h-10 text-sm font-bold text-terracotta-700">
                  Annuler la commande
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Commandes restaurant
// ══════════════════════════════════════════════════════════
export default function RestaurantOrders() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()
  const { pause, ouvrirPause } = useOutletContext() ?? {}

  const [commandes,    setCommandes]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modalOuverte, setModalOuverte] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [etape,        setEtape]        = useState('nouvelles')
  const [voirTerminees, setVoirTerminees] = useState(false)
  const [actionEnCours, setActionEnCours] = useState(null)
  const [maintenant,   setMaintenant]   = useState(Date.now())
  const [modeLivraisonPlateforme, setModeLivraisonPlateforme] = useState('independants')
  const [venteComptoirOuverte, setVenteComptoirOuverte] = useState(false)

  const titreOriginal = useRef(document.title)

  // Les durées « il y a X min » avancent toutes seules
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const charger = useCallback(async () => {
    if (!restaurant?.id) return
    setLoading(true)
    const { data, error } = await getOrdersByRestaurant(restaurant.id)
    if (error) toast.error('Impossible de charger les commandes')
    else       setCommandes(data)
    setLoading(false)
  }, [restaurant?.id])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    getPlatformSettings().then(({ data }) => {
      setModeLivraisonPlateforme(data?.mode_livraison ?? 'independants')
    })
  }, [])

  // restaurant.mode_livraison a priorité sur le réglage plateforme quand il est défini
  const modeLivraisonEffectif = restaurant?.mode_livraison || modeLivraisonPlateforme
  const livraisonExterne = modeLivraisonEffectif === 'independants' || modeLivraisonEffectif === 'zando_delivery'

  // ── Temps réel ──────────────────────────────────────────
  useEffect(() => {
    if (!restaurant?.id) return
    const canal = supabase
      .channel(`restaurant_orders:${restaurant.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Le son et l'accusé de réception sont gérés par l'alarme plein écran (RestaurantLayout)
            const { data: cmdComplete } = await supabase
              .from('orders')
              .select(`
                *,
                client:profiles!orders_client_id_fkey(nom, telephone),
                order_items(id, quantite, prix_unitaire, sous_total, menu_item:menu_items(id, nom, temps_preparation))
              `)
              .eq('id', payload.new.id)
              .single()
            setCommandes(prev => prev.some(c => c.id === payload.new.id) ? prev : [cmdComplete ?? payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setCommandes(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c))
          }
        })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [restaurant?.id])

  // Lien « Voir dans Nouvelles » de l'écran plein : ouvre directement cette colonne
  useEffect(() => {
    const demandee = searchParams.get('etape')
    if (!demandee) return
    setEtape(demandee)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  // Titre de l'onglet = nombre de commandes qui attendent encore une réponse
  const nbNouveaux = commandes.filter(c => c.statut === 'en_attente').length
  useEffect(() => {
    document.title = nbNouveaux > 0 ? `(${nbNouveaux}) Nouvelles commandes — Zandofood` : titreOriginal.current
    return () => { document.title = titreOriginal.current }
  }, [nbNouveaux])

  function appliquerLocalement(commandeId, statut, champs = {}) {
    setCommandes(prev => prev.map(c => c.id === commandeId ? { ...c, statut, ...champs } : c))
  }

  // Action « en un geste » depuis une carte (Commencer, Marquer prête, Remise…)
  async function actionRapide(commande, statut) {
    setActionEnCours(commande.id)
    const { error } = await updateOrderStatus(commande.id, statut)
    setActionEnCours(null)
    if (error && estErreurReseau(error)) {
      enfiler('updateOrderStatus', { orderId: commande.id, statut, champsSupplementaires: {} })
      toast.success('Hors-ligne — sera synchronisé automatiquement')
      appliquerLocalement(commande.id, statut)
      return
    }
    if (error) { toast.error(`Erreur : ${error}`); return }
    appliquerLocalement(commande.id, statut)
  }

  const commandesDe = (e) => commandes.filter(c => e.statuts.includes(c.statut))
  const ouvrir = (c) => setModalOuverte(c)

  if (loadingResto || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  const etapeActive = [...ETAPES, ETAPE_TERMINEES].find(e => e.id === etape) ?? ETAPES[0]
  const carte = (c) => (
    <CarteCommande key={c.id} commande={c} maintenant={maintenant} livraisonExterne={livraisonExterne}
                   onOuvrir={ouvrir} onAction={actionRapide} actionEnCours={actionEnCours} />
  )
  const vide = (texte) => <p className="text-sm font-semibold text-gray-500 text-center py-10">{texte}</p>

  return (
    <div className="min-h-screen bg-white">

      <header className="px-5 lg:px-8 pt-12 md:pt-8 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between gap-3 mb-3 lg:mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Commandes</h1>
          <div className="flex items-center gap-2">
            {!pause && ouvrirPause && (
              <div className="hidden lg:flex h-10 pl-3.5 pr-1.5 rounded-xl border border-gray-200 items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-brand-400" />
                <span className="text-sm font-bold">Ouvert</span>
                <button onClick={ouvrirPause} className="h-[30px] px-2.5 rounded-lg bg-gray-100 text-[13px] font-bold">Pause</button>
              </div>
            )}
            <button onClick={() => setVoirTerminees(v => !v)}
                    className={`hidden lg:flex h-10 px-3.5 rounded-xl border text-sm font-bold items-center
                                ${voirTerminees ? 'border-brand-500 text-brand-500 bg-brand-50/60' : 'border-gray-200 text-gray-900'}`}>
              Terminées
            </button>
            <button onClick={() => setVenteComptoirOuverte(true)}
                    className="h-10 px-3.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 lg:bg-brand-500 lg:text-white lg:border-brand-500">
              Vente comptoir
            </button>
          </div>
        </div>

        {/* Onglets par étape — téléphone et tablette */}
        <div role="tablist" aria-label="Étapes" className="lg:hidden flex gap-6 overflow-x-auto -mb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[...ETAPES, ETAPE_TERMINEES].map(e => {
            const n = e.id === 'terminees' ? null : commandesDe(e).length
            const actif = etape === e.id
            return (
              <button key={e.id} role="tab" aria-selected={actif} onClick={() => setEtape(e.id)}
                      className={`h-11 shrink-0 border-b-2 text-sm flex items-center gap-1.5 whitespace-nowrap
                                  ${actif ? 'border-brand-500 text-brand-500 font-extrabold' : 'border-transparent text-gray-500 font-bold'}`}>
                {e.label}
                {n > 0 && (
                  <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs flex items-center justify-center
                                    ${e.id === 'nouvelles' ? 'bg-terracotta-50 text-terracotta-700' : 'text-gray-500'}`}>{n}</span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* Téléphone et tablette : une étape à la fois */}
      <main className="lg:hidden px-5 py-4 bg-gray-50/60 min-h-[60vh] flex flex-col gap-3 md:grid md:grid-cols-2 md:items-start">
        {commandesDe(etapeActive).length === 0
          ? <div className="md:col-span-2">{vide(etape === 'nouvelles' ? 'Aucune nouvelle commande pour le moment.' : 'Rien à cette étape.')}</div>
          : commandesDe(etapeActive).map(carte)}
      </main>

      {/* Ordinateur : toutes les étapes en colonnes */}
      <main className="hidden lg:grid px-8 py-6 bg-gray-50/60 min-h-[calc(100vh-110px)] gap-5 items-start"
            style={{ gridTemplateColumns: `repeat(${voirTerminees ? 5 : 4}, minmax(0, 1fr))` }}>
        {[...ETAPES, ...(voirTerminees ? [ETAPE_TERMINEES] : [])].map(e => {
          const liste = commandesDe(e)
          return (
            <section key={e.id} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                {e.label}
                <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-xs flex items-center justify-center
                                  ${e.id === 'nouvelles' && liste.length ? 'bg-terracotta-50 text-terracotta-700' : 'text-gray-500'}`}>
                  {liste.length}
                </span>
              </h2>
              {liste.length === 0 ? vide('Rien ici.') : liste.map(carte)}
            </section>
          )
        })}
      </main>

      {modalOuverte && (
        <ModalCommande
          commande={commandes.find(c => c.id === modalOuverte.id) ?? modalOuverte}
          onClose={() => setModalOuverte(null)}
          livraisonExterne={livraisonExterne}
          onStatusChange={appliquerLocalement}
        />
      )}

      {venteComptoirOuverte && (
        <ModalVenteComptoir restaurantId={restaurant.id} onClose={() => setVenteComptoirOuverte(false)} />
      )}
    </div>
  )
}
