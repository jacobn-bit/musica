"use strict";

const { reviewSchema, qualitySchema, sectionSchemas } = require("./review-schema");
const { qualityStatus, validateReview } = require("./review-validation");
const { MUZE_EDITORIAL_PROMPT, MUZE_QC_PROMPT, PROMPT_VERSION } = require("../prompts/muze-editorial-prompt");
const fallbackExamples = require("../prompts/gold-standard-examples");

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeAlbumKey(value) {
  return clean(value).toLowerCase().replace(/&/g, "and").replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function albumStorageKey(album) {
  const title = normalizeAlbumKey(album?.title);
  const artist = normalizeAlbumKey(album?.artist || album?.artist_name);
  if (title && artist) return `${artist} ${title}`;
  return title || (artist ? `${artist} album` : "");
}

async function fetchJson(url, options = {}, timeoutMs = 65000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) {
      const error = new Error(`Remote service returned invalid JSON (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(data?.error?.message || data?.message || data?.error || `Request failed (${response.status}).`);
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("The remote request timed out.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function createSupabaseClient(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service settings are missing.");
  return async function api(path, options = {}) {
    return fetchJson(`${url}/rest/v1/${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(options.headers || {})
      }
    }, 45000);
  };
}

function responseOutputText(response) {
  if (typeof response?.output_text === "string") return response.output_text;
  return (response?.output || []).flatMap(item => item.content || [])
    .map(part => part.text || "").join("").trim();
}

async function requestStructuredOpenAI({ model, system, input, schema, schemaName, env = process.env }) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  if (!model) throw new Error("The Muze review model is not configured.");
  const response = await fetchJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(input) }
      ],
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } }
    })
  }, 90000);
  const output = responseOutputText(response);
  if (!output) throw new Error("OpenAI returned no structured output.");
  try { return JSON.parse(output); } catch (_) {
    throw new Error("OpenAI returned malformed structured output.");
  }
}

async function spotifyTracks(album, env = process.env) {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return [];
  const token = await fetchJson("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  }, 12000);
  const auth = { Authorization: `Bearer ${token.access_token}` };
  let spotifyId = clean(album.spotify_id);
  if (!spotifyId) {
    const query = `album:"${album.title}" artist:"${album.artist}"`;
    const result = await fetchJson(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=10`, { headers: auth }, 12000);
    const candidates = result?.albums?.items || [];
    const titleKey = normalizeAlbumKey(album.title);
    const artistKey = normalizeAlbumKey(album.artist);
    const match = candidates.find(item =>
      normalizeAlbumKey(item.name) === titleKey &&
      (item.artists || []).some(artist => normalizeAlbumKey(artist.name) === artistKey)
    );
    spotifyId = match?.id || "";
  }
  if (!spotifyId) return [];
  const albumData = await fetchJson(`https://api.spotify.com/v1/albums/${encodeURIComponent(spotifyId)}?market=US`, { headers: auth }, 15000);
  const items = albumData?.tracks?.items || [];
  let popularity = {};
  const ids = items.map(item => item.id).filter(Boolean);
  if (ids.length) {
    const batch = await fetchJson(`https://api.spotify.com/v1/tracks?ids=${encodeURIComponent(ids.slice(0, 50).join(","))}&market=US`, { headers: auth }, 15000).catch(() => null);
    popularity = Object.fromEntries((batch?.tracks || []).filter(Boolean).map(track => [track.id, track.popularity]));
  }
  return items.map((track, index) => ({
    position: index + 1,
    discNumber: track.disc_number || 1,
    trackNumber: track.track_number || index + 1,
    title: track.name,
    durationMs: track.duration_ms || null,
    spotifyId: track.id || null,
    popularity: Number.isFinite(popularity[track.id]) ? popularity[track.id] : undefined
  }));
}

async function collectContext(api, albumId, env = process.env) {
  const albums = await api(`albums?id=eq.${encodeURIComponent(albumId)}&select=*`);
  const album = albums?.[0];
  if (!album) {
    const error = new Error("Album not found.");
    error.status = 404;
    throw error;
  }
  const albumKey = albumStorageKey(album);
  const overviewRows = await api(`album_overviews?album_key=eq.${encodeURIComponent(albumKey)}&select=*`).catch(() => []);
  const overview = overviewRows?.[0] || {};
  const tracks = await spotifyTracks(album, env).catch(error => {
    console.warn("[Muze editorial] Spotify track context unavailable", { albumId, message: error.message });
    return [];
  });
  if (tracks.length < 5) {
    const error = new Error("A verified tracklist with at least five tracks is required before generating a review.");
    error.status = 422;
    throw error;
  }

  const artistFilter = encodeURIComponent(album.artist);
  const artistAlbums = await api(`albums?artist=ilike.${artistFilter}&select=id,title,artist,year,genre`).catch(() => []);
  const artistOverviews = await api(`album_overviews?artist=ilike.${artistFilter}&select=album_id,title,artist,admin_score,review_muze_score`).catch(() => []);
  const existingRatings = artistOverviews.map(row => ({
    albumId: row.album_id || undefined,
    title: row.title,
    score: row.review_muze_score ?? row.admin_score
  })).filter(row => Number.isFinite(Number(row.score)));

  const globalBenchmarks = await api("muze_rating_benchmarks?benchmark_level=eq.global&select=*&order=muze_score.desc&limit=10").catch(() => []);
  const genre = clean(overview.manual_genre || album.genre);
  const relevantBenchmarks = genre
    ? await api(`muze_rating_benchmarks?or=(genre.ilike.${encodeURIComponent(genre)},artist_name.ilike.${artistFilter})&select=*&limit=8`).catch(() => [])
    : [];
  const databaseExamples = await api("muze_editorial_examples?is_approved=eq.true&select=category,album_title,artist_name,review_json&limit=2").catch(() => []);
  const examples = databaseExamples.length ? databaseExamples : fallbackExamples;

  const verifiedAlbumData = compactObject({
    albumId: album.id,
    artistName: album.artist,
    albumTitle: album.title,
    releaseYear: album.year,
    fullReleaseDate: album.release_date,
    albumType: album.album_type,
    genres: genre ? [genre] : undefined,
    label: album.label,
    spotifyId: album.spotify_id,
    tracklist: tracks
  });
  const verifiedHistoricalContext = compactObject({
    sourceSummary: overview.source_summary,
    sourcesUsed: Array.isArray(overview.sources_used) && overview.sources_used.length ? overview.sources_used : undefined,
    producerCredits: overview.producer_credits,
    confirmedPersonnel: overview.confirmed_personnel
  });
  const ratingContext = {
    sameArtist: existingRatings.slice(0, 12),
    globalBenchmarks,
    relevantBenchmarks: relevantBenchmarks.slice(0, 8),
    catalogueAlbums: artistAlbums.slice(0, 20)
  };
  return {
    album,
    albumKey,
    overview,
    tracks,
    generationInput: {
      verifiedAlbumData,
      verifiedHistoricalContext,
      existingMuzeRatingContext: ratingContext,
      editorialExample: examples.slice(0, 1),
      generationInstructions: {
        promptVersion: PROMPT_VERSION,
        tracklistIsAuthoritative: true,
        neverPublishAutomatically: true
      }
    }
  };
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) =>
    item !== undefined && item !== null && item !== "" && (!Array.isArray(item) || item.length)
  ));
}

async function nextRevision(api, albumId) {
  const rows = await api(`album_reviews?album_id=eq.${encodeURIComponent(albumId)}&select=revision&order=revision.desc&limit=1`).catch(() => []);
  return Number(rows?.[0]?.revision || 0) + 1;
}

async function insertReview(api, context, fields) {
  const payload = {
    album_id: context.album.id,
    album_key: context.albumKey,
    album_title: context.album.title,
    artist_name: context.album.artist,
    revision: await nextRevision(api, context.album.id),
    prompt_version: PROMPT_VERSION,
    ...fields
  };
  const rows = await api("album_reviews", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload)
  });
  return rows?.[0] || payload;
}

async function patchReview(api, reviewId, fields) {
  const rows = await api(`album_reviews?id=eq.${encodeURIComponent(reviewId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() })
  });
  return rows?.[0] || null;
}

async function latestReview(api, albumId) {
  const rows = await api(`album_reviews?album_id=eq.${encodeURIComponent(albumId)}&select=*&order=revision.desc&limit=1`);
  return rows?.[0] || null;
}

function assertMutableReview(review) {
  if (!review) throw Object.assign(new Error("Review draft not found."), { status: 404 });
  if (review.status === "approved") {
    throw Object.assign(new Error("Approved reviews cannot be overwritten. Create a new draft instead."), { status: 409 });
  }
  return review;
}

async function runQualityControl(context, review, env = process.env) {
  const validation = validateReview(review, context.album, context.tracks);
  if (!validation.valid) {
    return {
      result: {
        passed: false,
        overallScore: 0,
        problems: validation.errors.map(explanation => ({
          field: "deterministic_validation",
          severity: "critical",
          explanation,
          suggestedCorrection: "Correct the structured review before running editorial quality control."
        }))
      },
      status: "quality_failed",
      validation
    };
  }
  const model = env.MUZE_QC_MODEL || env.MUZE_REVIEW_MODEL || env.OPENAI_MODEL;
  const result = await requestStructuredOpenAI({
    model,
    system: MUZE_QC_PROMPT,
    input: {
      ...context.generationInput,
      generatedReview: review,
      qualityControlInstructions: { doNotRewrite: true, evaluateAgainstEditorialRules: true }
    },
    schema: qualitySchema,
    schemaName: "muze_review_quality_control",
    env
  });
  const status = qualityStatus(result);
  result.passed = status === "draft";
  return { result, status, validation };
}

async function generatePremiumReview(api, albumId, env = process.env) {
  const context = await collectContext(api, albumId, env);
  const model = env.MUZE_REVIEW_MODEL || env.OPENAI_MODEL;
  const pending = await insertReview(api, context, {
    status: "generating",
    generation_model: model,
    generation_context: context.generationInput,
    generated_at: new Date().toISOString()
  });
  try {
    const review = await requestStructuredOpenAI({
      model,
      system: MUZE_EDITORIAL_PROMPT,
      input: context.generationInput,
      schema: reviewSchema,
      schemaName: "muze_premium_album_review",
      env
    });
    const qc = await runQualityControl(context, review, env);
    return patchReview(api, pending.id, {
      status: qc.status,
      generated_review: review,
      editable_review: review,
      quality_control_model: env.MUZE_QC_MODEL || model,
      quality_control_at: new Date().toISOString(),
      quality_score: qc.result.overallScore,
      quality_problems: qc.result.problems,
      factual_warnings: review.factualWarnings || [],
      validation_errors: qc.validation.errors
    });
  } catch (error) {
    await patchReview(api, pending.id, {
      status: "quality_failed",
      quality_score: 0,
      quality_problems: [{
        field: "generation",
        severity: "critical",
        explanation: error.message || "Generation failed.",
        suggestedCorrection: "Check the server logs and retry."
      }]
    }).catch(() => null);
    throw error;
  }
}

async function rerunQualityControl(api, albumId, reviewId, env = process.env) {
  const context = await collectContext(api, albumId, env);
  const current = reviewId
    ? (await api(`album_reviews?id=eq.${encodeURIComponent(reviewId)}&select=*`))?.[0]
    : await latestReview(api, albumId);
  assertMutableReview(current);
  const review = current.editable_review || current.generated_review;
  const qc = await runQualityControl(context, review, env);
  return patchReview(api, current.id, {
    status: qc.status,
    quality_control_model: env.MUZE_QC_MODEL || env.MUZE_REVIEW_MODEL || env.OPENAI_MODEL,
    quality_control_at: new Date().toISOString(),
    quality_score: qc.result.overallScore,
    quality_problems: qc.result.problems,
    factual_warnings: review.factualWarnings || [],
    validation_errors: qc.validation.errors
  });
}

async function regenerateSection(api, albumId, reviewId, section, env = process.env) {
  if (!sectionSchemas[section]) throw Object.assign(new Error("Unsupported review section."), { status: 400 });
  const context = await collectContext(api, albumId, env);
  const currentRows = await api(`album_reviews?id=eq.${encodeURIComponent(reviewId)}&select=*`);
  const current = currentRows?.[0];
  assertMutableReview(current);
  const review = current.editable_review || current.generated_review;
  const criticism = (current.quality_problems || []).filter(problem =>
    clean(problem.field).toLowerCase().includes(section === "score" ? "score" : section.toLowerCase())
  );
  const replacement = await requestStructuredOpenAI({
    model: env.MUZE_REVIEW_MODEL || env.OPENAI_MODEL,
    system: MUZE_EDITORIAL_PROMPT,
    input: {
      ...context.generationInput,
      currentReview: review,
      sectionToRewrite: section,
      qualityControlCriticism: criticism,
      instruction: "Return only the requested replacement. Preserve every other review field exactly."
    },
    schema: sectionSchemas[section],
    schemaName: `muze_review_${section}`,
    env
  });
  const next = { ...review };
  if (section === "score") {
    next.muzeScore = replacement.muzeScore;
    next.scoreExplanation = replacement.scoreExplanation;
    next.raterCount = replacement.raterCount;
  } else if (section === "definingMoments") {
    next.definingMoments = replacement.definingMoments;
  } else {
    next[section] = replacement[section];
  }
  const validation = validateReview(next, context.album, context.tracks);
  return insertReview(api, context, {
    parent_review_id: current.id,
    status: validation.valid ? "needs_revision" : "quality_failed",
    generated_review: current.generated_review || review,
    editable_review: next,
    generation_model: env.MUZE_REVIEW_MODEL || env.OPENAI_MODEL,
    generation_context: context.generationInput,
    generated_at: new Date().toISOString(),
    factual_warnings: next.factualWarnings || [],
    validation_errors: validation.errors,
    quality_problems: criticism
  });
}

async function saveDraft(api, albumId, reviewId, review, env = process.env) {
  const context = await collectContext(api, albumId, env);
  const validation = validateReview(review, context.album, context.tracks);
  if (reviewId) {
    const rows = await api(`album_reviews?id=eq.${encodeURIComponent(reviewId)}&select=*`);
    const current = rows?.[0];
    assertMutableReview(current);
    return patchReview(api, current.id, {
      editable_review: review,
      status: validation.valid ? "needs_revision" : "quality_failed",
      factual_warnings: review.factualWarnings || [],
      validation_errors: validation.errors
    });
  }
  return insertReview(api, context, {
    status: validation.valid ? "needs_revision" : "quality_failed",
    generated_review: review,
    editable_review: review,
    generation_model: "manual",
    generation_context: context.generationInput,
    generated_at: new Date().toISOString(),
    factual_warnings: review.factualWarnings || [],
    validation_errors: validation.errors
  });
}

async function approveReview(api, albumId, reviewId, approvedBy) {
  const rows = await api(`album_reviews?id=eq.${encodeURIComponent(reviewId)}&album_id=eq.${encodeURIComponent(albumId)}&select=*`);
  const current = rows?.[0];
  if (!current) throw Object.assign(new Error("Review draft not found."), { status: 404 });
  if (current.status !== "draft" || Number(current.quality_score || 0) < 90) {
    throw Object.assign(new Error("Only a review-ready draft with a quality score of at least 90 can be approved."), { status: 409 });
  }
  const review = current.editable_review || current.generated_review;
  const savedTracklist = current.generation_context?.verifiedAlbumData?.tracklist;
  let album = {
    id: current.album_id,
    title: current.album_title,
    artist: current.artist_name,
    year: current.generation_context?.verifiedAlbumData?.releaseYear
  };
  let tracks = Array.isArray(savedTracklist) ? savedTracklist : [];
  if (tracks.length < 5) {
    const fallbackContext = await collectContext(api, albumId);
    album = fallbackContext.album;
    tracks = fallbackContext.tracks;
  }
  const validation = validateReview(review, album, tracks);
  if (!validation.valid) throw Object.assign(new Error(`Review validation failed: ${validation.errors.join(" ")}`), { status: 422 });
  const now = new Date().toISOString();
  const overviewPayload = {
    album_key: current.album_key,
    album_id: String(albumId),
    title: current.album_title,
    artist: current.artist_name,
    overview: review.overview,
    review_overview: review.overview,
    review_sound: review.sound,
    review_impact: review.impact,
    review_legacy: review.legacy,
    review_tagline: review.tagline,
    review_alternative_taglines: review.alternativeTaglines,
    review_defining_moments: review.definingMoments,
    review_muze_score: review.muzeScore,
    review_minimum_raters: review.raterCount,
    review_closing_verdict: review.scoreExplanation,
    review_generated_at: current.generated_at,
    review_generation_model: current.generation_model,
    review_manual_fields: [
      "overview", "sound", "impact", "legacy", "tagline", "alternativeTaglines",
      "definingMoments", "muzeScore", "minimumRaters", "closingVerdict"
    ],
    manual_override: true,
    updated_at: now
  };
  await api("album_overviews", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(overviewPayload)
  });
  return patchReview(api, current.id, {
    status: "approved",
    approved_at: now,
    approved_by: approvedBy || null
  });
}

module.exports = {
  albumStorageKey,
  approveReview,
  assertMutableReview,
  collectContext,
  createSupabaseClient,
  generatePremiumReview,
  latestReview,
  normalizeAlbumKey,
  patchReview,
  regenerateSection,
  requestStructuredOpenAI,
  rerunQualityControl,
  saveDraft
};
