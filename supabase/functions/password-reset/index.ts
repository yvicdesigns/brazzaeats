// Edge Function — réinitialisation du mot de passe par code SMS.
// La clé service_role vit UNIQUEMENT ici (secret serveur), jamais dans le bundle client.
// Appelée par un utilisateur NON authentifié (c'est tout l'intérêt : il a oublié son
// mot de passe) — la sécurité repose sur la connaissance du téléphone + du code à usage
// unique, plus une expiration courte et un jeton opaque entre la vérification et le
// changement effectif du mot de passe.
//
// ⚠️ MODE TEMPORAIRE : aucun fournisseur SMS n'est encore connecté. L'action "demander"
// renvoie le code dans la réponse (debug_code) pour permettre de tester tout le parcours
// sans SMS réel. Dès qu'un fournisseur (Twilio ou équivalent) est branché, retirer
// debug_code et envoyer réellement le SMS à cet endroit — le reste du flux ne change pas.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function phoneToFakeEmail(telephone) {
  const digits = telephone.replace(/[^0-9]/g, '')
  return `p${digits}@brazzaeats.local`
}

function normaliserTelephone(telephone) {
  // Uniformise en +242XXXXXXXXX pour que "demander" et "verifier" ciblent la même ligne
  const digits = telephone.replace(/[^0-9]/g, '')
  const neuf   = digits.slice(-9) // les 9 derniers chiffres (numéro local)
  return `+242${neuf}`
}

const DUREE_CODE_MIN     = 10  // minutes avant expiration du code
const DUREE_TOKEN_MIN    = 15  // minutes avant expiration du jeton de reset (après vérif code)
const DELAI_ENTRE_ENVOIS = 60  // secondes minimum entre deux demandes pour un même numéro

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabase    = createClient(supabaseUrl, serviceKey)

  try {
    const { action, payload } = await req.json()

    switch (action) {

      // ── Demander un code — génère, stocke, "envoie" (stub pour l'instant) ──
      case 'demander': {
        const telephone = normaliserTelephone(payload?.telephone ?? '')
        if (telephone.length !== 13) return json({ error: 'Numéro de téléphone invalide' }, 400)

        // Vérifie qu'un compte existe bien pour ce numéro — mais répond de façon
        // identique dans tous les cas pour ne pas révéler si le numéro est enregistré.
        const { data: profil } = await supabase
          .from('profiles')
          .select('id')
          .eq('telephone', telephone)
          .maybeSingle()

        // Anti-spam : pas plus d'un envoi par minute pour le même numéro
        const { data: recent } = await supabase
          .from('codes_reinitialisation')
          .select('created_at')
          .eq('telephone', telephone)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recent && Date.now() - new Date(recent.created_at).getTime() < DELAI_ENTRE_ENVOIS * 1000) {
          return json({ error: 'Veuillez patienter avant de redemander un code' }, 429)
        }

        if (!profil) {
          // Numéro inconnu : on répond "succès" quand même (anti-énumération de comptes)
          return json({ success: true })
        }

        const code = String(Math.floor(1000 + Math.random() * 9000)) // 4 chiffres
        const expiresAt = new Date(Date.now() + DUREE_CODE_MIN * 60000).toISOString()

        const { error: insertErr } = await supabase
          .from('codes_reinitialisation')
          .insert({ telephone, code, expires_at: expiresAt })
        if (insertErr) throw insertErr

        // TODO : remplacer par un envoi SMS réel (Twilio ou équivalent) une fois branché.
        return json({ success: true, debug_code: code })
      }

      // ── Vérifier le code saisi — renvoie un jeton opaque à usage unique ──
      case 'verifier': {
        const telephone = normaliserTelephone(payload?.telephone ?? '')
        const code      = String(payload?.code ?? '').trim()
        if (!code) return json({ error: 'Code requis' }, 400)

        const { data: ligne, error: fetchErr } = await supabase
          .from('codes_reinitialisation')
          .select('*')
          .eq('telephone', telephone)
          .eq('code', code)
          .eq('utilise', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchErr) throw fetchErr
        if (!ligne) return json({ error: 'Code invalide ou expiré' }, 400)

        const resetToken     = crypto.randomUUID()
        const tokenExpiresAt = new Date(Date.now() + DUREE_TOKEN_MIN * 60000).toISOString()

        const { error: updateErr } = await supabase
          .from('codes_reinitialisation')
          .update({ verifie: true, reset_token: resetToken, token_expires_at: tokenExpiresAt })
          .eq('id', ligne.id)
        if (updateErr) throw updateErr

        return json({ success: true, reset_token: resetToken })
      }

      // ── Changer le mot de passe — jeton de reset valide requis ──
      case 'reinitialiser': {
        const telephone     = normaliserTelephone(payload?.telephone ?? '')
        const resetToken     = payload?.reset_token ?? ''
        const nouveauMdp    = payload?.nouveau_mot_de_passe ?? ''

        if (!resetToken || nouveauMdp.length < 8) {
          return json({ error: 'Requête invalide' }, 400)
        }

        const { data: ligne, error: fetchErr } = await supabase
          .from('codes_reinitialisation')
          .select('*')
          .eq('telephone', telephone)
          .eq('reset_token', resetToken)
          .eq('verifie', true)
          .eq('utilise', false)
          .gt('token_expires_at', new Date().toISOString())
          .maybeSingle()

        if (fetchErr) throw fetchErr
        if (!ligne) return json({ error: 'Session de réinitialisation expirée, recommencez' }, 400)

        const { data: authUsers, error: listErr } =
          await supabase.auth.admin.listUsers({ page: 1, perPage: 1, email: phoneToFakeEmail(telephone) })
        if (listErr) throw listErr

        const utilisateur = authUsers?.users?.[0]
        if (!utilisateur) return json({ error: 'Compte introuvable' }, 404)

        const { error: updateAuthErr } =
          await supabase.auth.admin.updateUserById(utilisateur.id, { password: nouveauMdp })
        if (updateAuthErr) throw updateAuthErr

        await supabase
          .from('codes_reinitialisation')
          .update({ utilise: true })
          .eq('id', ligne.id)

        return json({ success: true })
      }

      default:
        return json({ error: 'Action inconnue' }, 400)
    }
  } catch (err) {
    console.error('[password-reset]', err)
    return json({ error: err.message ?? 'Erreur serveur' }, 500)
  }
})
