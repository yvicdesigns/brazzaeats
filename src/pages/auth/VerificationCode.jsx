import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { demanderCodeSMS, verifierCodeSMS } from '@/services/authService'

const DUREE_COOLDOWN = 60 // secondes, aligné sur l'anti-spam de l'edge function

// ── Formatage d'affichage : +242066123456 → +242 06 61 23 45 6 ─
function formaterTelephone(telephone) {
  const local = telephone?.replace('+242', '') ?? ''
  return `+242 ${local.replace(/(.{2})(?=.)/g, '$1 ')}`
}

// ══════════════════════════════════════════════════════════
// Page Vérification — saisie du code SMS à 4 chiffres
// ══════════════════════════════════════════════════════════
export default function VerificationCode() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const telephone = state?.telephone ?? null

  const [chiffres,  setChiffres]  = useState(['', '', '', ''])
  const [verif,     setVerif]     = useState(false)
  const [cooldown,  setCooldown]  = useState(0)
  const refs = useRef([])

  // Pas de téléphone en state (accès direct à l'URL) → retour à l'étape précédente
  useEffect(() => {
    if (!telephone) navigate('/mot-de-passe-oublie', { replace: true })
  }, [telephone, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (!telephone) return null

  const code = chiffres.join('')

  function setChiffre(index, valeur) {
    const c = valeur.replace(/\D/g, '').slice(-1)
    setChiffres(prev => {
      const next = [...prev]
      next[index] = c
      return next
    })
    if (c && index < 3) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !chiffres[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e) {
    const texte = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!texte) return
    e.preventDefault()
    setChiffres(prev => {
      const next = [...prev]
      for (let i = 0; i < texte.length; i++) next[i] = texte[i]
      return next
    })
    refs.current[Math.min(texte.length, 3)]?.focus()
  }

  async function handleVerifier(e) {
    e.preventDefault()
    if (code.length !== 4) { toast.error('Entrez les 4 chiffres du code'); return }

    setVerif(true)
    const { resetToken, error } = await verifierCodeSMS(telephone, code)
    setVerif(false)

    if (error) { toast.error(error); return }
    navigate('/nouveau-mot-de-passe', { state: { telephone, resetToken } })
  }

  async function handleRenvoyer() {
    if (cooldown > 0) return
    const { debugCode, error } = await demanderCodeSMS(telephone)
    if (error) { toast.error(error); return }

    if (debugCode) {
      toast.success(`Mode démo — nouveau code : ${debugCode}`, { duration: 8000 })
    } else {
      toast.success('Nouveau code envoyé')
    }
    setCooldown(DUREE_COOLDOWN)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-start justify-start px-6 pt-12 pb-8">
        <Link to="/mot-de-passe-oublie" aria-label="Retour" className="p-2 -ml-2 mb-6 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="w-full max-w-sm mx-auto text-center">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-brand-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Vérification par SMS</h2>
          <p className="text-sm text-gray-500 mt-2">
            Entrez le code à 4 chiffres envoyé au<br />
            <span className="font-semibold text-gray-700">{formaterTelephone(telephone)}</span>
          </p>

          <form onSubmit={handleVerifier} className="mt-6">
            <div className="flex items-center justify-center gap-3" onPaste={handlePaste}>
              {chiffres.map((valeur, i) => (
                <input
                  key={i}
                  ref={el => (refs.current[i] = el)}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={valeur}
                  onChange={e => setChiffre(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-14 h-14 text-center text-xl font-bold border border-gray-300 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                />
              ))}
            </div>

            <p className="text-sm text-gray-400 mt-5">
              Vous n'avez rien reçu ?{' '}
              <button
                type="button"
                onClick={handleRenvoyer}
                disabled={cooldown > 0}
                className="text-brand-500 font-semibold hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : 'Renvoyer le code'}
              </button>
            </p>

            <button
              type="submit"
              disabled={verif || code.length !== 4}
              className="w-full bg-brand-500 text-white rounded-xl py-3.5 font-bold text-sm mt-6
                         hover:bg-brand-600 transition-colors disabled:opacity-60 min-h-[52px]"
            >
              {verif ? 'Vérification…' : 'Vérifier'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-brand-500 font-semibold hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
