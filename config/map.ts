/**
 * Background map tiles for the state map.
 *
 * Stadia Maps "Alidade Smooth": a clean light basemap. Works without an API
 * key on localhost; a hosted deployment needs a (free) Stadia account with the
 * domain registered — see https://docs.stadiamaps.com/authentication/.
 *
 * (CARTO's basemaps were the first choice but now require an API key.)
 * To switch provider, change `url` and `attribution` here.
 */
export const BASEMAP = {
  url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 20,
};
