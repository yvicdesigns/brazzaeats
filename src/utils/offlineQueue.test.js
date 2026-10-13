import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Le module a un état interne au niveau module (la file en mémoire) et
// démarre un setInterval + un listener 'online' à l'import — on le
// réimporte "frais" à chaque test (vi.resetModules) pour repartir d'une
// file vide à chaque fois, plutôt que de dépendre de l'ordre des tests.
async function importerModuleFrais() {
  localStorage.clear()
  vi.resetModules()
  return await import('./offlineQueue')
}

describe('estErreurReseau', () => {
  let estErreurReseau

  beforeEach(async () => {
    ;({ estErreurReseau } = await importerModuleFrais())
  })

  it('true si le navigateur est hors-ligne, quelle que soit l\'erreur', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(estErreurReseau(new Error('peu importe'))).toBe(true)
    spy.mockRestore()
  })

  it('true pour les messages d\'erreur réseau connus', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    expect(estErreurReseau(new Error('Failed to fetch'))).toBe(true)
    expect(estErreurReseau(new Error('Network request failed'))).toBe(true)
    expect(estErreurReseau(new Error('Load failed'))).toBe(true)
    expect(estErreurReseau({ message: 'Timeout' })).toBe(true)
  })

  it('false pour un vrai rejet serveur (ex: droits, donnée invalide)', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    expect(estErreurReseau(new Error('permission denied'))).toBe(false)
    expect(estErreurReseau({ message: 'duplicate key value violates unique constraint' })).toBe(false)
  })
})

describe('enfiler / nbEnAttente / surChangement', () => {
  it('ajoute un élément et notifie les abonnés', async () => {
    const { enfiler, nbEnAttente, surChangement } = await importerModuleFrais()

    const tailles = []
    const desabonner = surChangement(t => tailles.push(t))

    expect(nbEnAttente()).toBe(0)
    enfiler('markDelivered', { orderId: 'abc' })
    expect(nbEnAttente()).toBe(1)
    expect(tailles).toContain(1)

    desabonner()
  })

  it('persiste la file en localStorage (survit à un rechargement)', async () => {
    const { enfiler } = await importerModuleFrais()
    enfiler('markDelivered', { orderId: 'xyz' })

    const brut = localStorage.getItem('zando_offline_queue_v1')
    const file = JSON.parse(brut)
    expect(file).toHaveLength(1)
    expect(file[0].type).toBe('markDelivered')
    expect(file[0].payload).toEqual({ orderId: 'xyz' })
  })
})

describe('traiterFile', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })
  afterEach(() => vi.restoreAllMocks())

  it('retire un élément de la file quand le handler réussit', async () => {
    const { enfiler, traiterFile, nbEnAttente, enregistrerHandler } = await importerModuleFrais()
    enregistrerHandler('markDelivered', vi.fn().mockResolvedValue(undefined))

    enfiler('markDelivered', { orderId: '1' })
    expect(nbEnAttente()).toBe(1)

    await traiterFile()
    expect(nbEnAttente()).toBe(0)
  })

  it('garde l\'élément en file et programme un nouvel essai sur erreur réseau', async () => {
    const { enfiler, traiterFile, nbEnAttente, enregistrerHandler } = await importerModuleFrais()
    enregistrerHandler('markDelivered', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    enfiler('markDelivered', { orderId: '1' })
    await traiterFile()

    // Toujours en file — un retry sera tenté plus tard, pas abandonné.
    expect(nbEnAttente()).toBe(1)
  })

  it('abandonne (retire) l\'élément sur un vrai rejet serveur, pas de boucle infinie', async () => {
    const { enfiler, traiterFile, nbEnAttente, enregistrerHandler } = await importerModuleFrais()
    enregistrerHandler('markDelivered', vi.fn().mockRejectedValue(new Error('permission denied')))

    enfiler('markDelivered', { orderId: '1' })
    await traiterFile()

    expect(nbEnAttente()).toBe(0)
  })

  it('un type d\'action sans handler enregistré est laissé de côté sans planter', async () => {
    const { enfiler, traiterFile, nbEnAttente } = await importerModuleFrais()
    enfiler('type_inconnu_version_future', { x: 1 })

    await expect(traiterFile()).resolves.not.toThrow()
    // Ni perdu, ni traité — laissé en file en attendant une version de
    // l'app qui connaît ce type (voir le commentaire dans offlineQueue.js).
    expect(nbEnAttente()).toBe(1)
  })
})
