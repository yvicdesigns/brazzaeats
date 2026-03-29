import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Star, Loader2, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { getOrdersByClient, submitReview } from '@/services/orderService'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'

// ── Composant sélecteur d'étoiles ──────────────────────────
function Etoiles({ valeur, onChange, readonly = false }) {
  const [survol, setSurvol] = useState(0)

  return (
    <div className="flex gap-1" aria-label={`Note : ${valeur} sur 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(n)}
          onMouseEnter={() => !readonly && setSurvol(n)}
          onMouseLeave={() => !readonly && setSurvol(0)}
          className={`text-2xl transition-transform ${!readonly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          <span className={n <= (survol || valeur) ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Formulaire d'avis inline ───────────────────────────────
function FormulaireAvis({ orderId, restaurantId, clientId, onSuccess }) {
  const [note,       setNote]       = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [envoi,      setEnvoi]      = useState(false)

  async function soumettre(e) {
    e.preventDefault()
    if (note === 0) {
      toast.error('Veuillez sélectionner une note')
      return
    }
    setEnvoi(true)
    const { error } = await submitReview({
      clientId,
      restaurantId,
      orderId,
      note,
      commentaire: commentaire.trim() || null,
    })
    setEnvoi(false)

    if (error) {
      toast.error('Impossible d\'envoyer l\'avis')
    } else {
      toast.success('Merci pour votre avis ! 🙏')
      onSuccess({ note, commentaire })
    }
  }

  return (
    <form
      onSubmit={soumettre}
      onClick={e => e.stopPropagation()} // Évite la navigation vers Tracking
      className="mt-3 pt-3 border-t border-gray-100 space-y-3"
    >
      <p className="text-sm font-semibold text-gray-700">Laisser un avis</p>

      {/* Étoiles */}
      <Etoiles valeur={note} onChange={setNote} />

      {/* Commentaire */}
      <textarea
        value={commentaire}
        onChange={e => setCommentaire(e.target.value)}
        placeholder="Partagez votre expérience (optionnel)…"
        rows={2}
        maxLength={500}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                   resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
      />

      <button
        type="submit"
        disabled={envoi || note === 0}
        className="flex items-center gap-2 bg-brand-500 text-white text-sm font-semibold
                   px-4 py-2.5 rounded-xl hover:bg-brand-600 disabled:opacity-50
                   active:scale-95 transition-all"
      >
        {envoi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {envoi ? 'Envoi…' : 'Envoyer l\'avis'}
      </button>
    </form>
  )
}

// ── Affichage d'un avis existant ───────────────────────────
function AvisExistant({ avis }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs text-gray-400 mb-1">Votre avis</p>
      <Etoiles valeur={avis.note} readonly />
      {avis.commentaire && (
        <p className="text-sm text-gray-600 mt-1 italic">"{avis.commentaire}"</p>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Historique des commandes
// ══════════════════════════════════════════════════════════
export default function Orders() {
  const { user } = useAuth()

  const [commandes, setCommandes] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [erreur,    setErreur]    = useState(null)

  // Gère l'ouverture du formulaire d'avis par ID de commande
  const [formulaireOuvert, setFormulaireOuvert] = useState(null)

  // ── Chargement des commandes ────────────────────────────
  useEffect(() => {
    if (!user) return

    async function charger() {
      setLoading(true)
      const { data, error } = await getOrdersByClient(user.id)
      if (error) setErreur(error)
      else       setCommandes(data)
      setLoading(false)
    }

    charger()
  }, [user])

  // ── Mise à jour locale après soumission d'un avis ──────
  function marquerAvisEnvoye(orderId, avis) {
    setCommandes(prev =>
      prev.map(c =>
        c.id === orderId
          ? { ...c, reviews: [avis] }
          : c
      )
    )
    setFormulaireOuvert(null)
  }

  // ── États de la page ────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center pb-20">
        <p className="text-5xl mb-4">🔐</p>
        <p className="font-bold text-gray-800 mb-4">Connexion requise</p>
        <Link to="/login" className="bg-brand-500 text-white font-bold py-3 px-8 rounded-xl">
          Se connecter
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <h1 className="font-bold text-gray-900 text-xl">Mes commandes</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {commandes.length} commande{commandes.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* ── Liste vide ──────────────────────────────────── */}
      {commandes.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <p className="text-5xl mb-4">📋</p>
          <p className="font-semibold text-gray-600 text-lg mb-2">Aucune commande</p>
          <p className="text-sm text-gray-400 mb-6">
            Votre historique de commandes apparaîtra ici
          </p>
          <Link
            to="/"
            className="bg-brand-500 text-white font-bold py-3 px-8 rounded-xl"
          >
            Commander maintenant
          </Link>
        </div>
      )}

      {/* ── Liste des commandes ─────────────────────────── */}
      <main className="px-4 pt-4 space-y-3">
        {commandes.map(commande => {
          const infosStatut   = STATUTS_COMMANDE[commande.statut]
          const livree        = commande.statut === 'livrée'
          const avisPose      = (commande.reviews ?? []).length > 0
          const avis          = commande.reviews?.[0]
          const formulaireIci = formulaireOuvert === commande.id

          // Résumé des articles pour l'affichage condensé
          const resumeArticles = (commande.order_items ?? [])
            .map(oi => `${oi.quantite}× ${oi.menu_item?.nom ?? '—'}`)
            .join(', ')

          // Date relative (ex: "il y a 2 jours")
          const dateRelative = formatDistanceToNow(
            new Date(commande.created_at),
            { addSuffix: true, locale: fr }
          )

          return (
            <div key={commande.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
              {/* ── Partie cliquable → suivi ──────────── */}
              <Link
                to={`/suivi/${commande.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Ligne 1 : restaurant + statut */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Logo restaurant */}
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {commande.restaurant?.logo_url ? (
                        <img
                          src={commande.restaurant.logo_url}
                          alt={commande.restaurant.nom}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {commande.restaurant?.nom ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{dateRelative}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${infosStatut?.couleur}`}>
                      {infosStatut?.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Ligne 2 : articles */}
                {resumeArticles && (
                  <p className="text-xs text-gray-500 mt-2.5 line-clamp-1">
                    {resumeArticles}
                  </p>
                )}

                {/* Ligne 3 : total + mode paiement */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-gray-800 tabular-nums">
                    {formatCurrency(commande.montant_total + commande.frais_livraison)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {commande.mode_paiement === 'cash' ? '💵 Espèces' : '📱 Mobile Money'}
                  </span>
                </div>
              </Link>

              {/* ── Zone avis (hors du Link) ──────────── */}
              {livree && (
                <div className="px-4 pb-4">
                  {avisPose ? (
                    /* Avis déjà soumis */
                    <AvisExistant avis={avis} />
                  ) : formulaireIci ? (
                    /* Formulaire ouvert */
                    <FormulaireAvis
                      orderId={commande.id}
                      restaurantId={commande.restaurant_id}
                      clientId={user.id}
                      onSuccess={avisData => marquerAvisEnvoye(commande.id, avisData)}
                    />
                  ) : (
                    /* Bouton pour ouvrir le formulaire */
                    <button
                      onClick={() => setFormulaireOuvert(commande.id)}
                      className="mt-1 flex items-center gap-1.5 text-brand-500 text-sm font-semibold
                                 hover:text-brand-600 transition-colors"
                    >
                      <Star className="w-4 h-4 fill-current" />
                      Laisser un avis
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
