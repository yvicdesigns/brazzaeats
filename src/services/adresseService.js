import { supabase } from '@/supabase/client'

export async function getAdresses(clientId) {
  const { data, error } = await supabase
    .from('adresses_clients')
    .select('*')
    .eq('client_id', clientId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  return { data: data ?? [], error: error?.message ?? null }
}

export async function addAdresse(clientId, adresse) {
  const { data, error } = await supabase
    .from('adresses_clients')
    .insert({ client_id: clientId, ...adresse })
    .select()
    .single()
  return { data, error: error?.message ?? null }
}

export async function updateAdresse(id, updates) {
  const { error } = await supabase
    .from('adresses_clients')
    .update(updates)
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteAdresse(id) {
  const { error } = await supabase
    .from('adresses_clients')
    .delete()
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function setAdresseDefaut(clientId, id) {
  // Retirer le défaut de toutes les adresses, puis définir la nouvelle
  await supabase
    .from('adresses_clients')
    .update({ is_default: false })
    .eq('client_id', clientId)
  const { error } = await supabase
    .from('adresses_clients')
    .update({ is_default: true })
    .eq('id', id)
  return { error: error?.message ?? null }
}
