const jsonHeaders = { "Content-Type": "application/json" };
const LOG_PREFIX = "[Muze editorial AI]";
const OPENAI_FETCH_TIMEOUT_MS = 45000;
const SUPABASE_FETCH_TIMEOUT_MS = 12000;

function logStep(label, details = {}) {
  console.log(LOG_PREFIX, label, details);
}

function cleanText(value, max = 1400) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeOverviewTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAlbumTitle(title) {
  const editionWords = "deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|edition|version|bonus|mono|stereo|reissue";
  const removableParen = new RegExp(`\\s*\\((?=[^)]*(${editionWords}))[\\s\\S]*?\\)`, "gi");
  const removableBracket = new RegExp(`\\s*\\[(?=[^\\]]*(${editionWords}))[\\s\\S]*?\\]`, "gi");
  const cleaned = String(title || "")
    .replace(/\s*[-\u2013\u2014]\s*(deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|bonus).*$/i, "")
    .replace(removableParen, "")
    .replace(removableBracket, "")
    .replace(/\b(remaster(?:ed)?|deluxe|expanded|anniversary|edition|version)\s*\d{4}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(title || "").trim();
}

function cleanTrackList(tracks) {
  return (Array.isArray(tracks) ? tracks : [])
    .map(track => typeof track === "string" ? track : track?.name)
    .map(track => cleanText(track, 160))
    .filter(Boolean)
    .filter((track, index, all) => all.findIndex(item => normalizeTrackName(item) === normalizeTrackName(track)) === index);
}

function normalizeTrackName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*(remaster(?:ed)?|mono|stereo|mix|version|edit|live|feat\.?|featuring|bonus|take|demo|radio)[^)]*\)/gi, " ")
    .replace(/\[[^\]]*(remaster(?:ed)?|mono|stereo|mix|version|edit|live|feat\.?|featuring|bonus|take|demo|radio)[^\]]*\]/gi, " ")
    .replace(/[-\u2013\u2014]\s*(remaster(?:ed)?|mono|stereo|mix|version|edit|live|feat\.?|featuring|bonus|take|demo|radio).*$/gi, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trackKeyFromName(value) {
  return String(value || "").toLowerCase();
}

function matchTrackName(value, tracklist) {
  const wanted = normalizeTrackName(value);
  if (!wanted) return "";
  return tracklist.find(track => normalizeTrackName(track) === wanted)
    || tracklist.find(track => {
      const candidate = normalizeTrackName(track);
      return candidate && (candidate.includes(wanted) || wanted.includes(candidate));
    })
    || "";
}

function orderDefiningMoments(values, tracklist) {
  const wanted = new Set((Array.isArray(values) ? values : []).map(normalizeTrackName).filter(Boolean));
  const ordered = tracklist.filter(track => wanted.has(normalizeTrackName(track)));
  return ordered.slice(0, 6);
}

function responseOutputText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .flatMap(item => item.content || [])
    .map(part => part.text || "")
    .join("")
    .trim();
}

async function fetchWithTimeout(url, options = {}, label = "request", timeoutMs = OPENAI_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function generateMuzeEditorial(album, tracklist) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["overview", "sound", "impact", "legacy", "tagline", "defining_moments", "most_popular_track"],
    properties: {
      overview: { type: "string" },
      sound: { type: "string" },
      impact: { type: "string" },
      legacy: { type: "string" },
      tagline: { type: "string" },
      defining_moments: { type: "array", minItems: 4, maxItems: 6, items: { type: "string" } },
      most_popular_track: { type: "string" }
    }
  };
  const prompt = [
    "Update Muze's AI album editorial generator to match the actual Muze album format.",
    "",
    "Return ONLY clean structured JSON with these exact keys:",
    "overview, sound, impact, legacy, tagline, defining_moments, most_popular_track.",
    "",
    "Writing style:",
    "Overview: concise but rich, one paragraph. Explain what the album is, where it sits in the artist's catalogue, and why it matters.",
    "The Sound: describe sonic palette, genre blend, production, instrumentation, vocal or rap style, mood, atmosphere, and overall feel.",
    "The Impact: explain commercial, critical, or cultural reception without exaggerating.",
    "The Legacy: explain how the album is viewed today and why it still matters or does not matter.",
    "Tagline: one short quote-style headline, like \"Where the groove comes first.\"",
    "Defining Moments: choose 4-6 tracks only, in the same order as the official tracklist. Do not rank by popularity. Do not invent tracks.",
    "Most Popular Track: choose the album's most widely known, streamed, or culturally recognized track from the supplied tracklist.",
    "",
    "Rules:",
    "Write original Muze editorial copy.",
    "Do not copy Wikipedia, Apple Music, Spotify, AllMusic, Pitchfork, Genius, or any external source.",
    "Do not invent tracks. Use only the supplied tracklist.",
    "Keep the tone premium, concise, confident, and music-literate.",
    "Avoid overhyping weak albums. If the album is minor or overlooked, say that honestly.",
    "",
    "Album:",
    JSON.stringify({
      title: album.title,
      clean_title: album.clean_title,
      artist: album.artist,
      year: album.year,
      tracklist
    }, null, 2)
  ].join("\n");

  logStep("OpenAI request", { model, title: album.title, artist: album.artist, track_count: tracklist.length });
  const res = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: "You are Muze's album editor. You write concise, original, premium music editorial copy and return valid JSON only." },
        { role: "user", content: prompt }
      ],
      text: { format: { type: "json_schema", name: "muze_album_editorial", strict: true, schema } }
    })
  }, "OpenAI Muze editorial generation", OPENAI_FETCH_TIMEOUT_MS);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error?.message || `OpenAI request failed with ${res.status}`);
    error.details = data;
    throw error;
  }
  const generated = JSON.parse(responseOutputText(data));
  generated.generation_model = model;
  return generated;
}

function sanitizeEditorial(generated, tracklist) {
  const defining = orderDefiningMoments(generated.defining_moments, tracklist);
  const fallbackDefining = tracklist.slice(0, Math.min(5, tracklist.length));
  const mostPopular = matchTrackName(generated.most_popular_track, tracklist) || defining[0] || tracklist[0] || "";
  return {
    overview: cleanText(generated.overview, 950),
    sound: cleanText(generated.sound, 900),
    impact: cleanText(generated.impact, 900),
    legacy: cleanText(generated.legacy, 900),
    tagline: cleanText(generated.tagline, 140).replace(/^["']|["']$/g, ""),
    defining_moments: (defining.length >= 4 ? defining : fallbackDefining).slice(0, 6),
    most_popular_track: mostPopular
  };
}

function mergeWithoutOverridingManual(existingRow, row) {
  if (!existingRow?.manual_override) return row;
  const merged = { ...existingRow, ...row, manual_override: true };
  ["overview", "intro_summary", "sound_summary", "impact_summary", "legacy_summary", "quote_headline"].forEach(field => {
    if (cleanText(existingRow[field])) merged[field] = existingRow[field];
  });
  if (Array.isArray(existingRow.defining_tracks) && existingRow.defining_tracks.length) merged.defining_tracks = existingRow.defining_tracks;
  if (cleanText(existingRow.loved_track_key)) merged.loved_track_key = existingRow.loved_track_key;
  if (cleanText(existingRow.loved_track_name)) merged.loved_track_name = existingRow.loved_track_name;
  return merged;
}

function hasManualEditorialContent(row) {
  return Boolean(row?.manual_override && [
    row.overview,
    row.intro_summary,
    row.sound_summary,
    row.impact_summary,
    row.legacy_summary,
    row.quote_headline
  ].some(value => cleanText(value)));
}

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: "Supabase service settings are missing." }) };
  }

  const api = async (path, options = {}) => {
    const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        ...(options.headers || {})
      }
    }, "Supabase request", SUPABASE_FETCH_TIMEOUT_MS);
    const text = await res.text();
    if (!res.ok) {
      const error = new Error(text || `Supabase request failed: ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return text ? JSON.parse(text) : null;
  };

  try {
    const body = JSON.parse(event.body || "{}");
    const album = { ...(body.album || {}) };
    album.title = cleanText(album.title || body.title, 180);
    album.artist = cleanText(album.artist || body.artist, 180);
    album.year = cleanText(album.year || body.year, 24);
    album.clean_title = cleanAlbumTitle(album.title);
    const tracklist = cleanTrackList(Array.isArray(body.tracks) ? body.tracks : album.tracks);
    const album_key = normalizeOverviewTitle(body.album_key || album.clean_title || album.title);
    if (!album_key || !album.title) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: "Album title and album key are required." }) };
    }
    if (!tracklist.length) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: "A tracklist is required to generate Muze editorial." }) };
    }

    let existingRow = null;
    try {
      const existing = await api(`album_overviews?album_key=eq.${encodeURIComponent(album_key)}&select=*`);
      existingRow = existing?.[0] || null;
    } catch (error) {
      console.warn(LOG_PREFIX, "Existing overview lookup failed; generating without cache", { message: error.message || error });
    }

    const generated = await generateMuzeEditorial(album, tracklist);
    const editorial = sanitizeEditorial(generated, tracklist);
    const now = new Date().toISOString();
    const lovedTrackName = editorial.most_popular_track || "";
    const row = mergeWithoutOverridingManual(existingRow, {
      album_key,
      album_id: String(album.id || body.album_id || ""),
      title: album.title,
      artist: album.artist || "",
      overview: editorial.overview,
      intro_summary: editorial.overview,
      sound_summary: editorial.sound,
      impact_summary: editorial.impact,
      legacy_summary: editorial.legacy,
      quote_headline: editorial.tagline,
      defining_tracks: editorial.defining_moments,
      loved_track_key: lovedTrackName ? trackKeyFromName(lovedTrackName) : "",
      loved_track_name: lovedTrackName,
      sources_used: ["Muze metadata", "Official album tracklist"],
      source_summary: "",
      fallback_generated: false,
      generated_at: now,
      updated_at: now,
      generation_model: generated.generation_model || process.env.OPENAI_MODEL || "responses-api",
      manual_override: hasManualEditorialContent(existingRow)
    });

    const saved = await api("album_overviews", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row)
    });

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: true,
        editorial,
        preserved_manual_fields: Boolean(existingRow?.manual_override),
        saved: true,
        row: saved ? saved[0] : row
      })
    };
  } catch (error) {
    console.error(LOG_PREFIX, "Function failed", { message: error.message || error, details: error.details || null });
    return { statusCode: error.status || 500, headers: jsonHeaders, body: JSON.stringify({ error: error.message || "Unexpected error" }) };
  }
};
