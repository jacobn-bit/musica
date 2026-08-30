"use strict";

const {
  buildCandidatePool, cacheIsFresh, createSupabaseClient, fetchAllAlbums, fetchOverviewMap,
  generateRecommendations, hydrateRecommendationRows, readCachedRecommendations, saveRecommendations
} = require("./lib/recommendation-service");

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const activeGenerations = new Map();

function response(statusCode, body) { return { statusCode, headers, body: JSON.stringify(body) }; }

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
    const cached = await readCachedRecommendations(api, albumId);
    if (!force && cacheIsFresh(cached)) {
      return response(200, { ok: true, cached: true, recommendations: hydrateRecommendationRows(cached, albums) });
    }
    if (activeGenerations.has(albumId)) {
      const rows = await activeGenerations.get(albumId);
      return response(200, { ok: true, cached: false, recommendations: hydrateRecommendationRows(rows, albums) });
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
      return response(200, { ok: true, cached: false, recommendations: hydrateRecommendationRows(rows, albums) });
    } finally { activeGenerations.delete(albumId); }
  } catch (error) {
    console.error("[Muze recommendations] Request failed", error);
    return response(error.status || 500, { error: error.message || "Recommendations could not be generated." });
  }
};
