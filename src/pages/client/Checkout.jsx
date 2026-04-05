import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, MapPin, Check, Loader2, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import useCart, { useCartTempsPrep } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import { createOrder } from '@/services/orderService'
import { validatePromoCode } from '@/services/promotionService'
import { formatCurrency } from '@/utils/formatCurrency'
import { QUARTIERS_BRAZZAVILLE, TARIFS } from '@/utils/constants'

// ── Validation Zod ─────────────────────────────────────────
const schema = z
  .object({
    type:         z.enum(['livraison', 'retrait']),
    rue:          z.string().optional(),
    quartier:     z.string().optional(),
    indication:   z.string().optional(),
    modePaiement: z.enum(['cash', 'mobile_money']),
    operateur:    z.string().optional(),
    telephone:    z.string().optional(),
    notes:        z.string().optional(),
  })
  .refine(
    d => d.type !== 'livraison' || (d.rue && d.rue.trim().length >= 4 && d.quartier),
    { message: 'Rue et quartier requis pour la livraison', path: ['rue'] }
  )
  .refine(
    d => d.modePaiement !== 'mobile_money' || (d.operateur && d.telephone && d.telephone.replace(/\s/g, '').length >= 9),
    { message: 'Numéro requis pour Mobile Money', path: ['telephone'] }
  )

// ══════════════════════════════════════════════════════════
// Modal paiement Mobile Money (simulation MTN / Airtel)
// ══════════════════════════════════════════════════════════
function ModalMobileMoney({ operateur, montant, telephone, onSuccess, onClose }) {
  const [etape, setEtape] = useState('saisie') // 'saisie' | 'traitement' | 'succes'

  const isMTN    = operateur === 'MTN'
  const couleur  = isMTN ? 'bg-yellow-400' : 'bg-red-500'
  const nomOp    = isMTN ? 'MTN Mobile Money' : 'Airtel Money'
  const telAff   = telephone?.replace(/\s/g, '').replace(/(.{2})(?=.)/g, '$1 ')

  async function confirmer() {
    setEtape('traitement')
    await new Promise(r => setTimeout(r, 3000)) // Simulation 3 secondes
    setEtape('succes')
    setTimeout(onSuccess, 1800) // Redirection automatique
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden
                      shadow-2xl">
        {/* Header opérateur */}
        <div className={`${couleur} px-6 py-5 text-center`}>
          <p className="text-2xl font-black text-white tracking-wide">{nomOp}</p>
          {etape === 'saisie' && (
            <p className="text-white/80 text-xs mt-1">Paiement sécurisé</p>
          )}
        </div>

        {/* ── Écran de confirmation ────────────────────── */}
        {etape === 'saisie' && (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Montant à payer</p>
              <p className="text-4xl font-black text-gray-900 tabular-nums">
                {formatCurrency(montant)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Numéro {operateur}</p>
              <p className="font-bold text-gray-800 text-xl tracking-widest">
                +242 {telAff}
              </p>
            </div>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              En confirmant, vous autorisez le débit de votre compte {operateur}.
              Un SMS de confirmation vous sera envoyé.
            </p>

            <button
              onClick={confirmer}
              className={`w-full py-4 rounded-xl font-bold text-base text-white transition-colors
                ${isMTN ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-red-500 hover:bg-red-600'}`}
            >
              Confirmer le paiement
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 text-gray-500 text-sm font-medium hover:text-gray-700"
            >
              Annuler
            </button>
          </div>
        )}

        {/* ── Traitement en cours ──────────────────────── */}
        {etape === 'traitement' && (
          <div className="p-12 flex flex-col items-center gap-6">
            <Loader2 className="w-16 h-16 text-brand-500 animate-spin" strokeWidth={1.5} />
            <div className="text-center">
              <p className="font-bold text-gray-900 text-lg">Traitement en cours</p>
              <p className="text-sm text-gray-500 mt-1">
                Connexion au réseau {operateur}…
              </p>
            </div>
          </div>
        )}

        {/* ── Paiement confirmé ───────────────────────── */}
        {etape === 'succes' && (
          <div className="p-12 flex flex-col items-center gap-5">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center
                            ring-8 ring-green-50">
              <Check className="w-10 h-10 text-green-600" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <p className="font-black text-green-700 text-2xl">Paiement confirmé !</p>
              <p className="text-sm text-gray-500 mt-2">
                {formatCurrency(montant)} débités de votre compte {operateur}
              </p>
              <p className="text-xs text-gray-400 mt-1">Redirection en cours…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Checkout principale
// ══════════════════════════════════════════════════════════
export default function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { items, restaurantId, clearCart } = useCart()
  const tempsPrep = useCartTempsPrep()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: { type: 'livraison', modePaiement: 'cash' },
  })

  const [envoi,          setEnvoi]          = useState(false)
  const [modalMM,        setModalMM]        = useState(false)
  const [paramsCommande, setParamsCommande] = useState(null)
  const [codeInput,      setCodeInput]      = useState('')
  const [promoApplied,   setPromoApplied]   = useState(null) // { promo, remise }
  const [validating,     setValidating]     = useState(false)

  const type         = watch('type')
  const modePaiement = watch('modePaiement')
  const operateur    = watch('operateur')
  const telephone    = watch('telephone')

  const sousTotal      = items.reduce((s, i) => s + i.prix * i.quantite, 0)
  const fraisLivraison = type === 'retrait' ? 0 : TARIFS.FRAIS_LIVRAISON_BASE
  const remise         = promoApplied?.remise ?? 0
  const total          = sousTotal + fraisLivraison - remise

  async function appliquerCode() {
    const code = codeInput.trim().toUpperCase()
    if (!code) return
    setValidating(true)
    const { promo, remise, error } = await validatePromoCode(code, restaurantId, sousTotal)
    setValidating(false)
    if (error) { toast.error(error); return }
    setPromoApplied({ promo, remise })
    toast.success(`Code appliqué — −${formatCurrency(remise)}`)
  }

  function retirerCode() {
    setPromoApplied(null)
    setCodeInput('')
  }

  // ── Redirige si panier vide (dans useEffect pour éviter navigate pendant le rendu)
  useEffect(() => {
    if (items.length === 0) navigate('/', { replace: true })
  }, [items.length, navigate])

  // ── Soumission finale (après confirmation paiement) ─────
  async function soumettre(params) {
    setEnvoi(true)
    const { data, error } = await createOrder(params)
    setEnvoi(false)

    if (error) {
      toast.error(`Erreur : ${error}`)
      return
    }

    clearCart()
    toast.success('Commande envoyée ! 🎉')
    navigate(`/suivi/${data.id}`, { replace: true })
  }

  // ── Traitement du formulaire ────────────────────────────
  async function onSubmit(donnees) {
    if (!user) {
      toast.error('Vous devez être connecté pour commander')
      navigate('/login')
      return
    }

    const adresseLivraison =
      donnees.type === 'livraison'
        ? { rue: donnees.rue.trim(), quartier: donnees.quartier, indication: donnees.indication?.trim() || '' }
        : null

    const params = {
      clientId:         user.id,
      restaurantId,
      items:            items.map(i => ({
        menu_item_id:   i.id,
        nom:            i.nom,
        quantite:       i.quantite,
        prix_unitaire:  i.prix,
      })),
      type:             donnees.type,
      modePaiement:     donnees.modePaiement,
      adresseLivraison,
      notes:            donnees.notes?.trim() || null,
      fraisLivraison,
      remise,
      promoId:          promoApplied?.promo?.id ?? null,
      promoNbActuel:    promoApplied?.promo?.nb_utilisations ?? 0,
    }

    if (donnees.modePaiement === 'mobile_money') {
      setParamsCommande(params)
      setModalMM(true)
      return
    }

    await soumettre(params)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Retour">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg">Finaliser la commande</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit, (errs) => {
        console.error('Validation:', errs)
        toast.error('Veuillez remplir tous les champs requis')
      })} className="px-4 pt-4 space-y-4">

        {/* ── Mode de récupération ────────────────────── */}
        <fieldset className="bg-white rounded-xl p-4 shadow-sm">
          <legend className="font-semibold text-gray-800 mb-3">Mode de récupération</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: 'livraison', emoji: '🛵', titre: 'Livraison', sub: `+${formatCurrency(TARIFS.FRAIS_LIVRAISON_BASE)}` },
              { val: 'retrait',   emoji: '🏪', titre: 'Retrait',   sub: 'Gratuit' },
            ].map(({ val, emoji, titre, sub }) => (
              <label
                key={val}
                className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-colors
                  ${type === val
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 bg-white hover:border-brand-200'
                  }`}
              >
                <input type="radio" value={val} {...register('type')} className="sr-only" />
                <span className="text-2xl mb-1">{emoji}</span>
                <span className={`text-sm font-bold ${type === val ? 'text-brand-600' : 'text-gray-700'}`}>
                  {titre}
                </span>
                <span className={`text-xs mt-0.5 ${val === 'retrait' ? 'text-green-500' : 'text-gray-400'}`}>
                  {sub}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Adresse de livraison ─────────────────────── */}
        {type === 'livraison' && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-500" />
              Adresse de livraison
            </h2>

            <div>
              <input
                {...register('rue')}
                placeholder="Rue / Avenue *"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none
                  focus:ring-2 focus:ring-brand-300
                  ${errors.rue ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
              />
              {errors.rue && (
                <p className="text-red-500 text-xs mt-1">{errors.rue.message}</p>
              )}
            </div>

            <div>
              <select
                {...register('quartier')}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none
                  focus:ring-2 focus:ring-brand-300 bg-white
                  ${errors.quartier ? 'border-red-400' : 'border-gray-200'}`}
              >
                <option value="">Sélectionner un quartier *</option>
                {QUARTIERS_BRAZZAVILLE.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              {errors.quartier && (
                <p className="text-red-500 text-xs mt-1">Veuillez sélectionner un quartier</p>
              )}
            </div>

            <input
              {...register('indication')}
              placeholder="Indication (couleur portail, landmark…)"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        )}

        {/* ── Mode de paiement ────────────────────────── */}
        <fieldset className="bg-white rounded-xl p-4 shadow-sm">
          <legend className="font-semibold text-gray-800 mb-3">Mode de paiement</legend>
          <div className="space-y-2">
            {/* Cash — affiché en premier */}
            {[
              { val: 'cash',         emoji: '💵', titre: 'Espèces',       sub: 'Paiement à la livraison' },
              { val: 'mobile_money', emoji: '📱', titre: 'Mobile Money',  sub: 'MTN ou Airtel' },
            ].map(({ val, emoji, titre, sub }) => (
              <label
                key={val}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors
                  ${modePaiement === val
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-brand-200'
                  }`}
              >
                <input type="radio" value={val} {...register('modePaiement')} className="sr-only" />
                <span className="text-2xl">{emoji}</span>
                <div>
                  <p className={`font-semibold text-sm ${modePaiement === val ? 'text-brand-700' : 'text-gray-800'}`}>
                    {titre}
                  </p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Champs Mobile Money */}
          {modePaiement === 'mobile_money' && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {['MTN', 'Airtel'].map(op => (
                  <label
                    key={op}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors
                      ${operateur === op
                        ? op === 'MTN' ? 'border-yellow-400 bg-yellow-50' : 'border-red-400 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <input type="radio" value={op} {...register('operateur')} className="sr-only" />
                    <span className="text-lg">{op === 'MTN' ? '🟡' : '🔴'}</span>
                    <span className="font-bold text-sm">{op}</span>
                  </label>
                ))}
              </div>

              <div>
                <div className={`flex items-center rounded-xl border overflow-hidden
                  focus-within:ring-2 focus-within:ring-brand-300
                  ${errors.telephone ? 'border-red-400' : 'border-gray-200'}`}
                >
                  <span className="px-3 py-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 shrink-0">
                    +242
                  </span>
                  <input
                    {...register('telephone')}
                    type="tel"
                    placeholder="06 XXX XXXX"
                    className="flex-1 px-3 py-3 text-sm focus:outline-none bg-white"
                  />
                </div>
                {errors.telephone && (
                  <p className="text-red-500 text-xs mt-1">{errors.telephone.message}</p>
                )}
              </div>
            </div>
          )}
        </fieldset>

        {/* ── Instructions spéciales ───────────────────── */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">Instructions spéciales</h2>
          <textarea
            {...register('notes')}
            placeholder="Ex : Sans piment, allergie aux arachides, sonner 2 fois…"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                       resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* ── Code promo ───────────────────────────────── */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-500" />
            Code promo
          </h2>
          {promoApplied ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200
                            rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-green-700 font-mono">{promoApplied.promo.code}</p>
                <p className="text-xs text-green-600 mt-0.5">−{formatCurrency(remise)} appliqués</p>
              </div>
              <button onClick={retirerCode} className="p-1.5 hover:bg-green-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-green-600" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), appliquerCode())}
                placeholder="Ex: BIENVENUE20"
                maxLength={20}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono
                           uppercase focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button
                type="button"
                onClick={appliquerCode}
                disabled={validating || !codeInput.trim()}
                className="bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold
                           hover:bg-brand-600 disabled:opacity-50 transition-colors
                           flex items-center gap-1.5 min-w-[5rem] justify-center"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
              </button>
            </div>
          )}
        </div>

        {/* ── Récapitulatif ────────────────────────────── */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="font-semibold text-gray-800 mb-1">Récapitulatif</h2>
          {items.map(item => (
            <div key={item.id} className="flex justify-between text-sm text-gray-600">
              <span className="truncate pr-2">{item.quantite}× {item.nom}</span>
              <span className="shrink-0 tabular-nums">{formatCurrency(item.prix * item.quantite)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between text-sm text-gray-500">
            <span>Frais de livraison</span>
            <span className="tabular-nums">
              {type === 'retrait' ? 'Gratuit' : formatCurrency(fraisLivraison)}
            </span>
          </div>
          {remise > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Code promo ({promoApplied.promo.code})</span>
              <span className="tabular-nums">−{formatCurrency(remise)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
          {/* Estimation de livraison */}
          <div className="border-t border-gray-100 pt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <span>⏱</span>
            <span>
              {type === 'retrait'
                ? `Prêt en ~${tempsPrep} min`
                : `Livraison estimée dans ~${tempsPrep + 15} min`}
            </span>
          </div>
        </div>

        {/* ── Bouton de confirmation ───────────────────── */}
        <button
          type="submit"
          disabled={envoi}
          className="w-full bg-brand-500 text-white font-bold py-4 rounded-xl text-base
                     hover:bg-brand-600 disabled:opacity-60 active:scale-[0.98]
                     transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {envoi && <Loader2 className="w-5 h-5 animate-spin" />}
          {envoi ? 'Enregistrement…' : `Confirmer — ${formatCurrency(total)}`}
        </button>
      </form>

      {/* ── Modal Mobile Money ───────────────────────────── */}
      {modalMM && paramsCommande && (
        <ModalMobileMoney
          operateur={operateur}
          montant={total}
          telephone={telephone}
          onSuccess={() => {
            setModalMM(false)
            soumettre(paramsCommande)
          }}
          onClose={() => setModalMM(false)}
        />
      )}
    </div>
  )
}
