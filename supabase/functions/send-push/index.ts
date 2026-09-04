// Envoie des notifications push à un ensemble d'utilisateurs.
// Android → Firebase Cloud Messaging (le token Capacitor EST déjà un
//   vrai token FCM sur Android).
// iOS     → APNs en direct (le token Capacitor sur iOS est le token
//   APNs brut, pas un token FCM — Firebase ne peut pas l'utiliser tel
//   quel sans intégrer le SDK Firebase natif, qu'on n'a pas ajouté).
// Appelée en interne par des triggers Postgres (via pg_net).
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const FIREBASE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!)
const APNS_AUTH_KEY = Deno.env.get('APNS_AUTH_KEY')!
const APNS_KEY_ID = '7SWM8HM57C'
const APNS_TEAM_ID = 'LJ73XSDBTK'
const APNS_BUNDLE_ID = 'com.zandofood.app'
// Nos builds actuels sont signés avec aps-environment=development
// (Xcode debug, hors TestFlight/App Store) → passerelle sandbox.
// À changer pour 'https://api.push.apple.com' une fois publié.
const APNS_HOST = 'https://api.sandbox.push.apple.com'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function pemToBinary(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN (PRIVATE KEY|EC PRIVATE KEY)-----/, '')
    .replace(/-----END (PRIVATE KEY|EC PRIVATE KEY)-----/, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ── FCM (Android) ────────────────────────────────────────────
async function getFcmAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(FIREBASE_SERVICE_ACCOUNT.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: FIREBASE_SERVICE_ACCOUNT.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    },
    key
  )
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Échec obtention token FCM: ' + JSON.stringify(data))
  return data.access_token
}

async function sendFcm(token: string, title: string, body: string, data: Record<string, string>) {
  const accessToken = await getFcmAccessToken()
  return fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_SERVICE_ACCOUNT.project_id}/messages:send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title, body }, data } }),
    }
  )
}

// ── APNs direct (iOS) ────────────────────────────────────────
let _apnsJwtCache: { jwt: string; issuedAt: number } | null = null

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  // Un JWT APNs reste valable 1h — on le réutilise pour éviter de
  // resigner à chaque envoi.
  if (_apnsJwtCache && now - _apnsJwtCache.issuedAt < 1800) return _apnsJwtCache.jwt

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(APNS_AUTH_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const jwt = await create(
    { alg: 'ES256', kid: APNS_KEY_ID },
    { iss: APNS_TEAM_ID, iat: now },
    key
  )
  _apnsJwtCache = { jwt, issuedAt: now }
  return jwt
}

async function sendApns(token: string, title: string, body: string, data: Record<string, string>) {
  const jwt = await getApnsJwt()
  return fetch(`${APNS_HOST}/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    },
    body: JSON.stringify({
      aps: { alert: { title, body }, sound: 'default' },
      ...data,
    }),
  })
}

Deno.serve(async (req) => {
  try {
    const { user_ids, title, body, data } = await req.json()
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_ids requis' }), { status: 400 })
    }

    const idsFilter = user_ids.map((id: string) => `"${id}"`).join(',')
    const tokensRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_tokens?user_id=in.(${idsFilter})&select=token,platform`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    )
    const rows: { token: string; platform: string }[] = await tokensRes.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), { status: 200 })
    }

    const dataStr = data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}

    const results = await Promise.allSettled(
      rows.map((row) =>
        row.platform === 'ios'
          ? sendApns(row.token, title, body, dataStr)
          : sendFcm(row.token, title, body, dataStr)
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled' && (r.value as Response).ok).length
    const details = await Promise.all(
      results.map(async (r, i) => {
        if (r.status === 'rejected') return { platform: rows[i].platform, error: String(r.reason) }
        const res = r.value as Response
        if (res.ok) return { platform: rows[i].platform, ok: true }
        return { platform: rows[i].platform, status: res.status, body: await res.text() }
      })
    )

    return new Response(JSON.stringify({ sent, total: rows.length, details }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
