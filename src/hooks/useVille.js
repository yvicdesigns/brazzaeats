import { useState } from 'react'

const CLE = 'zandofood-ville'

/**
 * Hook global — gère la ville sélectionnée par le client.
 * Persiste en localStorage. null = pas encore choisi (affiche SelectVille).
 */
export function useVille() {
  const [ville, setVilleState] = useState(() => localStorage.getItem(CLE) ?? null)

  function setVille(v) {
    localStorage.setItem(CLE, v)
    setVilleState(v)
  }

  function effacerVille() {
    localStorage.removeItem(CLE)
    setVilleState(null)
  }

  return { ville, setVille, effacerVille }
}
