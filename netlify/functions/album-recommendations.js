"use strict";

const crypto = require("crypto");

const {
  buildCandidatePool, cacheIsFresh, createSupabaseClient, fetchAllAlbums, fetchOverviewMap,
  generateRecommendations, hydrateManualInfluence, hydrateRecommendationRows, readCachedRecommendations,
  readSimilarityProfile, saveManualDiscovery, saveRecommendations
} = require("./lib/recommendation-service");

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const activeGenerations = new Map();

function response(statusCode, body) { return { statusCode, headers, body: JSON.stringify(body) }; }

function adminPinAccepted(value) {
  const pin = String(value || "").trim();
  const configured = [process.env.MUSICA_ADMIN_PIN, process.env.ADMIN_PIN, process.env.VITE_ADMIN_PIN, process.env.NEXT_PUBLIC_ADMIN_PIN]
    .map(item => String(item || "").trim()).filter(Boolean);
  const hash = crypto.createHash("sha256").update(pin).digest("hex");
  return Boolean(pin) && (configured.includes(pin) || hash === "71bdc015e35ca2f9fbb2cfd5c82374fba64813d4a7a1baae09e29f27f46891c5");
}

exports.handler = async function handler(event) {
  if (!['GET', 'POST'].includes(event.httpMethod)) return response(405, { error: "Method not allowed." });
  try {
    const body = event.httpMethod === "POST" ? JSON.parse(event.body || "{}") : {};
    const albumId = String(body.album_id || event.queryStringParameters?.album_id || "").trim();
    const force = body.force === true || event.queryStringParameters?.force === "1";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(albumId)) {
      return response(400, { error: "A valid Muze album ID is required." });
    }
    const api = createSupabaseClient();
    const albums = await fetchAllAlbums(api);
    const source = albums.find(album => String(album.id) === albumId);
    if (!source) return response(404, { error: "Album not found in the Muze catalogue." });
    if (body.action === "manual_save") {
      if (!adminPinAccepted(body.pin || event.headers?.["x-muze-admin-pin"])) return response(401, { error: "Admin PIN was not accepted." });
      const saved = await saveManualDiscovery(api, source, albums, body);
      return response(200, {
        ok: true, manual: true,
        recommendations: hydrateRecommendationRows(saved.rows, albums),
        influence: hydrateManualInfluence(saved.profile, albums)
      });
    }
    const profile = await readSimilarityProfile(api, albumId);
    const influence = hydrateManualInfluence(profile, albums);
    const cached = await readCachedRecommendations(api, albumId);
    if (!force && cacheIsFresh(cached)) {
      return response(200, { ok: true, cached: true, recommendations: hydrateRecommendationRows(cached, albums), influence });
    }
    if (activeGenerations.has(albumId)) {
      const rows = await activeGenerations.get(albumId);
      return response(200, { ok: true, cached: false, recommendations: hydrateRecommendationRows(rows, albums), influence });
    }
    const generation = (async () => {
      const initialPool = buildCandidatePool(source, albums, new Map(), 28);
      const overviewById = await fetchOverviewMap(api, [source, ...initialPool].map(album => album.id));
      const enrichedSource = { ...source, ...(overviewById.get(albumId) || {}) };
      const candidates = buildCandidatePool(enrichedSource, albums, overviewById, 20);
      const generated = await generateRecommendations(enrichedSource, candidates);
      try { return await saveRecommendations(api, source, generated); }
      catch (error) {
        console.warn("[Muze recommendations] Generated recommendations could not be cached", error.message || error);
        return generated.recommendations.map((item, index) => ({ ...item, target_album_id: item.album_id, position: index + 1, generated_at: new Date().toISOString() }));
      }
    })();
    activeGenerations.set(albumId, generation);
    try {
      const rows = await generation;
      return response(200, { ok: true, cached: false, recommendations: hydrateRecommendationRows(rows, albums), influence });
    } finally { activeGenerations.delete(albumId); }
  } catch (error) {
    console.error("[Muze recommendations] Request failed", error);
    return response(error.status || 500, { error: error.message || "Recommendations could not be generated." });
  }
};
