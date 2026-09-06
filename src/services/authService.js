// Couche service Auth — réinitialisation du mot de passe par code SMS.
// Passe par l'edge function 'password-reset', seule détentrice de la clé service_role.
import { supabase } from '@/supabase/client'

async function appelerPasswordReset(action, payload) {
  const { data, error } = await supabase.functions.invoke('password-reset', {
    body: { action, payload },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

/**
 * Demande l'envoi d'un code de vérification par SMS au numéro donné.
 * ⚠️ Tant qu'aucun fournisseur SMS n'est branché côté serveur, le code est
 * retourné directement dans la réponse (data.debug_code) pour permettre de
 * tester le parcours complet sans SMS réel.
 */
export async function demanderCodeSMS(telephone) {
  try {
    const data = await appelerPasswordReset('demander', { telephone })
    return { debugCode: data?.debug_code ?? null, error: null }
  } catch (err) {
    return { debugCode: null, error: err.message }
  }
}

/**
 * Vérifie le code saisi par l'utilisateur. Retourne un jeton opaque à usage
 * unique à transmettre à `reinitialiserMotDePasse`.
 */
export async function verifierCodeSMS(telephone, code) {
  try {
    const data = await appelerPasswordReset('verifier', { telephone, code })
    return { resetToken: data?.reset_token ?? null, error: null }
  } catch (err) {
    return { resetToken: null, error: err.message }
  }
}

/**
 * Change effectivement le mot de passe — nécessite un jeton de reset valide,
 * obtenu après vérification du code.
 */
export async function reinitialiserMotDePasse(telephone, resetToken, nouveauMotDePasse) {
  try {
    await appelerPasswordReset('reinitialiser', {
      telephone,
      reset_token: resetToken,
      nouveau_mot_de_passe: nouveauMotDePasse,
    })
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}
