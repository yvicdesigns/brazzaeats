// Envoie des notifications push (FCM v1) à un ensemble d'utilisateurs.
// Appelée en interne par des triggers Postgres (via pg_net) à chaque
// événement pertinent (nouvelle commande, commande prête, statut changé).
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const FIREBASE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function pemToBinary(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function getAccessToken(): Promise<string> {
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

Deno.serve(async (req) => {
  try {
    const { user_ids, title, body, data } = await req.json()
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_ids requis' }), { status: 400 })
    }

    const idsFilter = user_ids.map((id: string) => `"${id}"`).join(',')
    const tokensRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_tokens?user_id=in.(${idsFilter})&select=token`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    )
    const tokensData = await tokensRes.json()
    const tokens: string[] = Array.isArray(tokensData) ? tokensData.map((t: any) => t.token) : []

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), { status: 200 })
    }

    const accessToken = await getAccessToken()

    const results = await Promise.allSettled(
      tokens.map((token) =>
        fetch(
          `https://fcm.googleapis.com/v1/projects/${FIREBASE_SERVICE_ACCOUNT.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
              },
            }),
          }
        )
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return new Response(JSON.stringify({ sent, total: tokens.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
