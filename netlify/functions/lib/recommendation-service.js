"use strict";

const PROMPT_VERSION = "muze-recommendations-v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 60;

function clean(value, max = 500) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/[’']/g, "").replace(/&/g, " and ")
    .replace(/\([^)]*(remaster(?:ed)?|deluxe|expanded|anniversary|edition|version|bonus)[^)]*\)/gi, " ")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function textTokens(album) {
  const ignored = new Set(["album", "music", "record", "sound", "artist", "their", "with", "from", "this", "that", "into"]);
  return new Set(normalize([album.genre, album.summary, album.sound_summary, album.overview].filter(Boolean).join(" "))
    .split(" ").filter(token => token.length > 3 && !ignored.has(token)));
}

function candidateScore(source, candidate) {
  const sourceGenre = normalize(source.genre);
  const candidateGenre = normalize(candidate.genre);
  let value = sourceGenre && candidateGenre === sourceGenre ? 24 : 0;
  const sourceGenreParts = new Set(sourceGenre.split(" ").filter(Boolean));
  candidateGenre.split(" ").forEach(token => { if (token && token !== "rock" && sourceGenreParts.has(token)) value += 8; });
  const sourceTokens = textTokens(source);
  textTokens(candidate).forEach(token => { if (sourceTokens.has(token)) value += 3; });
  const sourceYear = Number(source.year) || 0;
  const candidateYear = Number(candidate.year) || 0;
  if (sourceYear && candidateYear) {
    const distance = Math.abs(sourceYear - candidateYear);
    value += distance <= 3 ? 8 : distance <= 8 ? 5 : distance <= 15 ? 2 : 0;
  }
  value += Math.min(5, Math.max(0, Number(candidate.avg_rating || 0) - 7));
  return value;
}

function buildCandidatePool(source, albums, overviewById = new Map(), limit = 28) {
  const sourceId = String(source.id || "");
  const enriched = (albums || []).filter(album => String(album.id || "") !== sourceId && album.cover_url)
    .map(album => ({ ...album, ...(overviewById.get(String(album.id)) || {}) }));
  const ranked = enriched.map(album => ({ album, score: candidateScore(source, album) }))
    .sort((a, b) => b.score - a.score || Number(b.album.avg_rating || 0) - Number(a.album.avg_rating || 0));
  const selected = [];
  const artistCounts = new Map();
  for (const entry of ranked) {
    const artist = normalize(entry.album.artist);
    if ((artistCounts.get(artist) || 0) >= 2) continue;
    selected.push(entry.album);
    artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    if (selected.length >= limit) break;
  }
  return selected;
}

async function fetchJson(url, options = {}, timeoutMs = 65000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { throw new Error(`Remote service returned invalid JSON (${response.status}).`); }
    if (!response.ok) {
      const error = new Error(data?.error?.message || data?.message || data?.error || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") { const timeout = new Error("The recommendation request timed out."); timeout.status = 504; throw timeout; }
    throw error;
  } finally { clearTimeout(timer); }
}

function createSupabaseClient(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service settings are missing.");
  const authHeaders = { "Content-Type": "application/json", apikey: key };
  if (!key.startsWith("sb_")) authHeaders.Authorization = `Bearer ${key}`;
  return (path, options = {}) => fetchJson(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { ...authHeaders, ...(options.headers || {}) }
  }, 30000);
}

async function fetchAllAlbums(api) {
  const rows = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    const batch = await api(`album_scores?select=id,title,artist,year,genre,cover_url,summary,avg_rating,ratings_count&order=avg_rating.desc&limit=1000&offset=${offset}`);
    rows.push(...(batch || []));
    if (!batch || batch.length < 1000) break;
  }
  return rows;
}

async function fetchOverviewMap(api, ids) {
  if (!ids.length) return new Map();
  try {
    const rows = await api(`album_overviews?album_id=in.(${ids.map(id => `"${String(id).replace(/"/g, "")}"`).join(",")})&select=album_id,overview,sound_summary,impact_summary,legacy_summary,mood_tags,vibe_tags`);
    return new Map((rows || []).map(row => [String(row.album_id), row]));
  } catch (_) { return new Map(); }
}

function responseOutputText(response) {
  if (typeof response?.output_text === "string") return response.output_text;
  return (response?.output || []).flatMap(item => item.content || []).map(part => part.text || "").join("").trim();
}

function extractWebSources(response) {
  const sources = [];
  const visit = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (typeof value.url === "string" && /^https?:\/\//i.test(value.url)) {
      const item = { url: value.url, title: clean(value.title || value.name || value.url, 200) };
      if (!sources.some(source => source.url === item.url)) sources.push(item);
    }
    Object.values(value).forEach(visit);
  };
  (response?.output || []).filter(item => item.type === "web_search_call").forEach(visit);
  return sources.slice(0, 12);
}

async function generateRecommendations(source, candidates, env = process.env) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  if (candidates.length < 4) throw new Error("Muze needs at least four catalogue candidates.");
  const model = env.OPENAI_RECOMMENDATION_MODEL || "gpt-5.4-mini";
  const candidateIds = candidates.map(album => String(album.id));
  const schema = {
    type: "object", additionalProperties: false, required: ["profile", "recommendations"],
    properties: {
      profile: {
        type: "object", additionalProperties: false,
        required: ["primary_genres", "secondary_genres", "production_traits", "moods", "album_structure", "scene_and_era"],
        properties: {
          primary_genres: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
          secondary_genres: { type: "array", maxItems: 6, items: { type: "string" } },
          production_traits: { type: "array", maxItems: 8, items: { type: "string" } },
          moods: { type: "array", maxItems: 8, items: { type: "string" } },
          album_structure: { type: "array", maxItems: 6, items: { type: "string" } },
          scene_and_era: { type: "array", maxItems: 6, items: { type: "string" } }
        }
      },
      recommendations: {
        type: "array", minItems: 4, maxItems: 4,
        items: {
          type: "object", additionalProperties: false,
          required: ["album_id", "similarity_score", "relationship", "reason", "confidence"],
          properties: {
            album_id: { type: "string", enum: candidateIds },
            similarity_score: { type: "integer", minimum: 0, maximum: 100 },
            relationship: { type: "string", enum: ["sonic", "production", "mood", "album_structure", "scene_and_era", "multi_dimensional"] },
            reason: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        }
      }
    }
  };
  const system = [
    "You are Muze's music-recommendation editor.",
    "Research the source album with web search, then choose exactly four genuinely similar listening recommendations from the supplied Muze catalogue candidates.",
    "Similarity means shared sound, subgenre, production, mood, album construction, or scene—not merely fame or community rating.",
    "Do not claim influence unless the evidence explicitly establishes it. This output is for More like this, not Influence & Legacy.",
    "Use only supplied album IDs. Do not recommend another album by the source artist, and never select two albums by the same artist.",
    "Reasons must be specific, concise, and grounded in musical characteristics."
  ].join(" ");
  const input = {
    source_album: {
      id: String(source.id), title: clean(source.title, 180), artist: clean(source.artist, 180), year: source.year || null,
      stored_genre: clean(source.genre, 120), summary: clean(source.summary, 500), sound_summary: clean(source.sound_summary, 500)
    },
    catalogue_candidates: candidates.map(album => ({
      album_id: String(album.id), title: clean(album.title, 180), artist: clean(album.artist, 180), year: album.year || null,
      genre: clean(album.genre, 120), summary: clean(album.summary, 260), sound_summary: clean(album.sound_summary, 260)
    }))
  };
  const body = {
    model,
    reasoning: { effort: "low" },
    input: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(input) }],
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    max_tool_calls: 3,
    max_output_tokens: 1400,
    include: ["web_search_call.action.sources"],
    text: { verbosity: "low", format: { type: "json_schema", name: "muze_album_recommendations", strict: true, schema } }
  };
  if (env.OPENAI_RECOMMENDATION_SERVICE_TIER) body.service_tier = env.OPENAI_RECOMMENDATION_SERVICE_TIER;
  const response = await fetchJson("https://api.openai.com/v1/responses", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: JSON.stringify(body)
  }, 90000);
  const parsed = JSON.parse(responseOutputText(response));
  const allowed = new Map(candidates.map(album => [String(album.id), album]));
  const seen = new Set();
  const seenArtists = new Set();
  const sourceArtist = normalize(source.artist);
  const recommendations = (parsed.recommendations || []).filter(item => {
    const album=allowed.get(String(item.album_id));
    const artist=normalize(album?.artist);
    if(!album||!artist||artist===sourceArtist||seen.has(String(item.album_id))||seenArtists.has(artist))return false;
    seenArtists.add(artist);
    return true;
  }).map(item => {
    seen.add(String(item.album_id));
    return {
      album_id: String(item.album_id), similarity_score: Math.max(0, Math.min(100, Number(item.similarity_score) || 0)),
      relationship: clean(item.relationship, 40), reason: clean(item.reason, 320), confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0))
    };
  });
  if (recommendations.length !== 4) throw new Error("AI did not return four unique Muze catalogue albums.");
  return { model, profile: parsed.profile, recommendations, sources: extractWebSources(response) };
}

function cacheIsFresh(rows) {
  if (!Array.isArray(rows) || rows.length < 4) return false;
  if (rows.slice(0, 4).every(row => row.prompt_version === "muze-manual-recommendations-v1")) return true;
  const generatedAt = Math.min(...rows.map(row => Date.parse(row.generated_at || 0)).filter(Number.isFinite));
  return Number.isFinite(generatedAt) && Date.now() - generatedAt < CACHE_MAX_AGE_MS;
}

async function readSimilarityProfile(api, albumId) {
  const rows = await api(`album_similarity_profiles?album_id=eq.${encodeURIComponent(albumId)}&select=profile,sources,generation_model,prompt_version,generated_at&limit=1`).catch(() => []);
  return rows?.[0] || null;
}

function manualInfluenceIds(profileRow) {
  const manual = profileRow?.profile?.manual_influence || {};
  const valid = value => Array.from(new Set((Array.isArray(value) ? value : []).map(String).filter(Boolean))).slice(0, 2);
  return { earlier: valid(manual.earlier), later: valid(manual.later) };
}

function hydrateManualInfluence(profileRow, albums) {
  const ids = manualInfluenceIds(profileRow);
  const byId = new Map((albums || []).map(album => [String(album.id), album]));
  return {
    earlier: ids.earlier.map(id => byId.get(id)).filter(Boolean),
    later: ids.later.map(id => byId.get(id)).filter(Boolean),
    manual: Boolean(profileRow?.profile && Object.prototype.hasOwnProperty.call(profileRow.profile, "manual_influence"))
  };
}

async function saveManualDiscovery(api, source, albums, input) {
  const catalogue = new Map((albums || []).map(album => [String(album.id), album]));
  const uniqueIds = (value, limit) => Array.from(new Set((Array.isArray(value) ? value : []).map(String).filter(id => id !== String(source.id) && catalogue.has(id)))).slice(0, limit);
  const moreLikeIds = uniqueIds(input.more_like_ids, 4);
  const earlier = uniqueIds(input.influenced_by_ids, 2);
  const later = uniqueIds(input.influenced_ids, 2);
  if (moreLikeIds.length !== 4) throw Object.assign(new Error("Choose exactly four More like this albums."), { status: 400 });
  const now = new Date().toISOString();
  await api(`album_recommendations?source_album_id=eq.${encodeURIComponent(source.id)}`, { method: "DELETE" });
  const rows = moreLikeIds.map((targetId, index) => ({
    source_album_id: String(source.id), target_album_id: targetId, position: index + 1,
    similarity_score: 100 - index, relationship: "multi_dimensional", reason: "Manually curated by Muze admin.", confidence: 1,
    sources: [], generation_model: "manual", prompt_version: "muze-manual-recommendations-v1", generated_at: now, updated_at: now
  }));
  await api("album_recommendations", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });

  const existing = await readSimilarityProfile(api, source.id);
  const profile = { ...(existing?.profile || {}), manual_influence: { earlier, later } };
  await api("album_similarity_profiles", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ album_id: String(source.id), profile, sources: existing?.sources || [], generation_model: existing?.generation_model || "manual", prompt_version: existing?.prompt_version || "muze-manual-discovery-v1", generated_at: existing?.generated_at || now, updated_at: now })
  });
  return { rows, profile: { ...existing, profile } };
}

async function readCachedRecommendations(api, albumId) {
  try {
    return await api(`album_recommendations?source_album_id=eq.${encodeURIComponent(albumId)}&select=*&order=position.asc&limit=4`);
  } catch (error) {
    if (error.status === 404 || /album_recommendations/i.test(error.message)) return [];
    throw error;
  }
}

async function saveRecommendations(api, source, generated) {
  const now = new Date().toISOString();
  const existingProfile = await readSimilarityProfile(api, source.id);
  const manualInfluence = existingProfile?.profile?.manual_influence;
  const profileRow = {
    album_id: String(source.id), profile: manualInfluence ? { ...generated.profile, manual_influence: manualInfluence } : generated.profile, sources: generated.sources, generation_model: generated.model,
    prompt_version: PROMPT_VERSION, generated_at: now, updated_at: now
  };
  await api("album_similarity_profiles", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(profileRow)
  });
  await api(`album_recommendations?source_album_id=eq.${encodeURIComponent(source.id)}`, { method: "DELETE" });
  const rows = generated.recommendations.map((item, index) => ({
    source_album_id: String(source.id), target_album_id: item.album_id, position: index + 1,
    similarity_score: item.similarity_score, relationship: item.relationship, reason: item.reason, confidence: item.confidence,
    sources: generated.sources, generation_model: generated.model, prompt_version: PROMPT_VERSION, generated_at: now, updated_at: now
  }));
  await api("album_recommendations", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
  return rows;
}

function hydrateRecommendationRows(rows, albums) {
  const byId = new Map((albums || []).map(album => [String(album.id), album]));
  return (rows || []).map(row => ({ ...row, album: byId.get(String(row.target_album_id)) || null })).filter(row => row.album);
}

module.exports = {
  PROMPT_VERSION, buildCandidatePool, cacheIsFresh, candidateScore, createSupabaseClient, fetchAllAlbums,
  fetchOverviewMap, generateRecommendations, hydrateManualInfluence, hydrateRecommendationRows, manualInfluenceIds,
  readCachedRecommendations, readSimilarityProfile, saveManualDiscovery, saveRecommendations
};
