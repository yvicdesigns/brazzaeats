// Edge Function — crée une livraison sur Zando Delivery pour une commande Zandofood.
// Appelée en interne par le trigger Postgres orders_realtime_status_trigger (via pg_net),
// quand une commande passe à "prête". Le mode effectif (restaurants.mode_livraison si défini,
// sinon platform_settings.mode_livraison) est revérifié ici, pas seulement côté trigger — la
// fonction ne fait rien si ce n'est pas "zando_delivery" pour ce restaurant précis.
// N'est jamais appelée par le client : ne contient aucune donnée sensible exposée côté app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Renseignés une fois Zando Delivery hébergé — tant qu'absents, la fonction ne fait rien
// (échec silencieux, sans jamais bloquer la commande côté Zandofood).
const ZANDO_DELIVERY_URL = Deno.env.get('ZANDO_DELIVERY_URL')
const ZANDO_DELIVERY_API_KEY = Deno.env.get('ZANDO_DELIVERY_API_KEY')
// Id du marchand "Zandofood" tel que créé côté Zando Delivery (Control Center) — distinct de
// la clé d'API, nécessaire pour l'encaissement à la livraison (COD).
const ZANDO_DELIVERY_MERCHANT_ID = Deno.env.get('ZANDO_DELIVERY_MERCHANT_ID')
const ZANDO_DELIVERY_CITY_CODE = Deno.env.get('ZANDO_DELIVERY_CITY_CODE') ?? 'BZV'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (!ZANDO_DELIVERY_URL || !ZANDO_DELIVERY_API_KEY) {
    return json({ skipped: 'ZANDO_DELIVERY_URL / ZANDO_DELIVERY_API_KEY non configurés' })
  }

  try {
    const body = await req.json()
    // Accepte soit un appel direct { order_id }, soit le format natif d'un
    // Database Webhook Supabase ({ type, table, record, old_record, schema }) —
    // configurable depuis le tableau de bord (Database > Webhooks) sans SQL à écrire.
    const order_id = body.order_id ?? body.record?.id
    if (!order_id) return json({ error: 'order_id manquant' }, 400)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, type, adresse_livraison, client_id, restaurant_id, montant_total, mode_paiement, zando_delivery_ref')
      .eq('id', order_id)
      .single()
    if (orderErr || !order) return json({ error: 'Commande introuvable' }, 404)
    if (order.type !== 'livraison') return json({ skipped: 'Commande sans livraison (retrait/comptoir) — pas besoin de Zando Delivery' })
    if (order.zando_delivery_ref) return json({ skipped: 'Livraison déjà créée pour cette commande' })

    // Même convention que Tracking.jsx / LivreurMap : adresse_livraison.latitude/longitude,
    // renseignées uniquement si le client a utilisé « Ma position » au checkout (Checkout.jsx).
    const dropoff = order.adresse_livraison ?? {}
    if (typeof dropoff.latitude !== 'number' || typeof dropoff.longitude !== 'number') {
      return json({ skipped: "Adresse de livraison sans coordonnées GPS (le client n'a pas utilisé « Ma position ») — commande ignorée" })
    }

    const [{ data: restaurant }, { data: client }, { data: platformSettings }] = await Promise.all([
      supabase.from('restaurants').select('nom, adresse, latitude, longitude, owner_id, mode_livraison').eq('id', order.restaurant_id).single(),
      supabase.from('profiles').select('nom, telephone').eq('id', order.client_id).single(),
      supabase.from('platform_settings').select('mode_livraison').eq('id', 1).single(),
    ])

    // Le restaurant peut surcharger le réglage plateforme (un seul restaurant migré à la
    // fois le temps du test, voir docs/plan Zando Delivery) — sa valeur a priorité.
    const modeEffectif = restaurant?.mode_livraison || platformSettings?.mode_livraison || 'independants'
    if (modeEffectif !== 'zando_delivery') {
      return json({ skipped: `Mode de livraison effectif = "${modeEffectif}", pas "zando_delivery" — commande ignorée` })
    }
    if (!restaurant?.latitude || !restaurant?.longitude) {
      return json({ skipped: 'Restaurant sans coordonnées GPS — commande ignorée' })
    }
    const { data: restaurantOwner } = restaurant.owner_id
      ? await supabase.from('profiles').select('telephone').eq('id', restaurant.owner_id).single()
      : { data: null }

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${ZANDO_DELIVERY_API_KEY}` }

    const quoteRes = await fetch(`${ZANDO_DELIVERY_URL}/v1/quotes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        cityCode: ZANDO_DELIVERY_CITY_CODE,
        serviceCode: 'SEND',
        vehicleCode: 'MOTO',
        pickup: { lat: restaurant.latitude, lng: restaurant.longitude },
        dropoff: { lat: dropoff.latitude, lng: dropoff.longitude },
      }),
    })
    if (!quoteRes.ok) return json({ error: `Devis Zando Delivery refusé (${quoteRes.status})` }, 502)
    const quote = await quoteRes.json()

    const deliveryRes = await fetch(`${ZANDO_DELIVERY_URL}/v1/deliveries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        quoteId: quote.id,
        feePayer: 'DESTINATAIRE',
        feeMoment: 'LIVRAISON',
        externalRef: order.id,
        pickup: {
          lat: restaurant.latitude,
          lng: restaurant.longitude,
          addressText: restaurant.adresse ?? restaurant.nom,
          contactName: restaurant.nom,
          contactPhone: restaurantOwner?.telephone ?? '+242000000000',
        },
        dropoff: {
          lat: dropoff.latitude,
          lng: dropoff.longitude,
          addressText: [dropoff.rue, dropoff.quartier].filter(Boolean).join(', ') || 'Adresse client',
          contactName: client?.nom ?? 'Client Zandofood',
          contactPhone: client?.telephone ?? '+242000000000',
        },
        // L'encaissement à la livraison n'a de sens que si le client paie en espèces, et
        // nécessite l'id du marchand Zandofood côté Zando Delivery (distinct de la clé d'API).
        // goodsAmountMinor : le XAF n'a pas de sous-unité (packages/domain/src/money.ts côté
        // Zando Delivery), c'est directement le montant en FCFA — pas de ×100.
        ...(order.mode_paiement === 'cash' && ZANDO_DELIVERY_MERCHANT_ID
          ? { cod: { merchantId: ZANDO_DELIVERY_MERCHANT_ID, goodsAmountMinor: order.montant_total } }
          : {}),
      }),
    })
    if (!deliveryRes.ok) return json({ error: `Création Zando Delivery refusée (${deliveryRes.status})` }, 502)
    const delivery = await deliveryRes.json()

    // Zando Delivery ne génère le lien de suivi public qu'une fois un livreur affecté (pas à la
    // création) — zando_delivery_tracking_url sera renseigné plus tard par le webhook, quand
    // Zando Delivery l'exposera dans son payload (à faire côté Zando Delivery).
    await supabase.from('orders').update({ zando_delivery_ref: delivery.ref }).eq('id', order.id)

    return json({ data: delivery })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
