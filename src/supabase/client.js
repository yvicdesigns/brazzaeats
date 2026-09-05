import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vérification au démarrage pour un message d'erreur explicite
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Zandofood] Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes.\n' +
    'Copiez .env.example en .env.local et renseignez vos clés Supabase.'
  )
}

// Client singleton partagé dans toute l'application
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Désactive le Navigator Lock UNIQUEMENT en dev (conflits avec le HMR de Vite,
    // un seul onglet donc pas de concurrence réelle). En production on garde le
    // vrai lock de Supabase : il coordonne le rafraîchissement de session entre
    // onglets/webviews, ce qui compte quand plusieurs contextes partagent la
    // même session (ex. PWA + navigateur ouverts en même temps).
    ...(import.meta.env.DEV ? { lock: (name, acquireTimeout, fn) => fn() } : {}),
  },
})
