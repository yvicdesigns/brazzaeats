import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { getTableauDeBord } from '@/services/menuService'
import { getVersementsRestaurant } from '@/services/adminService'
import { formatCurrency } from '@/utils/formatCurrency'
import { avecDelaiMax } from '@/utils/avecDelaiMax'
import { PERIODES, calculerStats, compterEtapes } from '@/utils/statsRestaurant'

const JOURS_COURTS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
const dateLongue = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const dateCourte = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

function Variation({ valeur, libelle }) {
  if (valeur == null) return <span className="text-xs font-bold text-gray-500">pas de comparaison possible</span>
  const hausse = valeur >= 0
  return (
    <span className={`self-start px-2 py-0.5 rounded-md text-xs font-extrabold ${hausse ? 'bg-brand-50 text-brand-700' : 'bg-terracotta-50 text-terracotta-800'}`}>
      {hausse ? '▲' : '▼'} {Math.abs(valeur)} %{libelle ? ` ${libelle}` : ''}
    </span>
  )
}

function Graphique({ parJour }) {
  const max = Math.max(...parJour.map(j => j.ca), 1)
  const libelle = (j) => j.estAujourdhui ? 'Auj.' : parJour.length > 7 ? String(j.date.getDate()) : JOURS_COURTS[j.date.getDay()]
  return (
    <div>
      <div role="img" aria-label="Chiffre d'affaires par jour"
           className="h-[190px] grid items-end border-b border-gray-100"
           style={{ gridTemplateColumns: `repeat(${parJour.length}, minmax(0, 1fr))`, gap: parJour.length > 7 ? 4 : 18 }}>
        {parJour.map((j, i) => (
          <div key={i} title={`${dateCourte(j.date)} : ${formatCurrency(j.ca)}`}
               className={`rounded-t-md ${j.estAujourdhui ? 'bg-brand-500' : 'bg-brand-100'}`}
               style={{ height: `${Math.max(j.ca ? 4 : 1, (j.ca / max) * 100)}%` }} />
        ))}
      </div>
      <div className="grid text-xs font-bold text-gray-500 text-center mt-2"
           style={{ gridTemplateColumns: `repeat(${parJour.length}, minmax(0, 1fr))`, gap: parJour.length > 7 ? 4 : 18 }}>
        {parJour.map((j, i) => (
          <span key={i} className={j.estAujourdhui ? 'text-brand-500 font-extrabold' : ''}>
            {parJour.length > 7 && i % 5 !== 0 && !j.estAujourdhui ? '' : libelle(j)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Tableau de bord restaurant
// ══════════════════════════════════════════════════════════
export default function Dashboard() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()

  const [donnees,    setDonnees]    = useState(null)
  const [versements, setVersements] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [periode,    setPeriode]    = useState('semaine')

  useEffect(() => {
    if (!restaurant?.id) return
    let annule = false

    // silencieux : rafraîchissement en fond, sans jamais remplacer l'écran par
    // un chargement (une requête bloquée après une mise en veille figeait la page)
    async function charger(silencieux = false) {
      if (!silencieux) setLoading(true)
      try {
        const [{ data, error }, { data: vers }] = await avecDelaiMax(Promise.all([
          getTableauDeBord(restaurant.id),
          getVersementsRestaurant(restaurant.id),
        ]))
        if (annule) return
        if (error) toast.error('Impossible de charger le tableau de bord')
        else       setDonnees(data)
        setVersements(vers ?? [])
      } catch {
        if (!annule && !silencieux) toast.error('Impossible de charger le tableau de bord')
      } finally {
        if (!annule) setLoading(false)
      }
    }

    charger()
    const intervalle = setInterval(() => charger(true), 2 * 60 * 1000)
    const onVisible = () => { if (!document.hidden) charger(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      annule = true
      clearInterval(intervalle)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [restaurant?.id])

  const statsJour    = useMemo(() => donnees && calculerStats(donnees.commandes, 'jour'), [donnees])
  const statsPeriode = useMemo(() => donnees && calculerStats(donnees.commandes, periode), [donnees, periode])
  const etapes       = useMemo(() => compterEtapes(donnees?.actives ?? []), [donnees])

  if (loadingResto || (loading && !donnees)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  const ouvert = restaurant?.statut === 'actif'
  const plusAncienne = (donnees?.actives ?? [])
    .filter(c => c.statut === 'en_attente')
    .reduce((min, c) => Math.min(min, new Date(c.created_at).getTime()), Infinity)
  const attenteMin = Number.isFinite(plusAncienne) ? Math.floor((Date.now() - plusAncienne) / 60000) : null
  const attenteTexte = attenteMin == null ? '' : attenteMin < 60 ? `${attenteMin} min` : attenteMin < 1440 ? `${Math.floor(attenteMin / 60)} h` : `${Math.floor(attenteMin / 1440)} j`
  const versementAVenir = versements.find(v => v.statut !== 'versé')
  const dernierVerse    = versements.find(v => v.statut === 'versé')
  const libellePeriode  = periode === 'jour' ? 'vs hier' : `vs ${PERIODES[periode].label} précédents`

  return (
    <div className="min-h-screen bg-white">

      {/* ════ Téléphone et tablette : vue « service » ════ */}
      <div className="lg:hidden max-w-2xl mx-auto px-5 pt-12 md:pt-8 pb-8 flex flex-col gap-7">
        <header className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-semibold text-gray-500 first-letter:uppercase">{dateLongue()}</p>
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">{restaurant?.nom ?? 'Mon restaurant'}</h1>
          </div>
          <Link to="/restaurant/profil" className="flex items-center gap-2.5 h-[52px] pl-3.5 pr-2 border border-gray-200 rounded-2xl">
            <span className={`w-2 h-2 rounded-full ${ouvert ? 'bg-brand-400' : 'bg-gray-400'}`} />
            <span className="flex-1 text-[15px] font-bold text-gray-900">
              {ouvert ? 'Ouvert' : 'Fermé'} <span className="font-semibold text-gray-500">· clients {ouvert ? 'acceptés' : 'en attente de réouverture'}</span>
            </span>
            <span className="h-10 px-3.5 rounded-xl bg-gray-100 text-sm font-bold text-gray-900 flex items-center">Gérer</span>
          </Link>
        </header>

        <section className="border border-gray-200 rounded-2xl p-[18px] flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-gray-900">Nouvelles commandes</h2>
            <span className={`min-w-[28px] h-7 px-2 rounded-full text-sm font-extrabold flex items-center justify-center
                              ${etapes.nouvelles ? 'bg-terracotta-50 text-terracotta-700' : 'bg-gray-100 text-gray-500'}`}>{etapes.nouvelles}</span>
          </div>
          <p className="text-sm font-semibold text-gray-500">
            {etapes.nouvelles ? `La plus ancienne attend depuis ${attenteTexte}` : 'Aucune commande en attente de réponse.'}
          </p>
          <Link to="/restaurant/commandes" className="h-[50px] rounded-xl bg-brand-500 text-white text-[15px] font-bold flex items-center justify-center">
            Voir les commandes
          </Link>
        </section>

        <section className="flex flex-col">
          <h2 className="text-[13px] font-bold text-gray-500 mb-1.5">En ce moment</h2>
          {[
            ['En cuisine', etapes.cuisine],
            ['Prêtes, en attente du livreur', etapes.pretes],
            ['En livraison', etapes.livraison],
          ].map(([libelle, n], i) => (
            <div key={libelle} className={`flex justify-between items-center h-12 ${i < 2 ? 'border-b border-gray-100' : ''}`}>
              <span className="text-[15px] font-semibold text-gray-900">{libelle}</span>
              <span className="text-[17px] font-extrabold text-gray-900">{n}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-baseline">
            <h2 className="text-[13px] font-bold text-gray-500">Aujourd'hui</h2>
            <Link to="/restaurant/historique" className="text-[13px] font-bold text-brand-500">Détails</Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div><p className="text-xl font-extrabold text-gray-900 tracking-tight tabular-nums">{formatCurrency(statsJour?.ca ?? 0)}</p><p className="text-[13px] font-semibold text-gray-500">Chiffre d'affaires</p></div>
            <div><p className="text-xl font-extrabold text-gray-900 tabular-nums">{statsJour?.nbLivrees ?? 0}</p><p className="text-[13px] font-semibold text-gray-500">Commandes livrées</p></div>
            <div><p className="text-xl font-extrabold text-gray-900">{donnees?.noteMoyenne ? Number(donnees.noteMoyenne).toFixed(1) : '—'}</p><p className="text-[13px] font-semibold text-gray-500">Note</p></div>
          </div>
        </section>

        {donnees?.nbRuptures > 0 && (
          <Link to="/restaurant/menu" className="flex items-center gap-3 h-[52px] px-4 rounded-2xl bg-amber-50 text-amber-900">
            <AlertCircle className="w-[18px] h-[18px]" />
            <span className="flex-1 text-sm font-bold">{donnees.nbRuptures} plat{donnees.nbRuptures > 1 ? 's' : ''} en rupture</span>
            <span className="text-sm font-extrabold">Gérer</span>
          </Link>
        )}
      </div>

      {/* ════ Ordinateur : vue « patron » ════ */}
      <div className="hidden lg:flex flex-col min-h-screen">
        <header className="h-[76px] px-8 flex items-center gap-3.5 border-b border-gray-100">
          <h1 className="flex-1 text-[22px] font-extrabold text-gray-900 tracking-tight">Tableau de bord</h1>
          <div role="tablist" aria-label="Période" className="flex gap-0.5 p-[3px] rounded-xl bg-gray-100">
            {Object.entries(PERIODES).map(([cle, { label }]) => (
              <button key={cle} role="tab" aria-selected={periode === cle} onClick={() => setPeriode(cle)}
                      className={`h-[34px] px-3.5 rounded-[9px] text-[13px] ${periode === cle ? 'bg-white shadow-sm font-extrabold text-gray-900' : 'font-bold text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 px-8 py-6 bg-gray-50/60 flex flex-col gap-5">
          <div className="grid grid-cols-4 gap-4">
            <section className="bg-white border border-gray-200 rounded-2xl p-[18px] flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-gray-500">Chiffre d'affaires</h2>
              <p className="text-[26px] font-extrabold tracking-tight tabular-nums">{formatCurrency(statsPeriode.ca)}</p>
              <Variation valeur={statsPeriode.variationCa} libelle={libellePeriode} />
            </section>
            <section className="bg-white border border-gray-200 rounded-2xl p-[18px] flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-gray-500">Commandes livrées</h2>
              <p className="text-[26px] font-extrabold tracking-tight tabular-nums">{statsPeriode.nbLivrees}</p>
              <Variation valeur={statsPeriode.variationNb} />
            </section>
            <section className="bg-white border border-gray-200 rounded-2xl p-[18px] flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-gray-500">Panier moyen</h2>
              <p className="text-[26px] font-extrabold tracking-tight tabular-nums">{formatCurrency(statsPeriode.panierMoyen)}</p>
              <Variation valeur={statsPeriode.variationPanier} />
            </section>
            <section className="bg-white border border-gray-200 rounded-2xl p-[18px] flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-gray-500">Note moyenne</h2>
              <p className="text-[26px] font-extrabold tracking-tight">{donnees?.noteMoyenne ? `${Number(donnees.noteMoyenne).toFixed(1)} / 5` : '—'}</p>
              <span className="text-xs font-bold text-gray-500">sur {donnees?.nbAvis ?? 0} avis</span>
            </section>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-baseline">
                <h2 className="text-[15px] font-extrabold">Chiffre d'affaires par jour</h2>
                <span className="text-xs font-bold text-gray-500">frais de livraison exclus</span>
              </div>
              <Graphique parJour={statsPeriode.parJour} />
            </section>
            <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col">
              <h2 className="text-[15px] font-extrabold mb-2">Qualité du service</h2>
              {[
                ['Commandes réussies', statsPeriode.tauxReussite != null ? `${statsPeriode.tauxReussite} %` : '—'],
                ['Délai annoncé moyen', statsPeriode.delaiMoyen != null ? `${statsPeriode.delaiMoyen} min` : '—'],
                ['Annulées ou refusées', statsPeriode.annulees],
                ['Plats en rupture', donnees?.nbRuptures ?? 0],
              ].map(([libelle, valeur], i) => (
                <div key={libelle} className={`flex justify-between items-center h-[46px] ${i < 3 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-sm font-semibold">{libelle}</span>
                  <span className="text-[15px] font-extrabold tabular-nums">{valeur}</span>
                </div>
              ))}
            </section>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col">
              <h2 className="text-[15px] font-extrabold mb-2">Plats les plus vendus</h2>
              {statsPeriode.topPlats.length === 0 ? (
                <p className="text-sm font-semibold text-gray-500 py-6 text-center">Aucune commande livrée sur cette période.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-gray-500 border-b border-gray-100">
                      <th className="text-left font-bold py-2 w-8">#</th>
                      <th className="text-left font-bold py-2">Plat</th>
                      <th className="text-right font-bold py-2">Vendus</th>
                      <th className="text-right font-bold py-2">Chiffre d'affaires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsPeriode.topPlats.map((p, i) => (
                      <tr key={p.nom} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 font-extrabold">{i + 1}</td>
                        <td className="py-2.5 font-semibold">{p.nom}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">{p.quantite}</td>
                        <td className="py-2.5 text-right font-extrabold tabular-nums">{formatCurrency(p.ca)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-2.5">
              <h2 className="text-[15px] font-extrabold">Versements</h2>
              {versementAVenir ? (
                <div className="p-3.5 rounded-xl bg-brand-50/70 flex flex-col gap-1">
                  <span className="text-[13px] font-bold text-brand-700">
                    À venir · période du {dateCourte(versementAVenir.periode_debut)} au {dateCourte(versementAVenir.periode_fin)}
                  </span>
                  <span className="text-xl font-extrabold text-brand-800 tabular-nums">{formatCurrency(versementAVenir.montant_net)}</span>
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-500">Aucun versement en attente.</p>
              )}
              {dernierVerse && (
                <div className="flex justify-between text-sm font-semibold">
                  <span>Dernier versement · {dateCourte(dernierVerse.date_versement ?? dernierVerse.periode_fin)}</span>
                  <span className="font-extrabold tabular-nums">{formatCurrency(dernierVerse.montant_net)}</span>
                </div>
              )}
              <Link to="/restaurant/historique" className="text-[13px] font-extrabold text-brand-500 mt-auto">Voir l'historique</Link>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
