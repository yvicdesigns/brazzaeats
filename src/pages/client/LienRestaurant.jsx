import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/supabase/client'

// zandofood.com/r/<slug> — ouvert par le QR code ou un lien partagé.
// Sur le site en ligne, /r/… passe d'abord par api/r.js (aperçu Facebook /
// WhatsApp), qui renvoie ensuite ici ; cette page gère l'app et le local.
export default function LienRestaurant() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [introuvable, setIntrouvable] = useState(false)

  useEffect(() => {
    let annule = false
    supabase.from('restaurants').select('id').eq('slug', slug).maybeSingle()
      .then(({ data }) => {
        if (annule) return
        if (data?.id) navigate(`/restaurant/${data.id}`, { replace: true })
        else setIntrouvable(true)
      })
    return () => { annule = true }
  }, [slug, navigate])

  if (introuvable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-extrabold text-gray-900">Restaurant introuvable</h1>
        <p className="text-sm text-gray-600">Ce lien ne correspond à aucun restaurant.</p>
        <Link to="/" className="text-brand-500 font-bold">Voir tous les restaurants</Link>
      </div>
    )
  }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )
}
