// Edge Function — opérations admin nécessitant la clé service_role.
// La clé service_role vit UNIQUEMENT ici (secret serveur), jamais dans le bundle client.
// Le caller doit être authentifié ET avoir role = 'admin' dans profiles.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')
  const anonKey      = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  try {
    // ── Vérifier l'identité et le rôle du caller ──────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié' }, 401)

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) return json({ error: 'Session invalide' }, 401)

    const { data: profile, error: profileErr } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || profile?.role !== 'admin') {
      return json({ error: 'Accès refusé — réservé aux administrateurs' }, 403)
    }

    // ── Client service_role — bypass RLS, ne quitte jamais le serveur ──
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const { action, payload } = await req.json()

    switch (action) {

      // ── Créer un compte restaurant ──────────────────────────
      case 'createRestaurant': {
        const { nom, adresse, telephone, motDePasse, commissionRate = 10 } = payload
        const email = phoneToFakeEmail(telephone)

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: motDePasse,
          email_confirm: true,
          user_metadata: { nom, telephone, role: 'restaurant' },
        })
        if (authError) throw authError

        const userId = authData.user?.id
        if (!userId) throw new Error('Impossible de créer le compte')

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({ id: userId, nom, telephone, role: 'restaurant' }, { onConflict: 'id' })
        if (profileError) throw profileError

        const { data: resto, error: restoError } = await supabaseAdmin
          .from('restaurants')
          .insert({
            owner_id: userId,
            nom,
            adresse: adresse || null,
            statut: 'en_attente',
            commission_rate: commissionRate,
          })
          .select()
          .single()
        if (restoError) throw restoError

        return json({ data: resto })
      }

      // ── Supprimer un restaurant + son compte auth ───────────
      case 'deleteRestaurant': {
        const { restaurantId, ownerId } = payload

        const { error: restoError } = await supabaseAdmin
          .from('restaurants').delete().eq('id', restaurantId)
        if (restoError) throw restoError

        await supabaseAdmin.from('profiles').delete().eq('id', ownerId)
        await supabaseAdmin.auth.admin.deleteUser(ownerId)

        return json({ data: true })
      }

      // ── Créer un compte livreur ──────────────────────────────
      case 'createLivreur': {
        const { nom, telephone, motDePasse, vehicule = 'moto', zone = null } = payload
        const email = phoneToFakeEmail(telephone)

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: motDePasse,
          email_confirm: true,
          user_metadata: { nom, telephone, role: 'livreur' },
        })
        if (authError) throw authError

        const userId = authData.user?.id
        if (!userId) throw new Error('Impossible de créer le compte')

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({ id: userId, nom, telephone, role: 'livreur' }, { onConflict: 'id' })
        if (profileError) throw profileError

        const { data: livreur, error: livreurError } = await supabaseAdmin
          .from('livreurs')
          .insert({ id: userId, statut: 'en_attente', vehicule, zone })
          .select()
          .single()
        if (livreurError) throw livreurError

        return json({ data: { ...livreur, profile: { id: userId, nom, telephone } } })
      }

      // ── Supprimer un livreur + son compte auth ──────────────
      case 'deleteLivreur': {
        const { id } = payload
        await supabaseAdmin.from('livreurs').delete().eq('id', id)
        await supabaseAdmin.from('profiles').delete().eq('id', id)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
        if (error) throw error
        return json({ data: true })
      }

      // ── Changer le mot de passe d'un utilisateur ────────────
      case 'changePassword': {
        const { userId, newPassword } = payload
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        })
        if (error) throw error
        return json({ data: true })
      }

      // ── Mettre à jour l'email auth d'un propriétaire ────────
      case 'updateOwnerEmail': {
        const { ownerId, telephone } = payload
        const fakeEmail = phoneToFakeEmail(telephone)
        const { error } = await supabaseAdmin.auth.admin.updateUserById(ownerId, {
          email: fakeEmail,
        })
        if (error) throw error
        return json({ data: true })
      }

      default:
        return json({ error: `Action inconnue : ${action}` }, 400)
    }
  } catch (err) {
    return json({ error: err.message ?? String(err) }, 500)
  }
})
