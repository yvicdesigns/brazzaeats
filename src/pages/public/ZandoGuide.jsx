import { useState, useMemo } from 'react'
import { Search, ChevronDown, MessageCircle } from 'lucide-react'
import { contacterSupport } from '@/utils/whatsappMessage'

// ── Contenu vérifié dans le code — à tenir à jour si les tarifs changent ──
const FAQ = [
  { cat: 'Général', q: "Zandofood, c'est quoi ?", a: "Zandofood connecte les restaurants de Brazzaville aux clients, avec une livraison suivie en direct. On commande depuis l'app ou le site, on paie en espèces ou par Mobile Money, et on suit le livreur jusqu'à la porte." },
  { cat: 'Général', q: 'Dans quelles villes Zandofood est disponible ?', a: "Brazzaville pour l'instant. L'app a été lancée en octobre 2026, d'autres villes pourront suivre mais aucune date n'est annoncée." },
  { cat: 'Général', q: "L'app est disponible sur iPhone et Android ?", a: "La version web (installable comme une vraie app, sans passer par un store) est disponible dès maintenant. Les apps natives Android et iOS sont en phase de test avant leur sortie publique sur les stores." },
  { cat: 'Paiement', q: 'Comment on paie une commande ?', a: "En espèces à la livraison, ou par Mobile Money (MTN ou Airtel) directement au numéro du restaurant, avec une preuve de paiement à envoyer dans l'app. Ce n'est pas un paiement automatique intégré — c'est un virement manuel vérifié." },
  { cat: 'Paiement', q: 'Combien coûte la livraison ?', a: "1000 FCFA, un montant fixe qui ne dépend pas de la distance. C'est gratuit si le client vient récupérer sa commande sur place (retrait)." },
  { cat: 'Paiement', q: 'Y a-t-il un montant minimum de commande ?', a: "Non, il n'y a pas de minimum imposé pour l'instant." },
  { cat: 'Restaurants', q: 'Quelle commission Zandofood prend aux restaurants ?', a: "10% par défaut sur le sous-total de la commande (hors frais de livraison). Ce taux peut être ajusté restaurant par restaurant par l'équipe Zandofood." },
  { cat: 'Restaurants', q: 'Comment un restaurant rejoint Zandofood ?', a: "Il n'y a pas d'inscription publique pour l'instant : c'est l'équipe Zandofood qui crée le compte du restaurant après l'avoir contactée." },
  { cat: 'Livreurs', q: 'Comment devenir livreur Zandofood ?', a: "Même principe que pour les restaurants : pas d'auto-inscription publique aujourd'hui, le compte est créé par l'équipe après contact direct." },
  { cat: 'Compte', q: 'Est-ce gratuit de créer un compte client ?', a: 'Oui, totalement gratuit pour commander.' },
]

const CATEGORIES = ['Tous', ...Array.from(new Set(FAQ.map((f) => f.cat)))]

function surligne(texte, terme) {
  if (!terme) return texte
  const idx = texte.toLowerCase().indexOf(terme.toLowerCase())
  if (idx === -1) return texte
  return (
    <>
      {texte.slice(0, idx)}
      <mark className="bg-amber-200 text-gray-900 rounded px-0.5">{texte.slice(idx, idx + terme.length)}</mark>
      {texte.slice(idx + terme.length)}
    </>
  )
}

export default function ZandoGuide() {
  const [search, setSearch] = useState('')
  const [categorieActive, setCategorieActive] = useState('Tous')
  const [ouvertId, setOuvertId] = useState(null)

  const resultats = useMemo(() => {
    const terme = search.trim().toLowerCase()
    return FAQ.filter((f) => {
      const matchCat = categorieActive === 'Tous' || f.cat === categorieActive
      const matchTerme = !terme || (f.q + ' ' + f.a).toLowerCase().includes(terme)
      return matchCat && matchTerme
    })
  }, [search, categorieActive])

  return (
    <div className="min-h-screen bg-[#F7F5EF] pb-16">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-10 pb-6 flex flex-col gap-7">

        {/* En-tête */}
        <div>
          <span className="font-['Manrope'] font-extrabold text-[11px] tracking-[0.1em] uppercase text-brand-600">
            ZandoGuide
          </span>
          <h1 className="font-['Unbounded'] font-extrabold text-2xl text-gray-900 mt-1.5 leading-tight">
            Tout savoir sur Zandofood
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
            Pour l'équipe qui présente l'app, et pour toute personne qui veut comprendre comment ça marche.
          </p>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une question (ex. livraison, prix, ville…)"
            className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* Tarifs */}
        <div>
          <span className="font-['Manrope'] font-extrabold text-[11px] tracking-[0.08em] uppercase text-gray-900 block mb-2.5">
            Tarifs à retenir
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white border border-gray-200 rounded-2xl py-3.5 px-2 text-center">
              <p className="font-['Unbounded'] font-extrabold text-lg text-brand-600 tabular-nums">1000 F</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-tight">Livraison</p>
              <p className="text-[10px] text-gray-400 mt-0.5">fixe, gratuit en retrait</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl py-3.5 px-2 text-center">
              <p className="font-['Unbounded'] font-extrabold text-lg text-brand-600 tabular-nums">10%</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-tight">Commission restaurant</p>
              <p className="text-[10px] text-gray-400 mt-0.5">sur le sous-total</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl py-3.5 px-2 text-center">
              <p className="font-['Unbounded'] font-extrabold text-lg text-brand-600 tabular-nums">0 F</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-tight">Créer un compte</p>
              <p className="text-[10px] text-gray-400 mt-0.5">client, gratuit</p>
            </div>
          </div>
        </div>

        {/* Catégories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategorieActive(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors
                ${categorieActive === cat
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-white border-gray-200 text-gray-700'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ */}
        <div className="flex flex-col gap-2.5">
          {resultats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Aucune question ne correspond. Essayez WhatsApp ci-dessous.
            </div>
          ) : (
            resultats.map((f, i) => {
              const id = f.cat + f.q
              const estOuvert = ouvertId === id
              return (
                <div key={id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOuvertId(estOuvert ? null : id)}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wide text-brand-600 mb-0.5">
                        {f.cat}
                      </span>
                      <span className="font-['Manrope'] font-bold text-sm text-gray-900">
                        {surligne(f.q, search)}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${estOuvert ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {estOuvert && (
                    <p className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
                      {surligne(f.a, search)}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Contact */}
        <div className="bg-brand-600 rounded-3xl p-5 flex flex-col gap-3">
          <h2 className="font-['Unbounded'] font-extrabold text-white text-base">Toujours bloqué ?</h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Si la réponse n'est pas ci-dessus, contactez directement l'équipe Zandofood sur WhatsApp.
          </p>
          <button
            onClick={() => contacterSupport(search ? `ZandoGuide — "${search}"` : 'ZandoGuide')}
            className="flex items-center justify-center gap-2 bg-amber-500 text-amber-950 font-bold text-sm
                       rounded-xl py-3 hover:bg-amber-400 active:scale-95 transition-all"
          >
            <MessageCircle className="w-4.5 h-4.5" />
            Contacter l'équipe sur WhatsApp
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">ZandoGuide · Zandofood, Brazzaville</p>
      </div>
    </div>
  )
}
