import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const serviceRoleKey  = import.meta.env.VITE_SUPABASE_SERVICE_KEY

/**
 * Client Supabase avec la clé service_role.
 * Utilisé UNIQUEMENT dans les fonctions admin pour gérer les comptes auth.
 * Ce client bypasse les RLS — ne l'utiliser que côté admin.
 */
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null
