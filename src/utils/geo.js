/**
 * Distance à vol d'oiseau entre deux points GPS, en kilomètres
 * (formule de haversine — précise à quelques mètres près sur des
 * distances urbaines, ce qui suffit largement à comparer des trajets
 * en ville ou à estimer le quartier le plus proche).
 * @param {{lat:number,lng:number}} a
 * @param {{lat:number,lng:number}} b
 */
export function distanceKm(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}
