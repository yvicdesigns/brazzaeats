// Edge Function — reçoit les événements de suivi de Zando Delivery (webhook partenaire) et met
// à jour le statut de la commande Zandofood correspondante. Endpoint public (appelé par un
// serveur tiers, pas par un utilisateur connecté) : l'authenticité vient uniquement de la
// signature HMAC, pas d'un jeton Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Secret généré par Zando Delivery à l'enregistrement du webhook (Control Center) — à renseigner
// une fois l'intégration activée. Tant qu'absent, la fonction refuse tout appel.
const ZANDO_DELIVERY_WEBHOOK_SECRET = Deno.env.get('ZANDO_DELIVERY_WEBHOOK_SECRET')

// Statuts Zando Delivery -> statut_commande Zandofood (DELIVERY_STATUSES, packages/domain).
// Tout statut absent de cette table est ignoré (accusé réception, aucun changement).
const STATUT_PAR_LIVRAISON: Record<string, string> = {
  LIVREUR_ATTRIBUE: 'en_livraison',
  EN_ROUTE_VERS_COLLECTE: 'en_livraison',
  ARRIVE_AU_POINT_DE_COLLECTE: 'en_livraison',
  COLIS_RECUPERE: 'en_livraison',
  EN_LIVRAISON: 'en_livraison',
  ARRIVE_A_DESTINATION: 'en_livraison',
  LIVRE: 'livrée',
  ANNULE: 'annulée',
  ECHEC_DE_LIVRAISON: 'annulée',
  RETOURNE: 'annulée',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function signatureValide(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  const given = signatureHeader.slice('sha256='.length)
  if (expected.length !== given.length) return false
  // Comparaison en temps constant.
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (!ZANDO_DELIVERY_WEBHOOK_SECRET) return json({ error: 'ZANDO_DELIVERY_WEBHOOK_SECRET non configuré' }, 503)

  const rawBody = await req.text()
  const valide = await signatureValide(rawBody, req.headers.get('x-zando-signature'), ZANDO_DELIVERY_WEBHOOK_SECRET)
  if (!valide) return json({ error: 'Signature invalide' }, 401)

  try {
    const event = JSON.parse(rawBody)
    if (event.type !== 'delivery.status_changed') return json({ ok: true, ignored: event.type })

    const { ref, to } = event.data ?? {}
    const nouveauStatut = STATUT_PAR_LIVRAISON[to]
    if (!ref || !nouveauStatut) return json({ ok: true, ignored: to })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await supabase.from('orders').update({ statut: nouveauStatut }).eq('zando_delivery_ref', ref)
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400)
  }
})
