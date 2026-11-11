// Edge Function — crée une livraison sur Zando Delivery pour une commande Zandofood.
// Appelée en interne par le trigger Postgres orders_realtime_status_trigger (via pg_net),
// quand une commande passe à "prête". Le mode effectif (restaurants.mode_livraison si défini,
// sinon platform_settings.mode_livraison) est revérifié ici, pas seulement côté trigger — la
// fonction ne fait rien si ce n'est pas "zando_delivery" pour ce restaurant précis.
// Peut aussi être relancée par le restaurant (bouton « Réessayer » sur la commande) : on
// vérifie alors qu'il est bien propriétaire du restaurant. Toute erreur est enregistrée
// dans orders.zando_delivery_erreur pour être visible côté restaurant — plus d'échec muet.

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}

// Centre de chaque quartier (copie de QUARTIER_CENTRES, src/utils/constants.js) : utilisé
// quand le client n'a pas partagé sa position GPS. Le livreur appelle le client pour la fin.
const QUARTIER_CENTRES: Record<string, { lat: number; lng: number }> = {
  'Makélékélé':         { lat: -4.2915008, lng: 15.2338680 },
  'Bacongo':            { lat: -4.2935218, lng: 15.2620062 },
  'Nganga-Lingolo':     { lat: -4.2712506, lng: 15.1435350 },
  'Moungali':           { lat: -4.2433802, lng: 15.2669867 },
  'Ouenzé':             { lat: -4.2436991, lng: 15.2840585 },
  'Poto-Poto':          { lat: -4.2726398, lng: 15.2775717 },
  'Chaminade':          { lat: -4.2687523, lng: 15.2712415 },
  'Plateau des 15 ans': { lat: -4.2594572, lng: 15.2627400 },
  'Talangaï':           { lat: -4.2223134, lng: 15.2953989 },
  'Mikalou':            { lat: -4.2039400, lng: 15.2682363 },
  'Mfilou':             { lat: -4.2177160, lng: 15.2188006 },
  'Nkombo':             { lat: -4.1918608, lng: 15.2467040 },
  'Djiri':              { lat: -4.1604818, lng: 15.2742446 },
  'Madibou':            { lat: -4.3120598, lng: 15.1837685 },
  'Centre-ville':       { lat: -4.2749795, lng: 15.2648018 },
  'La Glacière':        { lat: -4.2927714, lng: 15.2696026 },
  'Bifouiti':           { lat: -4.3011866, lng: 15.2284879 },
}

// Rôle du jeton déjà vérifié par la passerelle (verify_jwt) : service_role = trigger interne
function roleDuJeton(req: Request): string | null {
  try {
    const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
    const charge = JSON.parse(atob(jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return charge.role ?? null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (!ZANDO_DELIVERY_URL || !ZANDO_DELIVERY_API_KEY) {
    return json({ skipped: 'ZANDO_DELIVERY_URL / ZANDO_DELIVERY_API_KEY non configurés' })
  }

  // deno-lint-ignore no-explicit-any
  let supabase: any = null
  let orderIdPourErreur: string | null = null
  // Enregistre la raison d'un échec sur la commande (visible côté restaurant)
  const echec = async (message: string, status = 200) => {
    if (supabase && orderIdPourErreur) {
      await supabase.from('orders').update({ zando_delivery_erreur: message }).eq('id', orderIdPourErreur)
    }
    return json({ error: message }, status)
  }

  try {
    const body = await req.json()
    // Accepte soit un appel direct { order_id }, soit le format natif d'un
    // Database Webhook Supabase ({ type, table, record, old_record, schema }) —
    // configurable depuis le tableau de bord (Database > Webhooks) sans SQL à écrire.
    const order_id = body.order_id ?? body.record?.id
    if (!order_id) return json({ error: 'order_id manquant' }, 400)

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, type, adresse_livraison, client_id, restaurant_id, montant_total, mode_paiement, zando_delivery_ref')
      .eq('id', order_id)
      .single()
    if (orderErr || !order) return json({ error: 'Commande introuvable' }, 404)

    // Appel depuis l'app (bouton « Réessayer ») : réservé au restaurant de la commande ou à l'admin
    const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
    if (jeton !== SUPABASE_SERVICE_ROLE_KEY && roleDuJeton(req) !== 'service_role') {
      const { data: { user } } = await supabase.auth.getUser(jeton)
      if (!user) return json({ error: 'Non autorisé' }, 401)
      const [{ data: resto }, { data: profil }] = await Promise.all([
        supabase.from('restaurants').select('owner_id').eq('id', order.restaurant_id).single(),
        supabase.from('profiles').select('role').eq('id', user.id).single(),
      ])
      if (resto?.owner_id !== user.id && profil?.role !== 'admin') return json({ error: 'Non autorisé' }, 403)
    }
    orderIdPourErreur = order.id
    if (order.type !== 'livraison') return json({ skipped: 'Commande sans livraison (retrait/comptoir) — pas besoin de Zando Delivery' })
    if (order.zando_delivery_ref) return json({ skipped: 'Livraison déjà créée pour cette commande' })

    // Position du client : GPS s'il a utilisé « Ma position » au checkout, sinon le centre
    // de son quartier (le livreur l'appellera pour les derniers mètres).
    const adresse = order.adresse_livraison ?? {}
    const gpsClient = typeof adresse.latitude === 'number' && typeof adresse.longitude === 'number'
    const centreQuartier = QUARTIER_CENTRES[adresse.quartier as string]
    if (!gpsClient && !centreQuartier) {
      return await echec('Adresse du client introuvable (ni position GPS, ni quartier reconnu)')
    }
    const dropoff = gpsClient
      ? { latitude: adresse.latitude, longitude: adresse.longitude }
      : { latitude: centreQuartier.lat, longitude: centreQuartier.lng }
    const texteAdresse = [
      adresse.rue, adresse.quartier, adresse.indication,
      gpsClient ? null : 'Position approximative (centre du quartier) — appeler le client',
    ].filter(Boolean).join(', ') || 'Adresse client'

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
      return await echec('Position du restaurant manquante — à renseigner par l\'admin')
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
    if (!quoteRes.ok) return await echec(`Zando Delivery a refusé le devis (erreur ${quoteRes.status})`, 502)
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
          addressText: texteAdresse,
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
    if (!deliveryRes.ok) return await echec(`Zando Delivery a refusé la livraison (erreur ${deliveryRes.status})`, 502)
    const delivery = await deliveryRes.json()

    // Zando Delivery ne génère le lien de suivi public qu'une fois un livreur affecté (pas à la
    // création) — zando_delivery_tracking_url sera renseigné plus tard par le webhook, quand
    // Zando Delivery l'exposera dans son payload (à faire côté Zando Delivery).
    await supabase.from('orders').update({ zando_delivery_ref: delivery.ref, zando_delivery_erreur: null }).eq('id', order.id)

    return json({ data: delivery })
  } catch (err) {
    return await echec(`Zando Delivery injoignable : ${err instanceof Error ? err.message : String(err)}`, 500)
  }
})
