import { useState, useEffect, useMemo } from 'react'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyRestaurant } from '@/hooks/useMyRestaurant'
import { getHistoriqueRevenu, getAnalyticsData } from '@/services/menuService'
import { formatCurrency } from '@/utils/formatCurrency'
import { STATUTS_COMMANDE } from '@/utils/constants'
import { caCommande } from '@/utils/statsRestaurant'

const PERIODES = [
  { id: 'today',   label: "Aujourd'hui" },
  { id: 'week',    label: '7 jours'     },
  { id: 'month',   label: '30 jours'    },
  { id: 'quarter', label: '3 mois'      },
]
const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MOIS_COURTS  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function getPeriodeDates(periodeId) {
  const fin   = new Date(); fin.setHours(23, 59, 59, 999)
  const debut = new Date(); debut.setHours(0, 0, 0, 0)
  if (periodeId === 'week')    debut.setDate(debut.getDate() - 6)
  if (periodeId === 'month')   debut.setDate(debut.getDate() - 29)
  if (periodeId === 'quarter') debut.setDate(debut.getDate() - 89)
  return { debut: debut.toISOString(), fin: fin.toISOString() }
}

// ── Barres simples ──────────────────────────────────────────
function Barres({ donnees, titre }) {
  if (!donnees.length) return null
  const max = Math.max(...donnees.map(d => d.val), 1)
  const serre = donnees.length > 12
  return (
    <div>
      <div role="img" aria-label={titre} className="h-[130px] grid items-end border-b border-gray-100"
           style={{ gridTemplateColumns: `repeat(${donnees.length}, minmax(0, 1fr))`, gap: serre ? 3 : 10 }}>
        {donnees.map((d, i) => (
          <div key={i} className={`rounded-t-[5px] ${d.actif ? 'bg-brand-500' : 'bg-brand-100'}`}
               style={{ height: `${Math.max(d.val ? 4 : 1, (d.val / max) * 100)}%` }} />
        ))}
      </div>
      <div className="grid text-xs font-bold text-gray-500 text-center mt-2"
           style={{ gridTemplateColumns: `repeat(${donnees.length}, minmax(0, 1fr))`, gap: serre ? 3 : 10 }}>
        {donnees.map((d, i) => <span key={i} className={d.actif ? 'text-brand-500 font-extrabold' : ''}>{d.label}</span>)}
      </div>
    </div>
  )
}

function caParJour(commandes, periodeId) {
  const nbJours  = periodeId === 'today' ? 1 : periodeId === 'week' ? 7 : periodeId === 'month' ? 30 : 90
  const nbSlots  = periodeId === 'quarter' ? 12 : Math.max(nbJours, 7)
  const pasJours = periodeId === 'quarter' ? Math.ceil(nbJours / 12) : 1
  const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0)

  const slots = Array.from({ length: nbSlots }, (_, i) => {
    const d = new Date(aujourdhui)
    d.setDate(d.getDate() - (nbSlots - 1 - i) * pasJours)
    const fin = new Date(d); fin.setDate(fin.getDate() + pasJours - 1)
    const label = nbSlots <= 7 ? JOURS_COURTS[d.getDay()]
      : periodeId === 'quarter' ? MOIS_COURTS[d.getMonth()]
      : (i % 5 === 0 || i === nbSlots - 1) ? String(d.getDate()) : ''
    return { debut: d, fin, val: 0, label, actif: fin.getTime() >= aujourdhui.getTime() }
  })
  // Sur 3 mois, le nom du mois n'apparaît qu'au changement de mois
  if (periodeId === 'quarter') {
    let precedent = null
    for (const s of slots) {
      const mois = s.debut.getMonth()
      if (mois === precedent) s.label = ''
      precedent = mois
    }
  }
  commandes.filter(c => c.statut === 'livrée').forEach(c => {
    const dc = new Date(c.created_at); dc.setHours(0, 0, 0, 0)
    const s = slots.find(x => dc >= x.debut && dc <= x.fin)
    if (s) s.val += caCommande(c)
  })
  return slots
}

// ── Ligne commande repliable ────────────────────────────────
function LigneCommande({ commande }) {
  const [ouvert, setOuvert] = useState(false)
  const date = new Date(commande.created_at)
  const annulee = commande.statut === 'annulée'
  const frais = commande.frais_livraison ?? 0

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button className="w-full flex items-center gap-3 py-3.5 text-left" onClick={() => setOuvert(v => !v)} aria-expanded={ouvert}>
        <div className="shrink-0 w-14">
          <p className="text-[13px] font-bold text-gray-900">{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
          <p className="text-xs font-semibold text-gray-500">{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 truncate">{commande.client?.nom ?? 'Client'}</p>
          <p className={`text-[13px] font-semibold ${annulee ? 'text-terracotta-700' : 'text-gray-500'}`}>
            {STATUTS_COMMANDE[commande.statut]?.label ?? commande.statut} · {commande.type === 'retrait' ? 'Retrait' : 'Livraison'}
          </p>
        </div>
        <span className={`text-[15px] font-extrabold tabular-nums ${annulee ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {formatCurrency(caCommande(commande))}
        </span>
        {ouvert ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {ouvert && (
        <div className="pb-3.5 pl-[68px] flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between font-semibold text-gray-700">
            <span>Pour le restaurant (plats, remises déduites)</span>
            <span className="tabular-nums font-extrabold text-gray-900">{formatCurrency(caCommande(commande))}</span>
          </div>
          {frais > 0 && (
            <div className="flex justify-between font-semibold text-gray-500">
              <span>Frais de livraison, pour le livreur</span>
              <span className="tabular-nums">{formatCurrency(frais)}</span>
            </div>
          )}
          <p className="text-[13px] font-semibold text-gray-500">
            {commande.mode_paiement === 'cash' ? 'Payé en espèces' : `Payé par Mobile Money ${commande.operateur_paiement ?? ''}`}
          </p>
          {commande.mode_paiement === 'mobile_money' && commande.preuve_paiement_url && (
            <a href={commande.preuve_paiement_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5">
              <img src={commande.preuve_paiement_url} alt="Preuve de paiement envoyée par le client"
                   className="h-10 w-10 object-cover rounded-lg border border-gray-200" />
              <span className="text-[13px] font-bold text-brand-500">Voir la preuve de paiement</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Onglet Tendances ────────────────────────────────────────
function Tendances({ restaurantId, periode }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { debut, fin } = getPeriodeDates(periode)
      const { data: d, error } = await getAnalyticsData(restaurantId, debut, fin)
      if (error) toast.error('Impossible de charger les tendances')
      else setData(d)
      setLoading(false)
    }
    charger()
  }, [restaurantId, periode])

  const t = useMemo(() => {
    const plats = {}
    data.forEach(cmd => (cmd.order_items ?? []).forEach(item => {
      const id = item.menu_item?.id ?? 'inconnu'
      plats[id] ??= { nom: item.menu_item?.nom ?? 'Inconnu', qte: 0, ca: 0 }
      plats[id].qte += item.quantite ?? 0
      plats[id].ca  += item.sous_total ?? 0
    }))
    const topPlats = Object.values(plats).sort((a, b) => b.qte - a.qte).slice(0, 5)

    const heureActuelle = new Date().getHours()
    const parHeure = Array.from({ length: 24 }, (_, h) => ({ val: 0, label: h % 6 === 0 ? `${h} h` : '', actif: h === heureActuelle }))
    data.forEach(c => { parHeure[new Date(c.created_at).getHours()].val++ })

    const parJour = JOURS_COURTS.map((label, j) => ({ val: 0, label, actif: j === new Date().getDay() }))
    data.forEach(c => { parJour[new Date(c.created_at).getDay()].val++ })

    const maxH = Math.max(...parHeure.map(h => h.val))
    const maxJ = Math.max(...parJour.map(j => j.val))
    return {
      topPlats, parHeure, parJour,
      pic: maxH ? { heure: parHeure.findIndex(h => h.val === maxH), n: maxH } : null,
      jourFort: maxJ ? { label: parJour.find(j => j.val === maxJ).label, n: maxJ } : null,
    }
  }, [data])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-brand-500 animate-spin" /></div>
  if (data.length === 0) {
    return <p className="py-16 text-center text-sm font-semibold text-gray-500">Les tendances apparaîtront après vos premières commandes.</p>
  }

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="text-[15px] font-extrabold mb-1.5">Plats les plus vendus</h2>
        {t.topPlats.map((p, i) => (
          <div key={p.nom + i} className="flex items-center gap-3 h-12 border-b border-gray-100 last:border-0">
            <span className="w-6 text-sm font-extrabold text-gray-900">{i + 1}.</span>
            <span className="flex-1 text-[15px] font-semibold truncate">{p.nom}</span>
            <span className="text-sm font-semibold text-gray-500 tabular-nums">{p.qte} vendus</span>
            <span className="w-24 text-right text-sm font-extrabold tabular-nums">{formatCurrency(p.ca)}</span>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-extrabold">Heures de pointe</h2>
        <Barres donnees={t.parHeure} titre="Commandes par heure de la journée" />
        {t.pic && <p className="text-[13px] font-semibold text-gray-500">Le plus d'activité entre {t.pic.heure} h et {t.pic.heure + 1} h ({t.pic.n} commande{t.pic.n > 1 ? 's' : ''}).</p>}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-extrabold">Jours les plus actifs</h2>
        <Barres donnees={t.parJour} titre="Commandes par jour de la semaine" />
        {t.jourFort && <p className="text-[13px] font-semibold text-gray-500">Jour le plus actif : {t.jourFort.label} ({t.jourFort.n} commande{t.jourFort.n > 1 ? 's' : ''}).</p>}
      </section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Page Revenus
// ══════════════════════════════════════════════════════════
export default function History() {
  const { restaurant, loading: loadingResto } = useMyRestaurant()

  const [onglet,    setOnglet]    = useState('revenus')
  const [periode,   setPeriode]   = useState('week')
  const [commandes, setCommandes] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!restaurant?.id || onglet !== 'revenus') return
    async function charger() {
      setLoading(true)
      const { debut, fin } = getPeriodeDates(periode)
      const { data, error } = await getHistoriqueRevenu(restaurant.id, debut, fin)
      if (error) toast.error("Impossible de charger l'historique")
      else setCommandes(data)
      setLoading(false)
    }
    charger()
  }, [restaurant?.id, periode, onglet])

  const kpis = useMemo(() => {
    const livrees  = commandes.filter(c => c.statut === 'livrée')
    const annulees = commandes.filter(c => c.statut === 'annulée').length
    const ca       = livrees.reduce((s, c) => s + caCommande(c), 0)
    return { ca, nbLivrees: livrees.length, panier: livrees.length ? Math.round(ca / livrees.length) : 0, annulees }
  }, [commandes])

  if (loadingResto) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.5} /></div>
  }

  const libellePeriode = PERIODES.find(p => p.id === periode)?.label.toLowerCase()

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10">
      <header className="max-w-3xl mx-auto px-5 lg:px-8 pt-12 md:pt-8 flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Revenus</h1>
        <div role="tablist" aria-label="Période" className="grid grid-cols-4 gap-0.5 p-[3px] rounded-xl bg-gray-100">
          {PERIODES.map(p => (
            <button key={p.id} role="tab" aria-selected={periode === p.id} onClick={() => setPeriode(p.id)}
                    className={`h-9 rounded-[9px] text-[13px] ${periode === p.id ? 'bg-white shadow-sm font-extrabold text-gray-900' : 'font-bold text-gray-600'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="Vue" className="flex gap-6 border-b border-gray-100">
          {[{ id: 'revenus', label: 'Revenus' }, { id: 'tendances', label: 'Tendances' }].map(o => (
            <button key={o.id} role="tab" aria-selected={onglet === o.id} onClick={() => setOnglet(o.id)}
                    className={`h-11 -mb-px border-b-2 text-sm ${onglet === o.id ? 'border-brand-500 text-brand-500 font-extrabold' : 'border-transparent text-gray-500 font-bold'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 lg:px-8 pt-6">
        {onglet === 'tendances' ? (
          restaurant?.id && <Tendances restaurantId={restaurant.id} periode={periode} />
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-brand-500 animate-spin" /></div>
        ) : (
          <div className="flex flex-col gap-7">
            <section className="flex flex-col gap-1.5">
              <h2 className="text-sm font-bold text-gray-500">Chiffre d'affaires · {libellePeriode}</h2>
              <p className="text-[34px] font-extrabold tracking-tight tabular-nums text-gray-900">{formatCurrency(kpis.ca)}</p>
              <p className="text-[13px] font-semibold text-gray-500">Prix des plats, remises déduites. Frais de livraison exclus : ils reviennent au livreur.</p>
            </section>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="border border-gray-200 rounded-2xl p-3.5"><p className="text-[13px] font-semibold text-gray-500">Livrées</p><p className="text-xl font-extrabold tabular-nums">{kpis.nbLivrees}</p></div>
              <div className="border border-gray-200 rounded-2xl p-3.5"><p className="text-[13px] font-semibold text-gray-500">Panier moyen</p><p className="text-lg font-extrabold tabular-nums whitespace-nowrap">{kpis.panier ? formatCurrency(kpis.panier) : '—'}</p></div>
              <div className="border border-gray-200 rounded-2xl p-3.5"><p className="text-[13px] font-semibold text-gray-500">Annulées</p><p className={`text-xl font-extrabold tabular-nums ${kpis.annulees ? 'text-terracotta-700' : ''}`}>{kpis.annulees}</p></div>
            </div>

            {commandes.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-[15px] font-extrabold">Par jour</h2>
                <Barres donnees={caParJour(commandes, periode)} titre="Chiffre d'affaires par jour" />
              </section>
            )}

            <section>
              <h2 className="text-[15px] font-extrabold mb-1">Détail des commandes <span className="text-gray-500 font-bold">· {commandes.length}</span></h2>
              {commandes.length === 0
                ? <p className="py-10 text-center text-sm font-semibold text-gray-500">Aucune commande sur cette période.</p>
                : commandes.map(c => <LigneCommande key={c.id} commande={c} />)}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
