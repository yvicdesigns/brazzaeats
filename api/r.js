// zandofood.com/r/<slug> — lien court d'un restaurant (QR code, partages).
// Renvoie une petite page avec l'aperçu Facebook / WhatsApp / Instagram
// (nom, description, photo), puis envoie aussitôt le visiteur sur la page
// du restaurant dans le site.

const SITE = 'https://zandofood.com'

const echapper = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export default async function handler(req, res) {
  const slug = String(req.query.slug ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80)
  const url = process.env.VITE_SUPABASE_URL
  const cle = process.env.VITE_SUPABASE_ANON_KEY

  let resto = null
  if (slug && url && cle) {
    try {
      const r = await fetch(
        `${url}/rest/v1/restaurants?slug=eq.${slug}&deleted_at=is.null&select=id,nom,description,adresse,photo_couverture_url,logo_url&limit=1`,
        { headers: { apikey: cle, Authorization: `Bearer ${cle}` } },
      )
      if (r.ok) resto = (await r.json())[0] ?? null
    } catch { /* aperçu générique ci-dessous */ }
  }

  const cible = resto ? `/restaurant/${resto.id}` : '/'
  const titre = resto ? `${resto.nom} — commandez sur Zandofood` : 'Zandofood'
  const description = resto
    ? (resto.description || `Commandez chez ${resto.nom} à Brazzaville : livraison ou retrait.`)
    : 'Commandez vos plats préférés à Brazzaville.'
  const image = resto?.photo_couverture_url || resto?.logo_url || `${SITE}/icons/icon-512x512.png`
  const lien = `${SITE}/r/${slug}`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.status(resto ? 200 : 404).send(`<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${echapper(titre)}</title>
<meta name="description" content="${echapper(description)}">
<link rel="canonical" href="${echapper(lien)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Zandofood">
<meta property="og:title" content="${echapper(titre)}">
<meta property="og:description" content="${echapper(description)}">
<meta property="og:image" content="${echapper(image)}">
<meta property="og:url" content="${echapper(lien)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${echapper(cible)}">
</head><body>
<script>location.replace(${JSON.stringify(cible)})</script>
<p><a href="${echapper(cible)}">Ouvrir ${echapper(resto?.nom ?? 'Zandofood')}</a></p>
</body></html>`)
}
