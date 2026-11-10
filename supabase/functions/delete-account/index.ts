// Edge Function — suppression définitive du compte par son propriétaire.
// Exigée par Apple (Guideline 5.1.1(v)) pour toute app permettant la création
// de compte en self-service — seul le rôle 'client' s'inscrit lui-même dans
// Zandofood (restaurants/livreurs sont créés par un admin via admin-users).
// La clé service_role vit UNIQUEMENT ici, jamais dans le bundle client.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  try {
    // ── Identifier l'appelant à partir de son propre token ───
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié' }, 401)

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) return json({ error: 'Session invalide' }, 401)

    // ── Un compte ne peut supprimer que lui-même ──────────────
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // Anonymise les données personnelles identifiables avant suppression
    // du compte auth — certaines lignes liées (commandes passées, avis)
    // sont conservées pour l'historique des restaurants/livreurs, mais
    // ne doivent plus pouvoir être rattachées à une personne identifiable.
    await supabaseAdmin
      .from('profiles')
      .update({
        nom:        'Compte supprimé',
        telephone:  null,
        email:      null,
        photo_url:  null,
        actif:      false,
      })
      .eq('id', user.id)

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteErr) throw deleteErr

    return json({ success: true })
  } catch (err) {
    return json({ error: err.message ?? String(err) }, 500)
  }
})
