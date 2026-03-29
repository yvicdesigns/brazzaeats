import { useState, useEffect } from 'react'
import { Star, Send, Loader2, MessageSquare, EyeOff, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { getReviews, replyToReview, toggleMasqueReview } from '@/services/menuService'

// ── Affichage étoiles ──────────────────────────────────────
function Etoiles({ note, taille = 'sm' }) {
  const classes = taille === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${classes} ${i <= note ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  )
}

// ── Répartition des notes (mini graphique barres) ──────────
function RepartitionNotes({ avis }) {
  const counts = [5, 4, 3, 2, 1].map(n => ({
    note:  n,
    count: avis.filter(a => a.note === n).length,
  }))
  const max = Math.max(...counts.map(c => c.count), 1)

  return (
    <div className="space-y-1.5">
      {counts.map(({ note, count }) => (
        <div key={note} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-4 text-right shrink-0">{note}</span>
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-5 shrink-0">{count}</span>
        </div>
      ))}
    </div>
  )
}

// ── Carte d'un avis ────────────────────────────────────────
function CarteAvis({ avis, onReply, onToggleMasque }) {
  const [texte,    setTexte]    = useState(avis.reponse_restaurant ?? '')
  const [editing,  setEditing]  = useState(!avis.reponse_restaurant)
  const [saving,   setSaving]   = useState(false)
  const [masquant, setMasquant] = useState(false)

  const dateAvis = new Date(avis.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  async function handleSend() {
    const reponse = texte.trim()
    if (!reponse) { toast.error('La réponse ne peut pas être vide'); return }
    setSaving(true)
    const { error } = await onReply(avis.id, reponse)
    setSaving(false)
    if (error) { toast.error('Erreur : ' + error); return }
    setEditing(false)
    toast.success('Réponse publiée')
  }

  async function handleToggleMasque() {
    setMasquant(true)
    await onToggleMasque(avis.id, !avis.masque)
    setMasquant(false)
  }

  return (
    <div className={`rounded-2xl shadow-card overflow-hidden ${avis.masque ? 'opacity-60' : 'bg-white'}`}>
      {/* Bandeau "masqué" */}
      {avis.masque && (
        <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
          <EyeOff className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs text-gray-500 font-medium">Avis masqué — invisible pour les clients</p>
        </div>
      )}

      <div className="bg-white p-4">
      {/* En-tête : client + note + date + bouton masquer */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center
                          text-brand-600 font-bold text-sm shrink-0">
            {(avis.client?.nom ?? '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">
              {avis.client?.nom ?? 'Client anonyme'}
            </p>
            <p className="text-xs text-gray-400">{dateAvis}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Etoiles note={avis.note} />
          <button
            onClick={handleToggleMasque}
            disabled={masquant}
            title={avis.masque ? 'Rendre visible' : 'Masquer cet avis'}
            className={`p-1.5 rounded-lg transition-colors ${
              avis.masque
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
            }`}
          >
            {masquant
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : avis.masque
                ? <Eye    className="w-4 h-4" />
                : <EyeOff className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Commentaire client */}
      {avis.commentaire && (
        <p className="text-sm text-gray-700 leading-relaxed mb-3">{avis.commentaire}</p>
      )}

      {/* Réponse du restaurant */}
      <div className="border-t border-gray-100 pt-3">
        {!editing && avis.reponse_restaurant
          ? (
            /* Réponse déjà publiée */
            <div className="bg-brand-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-brand-600 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Votre réponse
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{avis.reponse_restaurant}</p>
              <button
                onClick={() => setEditing(true)}
                className="mt-2 text-xs text-brand-500 hover:underline font-medium"
              >
                Modifier la réponse
              </button>
            </div>
          )
          : (
            /* Champ de saisie de réponse */
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                {avis.reponse_restaurant ? 'Modifier la réponse' : 'Répondre à cet avis'}
              </p>
              <textarea
                value={texte}
                onChange={e => setTexte(e.target.value)}
                placeholder="Merci pour votre avis ! Nous sommes ravis de…"
                maxLength={500}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                {avis.reponse_restaurant && (
                  <button
                    onClick={() => { setTexte(avis.reponse_restaurant); setEditing(false) }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Annuler
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={handleSend}
                  disabled={saving || !texte.trim()}
                  className="flex items-center gap-1.5 bg-brand-500 text-white text-xs font-bold
                             px-4 py-2 rounded-xl hover:bg-brand-600 transition-colors
                             disabled:opacity-50 min-h-[36px]"
                >
                  {saving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                  Publier
                </button>
              </div>
            </div>
          )
        }
      </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Avis
// ══════════════════════════════════════════════════════════
export default function Reviews() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()

  const [avis,    setAvis]    = useState([])
  const [loading, setLoading] = useState(true)

  // ── Chargement ─────────────────────────────────────────
  useEffect(() => {
    if (!restaurant?.id) return

    async function charger() {
      setLoading(true)
      const { data, error } = await getReviews(restaurant.id)
      if (error) toast.error('Impossible de charger les avis')
      else       setAvis(data ?? [])
      setLoading(false)
    }

    charger()
  }, [restaurant?.id])

  // ── Callback réponse ───────────────────────────────────
  async function handleReply(avisId, reponse) {
    const { data, error } = await replyToReview(avisId, reponse)
    if (!error) {
      setAvis(prev => prev.map(a => a.id === avisId ? { ...a, reponse_restaurant: data.reponse_restaurant } : a))
    }
    return { error }
  }

  // ── Callback masquer/afficher ──────────────────────────
  async function handleToggleMasque(avisId, masque) {
    const { error } = await toggleMasqueReview(avisId, masque)
    if (error) { toast.error('Erreur : ' + error); return }
    setAvis(prev => prev.map(a => a.id === avisId ? { ...a, masque } : a))
    toast.success(masque ? 'Avis masqué' : 'Avis rendu visible')
  }

  // ── KPIs agrégés ──────────────────────────────────────
  const nbAvis        = avis.length
  const noteMoyenne   = nbAvis > 0
    ? avis.reduce((s, a) => s + a.note, 0) / nbAvis
    : 0
  const nbSansReponse = avis.filter(a => !a.reponse_restaurant).length

  // ── Chargement ─────────────────────────────────────────
  if (loadingResto || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Réputation</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Avis clients</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {nbAvis} avis{nbAvis !== 1 ? '' : ''}
          {nbSansReponse > 0 && (
            <span className="ml-2 text-orange-500 font-semibold">
              · {nbSansReponse} sans réponse
            </span>
          )}
        </p>
      </header>

      <div className="px-4 pt-5 space-y-4">

        {/* ── Résumé statistiques ───────────────────────── */}
        {nbAvis > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex items-start gap-5">
              {/* Note globale */}
              <div className="text-center shrink-0">
                <p className="text-4xl font-black text-gray-900 tabular-nums">
                  {noteMoyenne.toFixed(1)}
                </p>
                <Etoiles note={Math.round(noteMoyenne)} taille="lg" />
                <p className="text-xs text-gray-400 mt-1">{nbAvis} avis</p>
              </div>

              {/* Répartition */}
              <div className="flex-1 min-w-0">
                <RepartitionNotes avis={avis} />
              </div>
            </div>
          </div>
        )}

        {/* ── Liste des avis ────────────────────────────── */}
        {avis.length === 0
          ? (
            <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
              <Star className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-600">Aucun avis pour l'instant</p>
              <p className="text-sm mt-1">Les avis de vos clients apparaîtront ici.</p>
            </div>
          )
          : avis.map(a => (
            <CarteAvis key={a.id} avis={a} onReply={handleReply} onToggleMasque={handleToggleMasque} />
          ))
        }
      </div>
    </div>
  )
}
