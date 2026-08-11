"use strict";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeTrackTitle(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s*[-–—]\s*(remaster(?:ed)?|live|mono|stereo|bonus track).*$/i, "")
    .replace(/[^a-z0-9']+/g, " ")
    .trim();
}

function openingSentence(text) {
  return String(text || "").trim().split(/(?<=[.!?])\s+/)[0] || "";
}

function isOneParagraph(text) {
  const clean = String(text || "").trim();
  return Boolean(clean) && !/\n\s*\n/.test(clean) && !/[\r\n]/.test(clean);
}

function scoreHasOneDecimalPrecision(value) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 1 && score <= 10 &&
    Math.abs(score * 10 - Math.round(score * 10)) < Number.EPSILON * 100;
}

function raterCountSupportsScore(scoreValue, countValue) {
  const score = Number(scoreValue);
  const count = Number(countValue);
  if (!Number.isInteger(count) || count < 1 || count % 2 === 0) return false;
  const low = Math.max(count, Math.ceil((score - 0.05) * count));
  const high = Math.min(count * 10, Math.ceil((score + 0.05) * count) - 1);
  return low <= high;
}

function canonicalTrackMap(tracklist) {
  const map = new Map();
  (tracklist || []).forEach((track, index) => {
    const title = String(track?.title || track?.name || "").trim();
    if (!title) return;
    map.set(normalizeTrackTitle(title), {
      ...track,
      title,
      position: Number(track?.position || index + 1)
    });
  });
  return map;
}

function validateReview(review, album, tracklist) {
  const errors = [];
  const requiredText = ["overview", "sound", "impact", "legacy", "tagline", "scoreExplanation"];
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return { valid: false, errors: ["Review must be an object."], review };
  }
  requiredText.forEach(field => {
    if (!normalizeText(review[field])) errors.push(`${field} is required.`);
  });

  const overview = String(review.overview || "").trim();
  if (!isOneParagraph(overview)) errors.push("Overview must be exactly one paragraph.");
  const firstSentence = openingSentence(overview);
  const title = normalizeText(album?.title);
  const year = String(album?.year || album?.releaseYear || "").trim();
  if (title && !firstSentence.toLowerCase().includes(title.toLowerCase())) {
    errors.push("Album title must appear in the Overview opening sentence.");
  }
  if (year && !firstSentence.includes(year)) {
    errors.push("Release year must appear in the Overview opening sentence.");
  }

  const taglines = Array.isArray(review.alternativeTaglines) ? review.alternativeTaglines : [];
  if (taglines.length !== 6) errors.push("Exactly six alternative taglines are required.");
  const normalizedTaglines = taglines.map(normalizeText).filter(Boolean).map(value => value.toLowerCase());
  if (normalizedTaglines.length !== taglines.length) errors.push("Alternative taglines cannot be empty.");
  if (new Set(normalizedTaglines).size !== normalizedTaglines.length) errors.push("Alternative taglines must be distinct.");

  const trackMap = canonicalTrackMap(tracklist);
  const moments = Array.isArray(review.definingMoments) ? review.definingMoments : [];
  if (moments.length !== 5) errors.push("Exactly five Defining Moments are required.");
  const momentKeys = [];
  let priorPosition = 0;
  moments.forEach((moment, index) => {
    const key = normalizeTrackTitle(moment?.trackTitle);
    const canonical = trackMap.get(key);
    momentKeys.push(key);
    if (!canonical) {
      errors.push(`Defining Moment ${index + 1} is not in the supplied tracklist.`);
      return;
    }
    if (Number(moment.trackPosition) !== canonical.position) {
      errors.push(`Defining Moment "${canonical.title}" has an incorrect track position.`);
    }
    if (canonical.position <= priorPosition) errors.push("Defining Moments must follow official tracklist order.");
    priorPosition = canonical.position;
    if (!normalizeText(moment.explanation)) errors.push(`Defining Moment "${canonical.title}" needs an explanation.`);
    moment.trackTitle = canonical.title;
    moment.trackPosition = canonical.position;
  });
  if (new Set(momentKeys).size !== momentKeys.length) errors.push("Defining Moments cannot contain duplicate tracks.");

  const popularTitle = normalizeTrackTitle(review.mostPopularTrack?.title);
  const popularTrack = trackMap.get(popularTitle);
  if (!popularTrack) errors.push("Most Popular Track must exist in the supplied tracklist.");
  else review.mostPopularTrack.title = popularTrack.title;
  if (!normalizeText(review.mostPopularTrack?.explanation)) errors.push("Most Popular Track needs an explanation.");

  if (!scoreHasOneDecimalPrecision(review.muzeScore)) errors.push("Muze Score must be from 1.0 to 10.0 in one-decimal increments.");
  if (!Number.isInteger(review.raterCount) || review.raterCount % 2 === 0) errors.push("Rater count must be a positive odd integer.");
  else if (!raterCountSupportsScore(review.muzeScore, review.raterCount)) errors.push("Rater count is incompatible with the displayed score.");
  if (!Array.isArray(review.factualWarnings)) errors.push("Factual warnings must be an array.");

  return { valid: errors.length === 0, errors, review };
}

function qualityStatus(result) {
  const score = Number(result?.overallScore || 0);
  const hasCritical = (result?.problems || []).some(problem => problem?.severity === "critical");
  if (hasCritical || score < 75) return "quality_failed";
  if (score < 90) return "needs_revision";
  return "draft";
}

module.exports = {
  canonicalTrackMap,
  isOneParagraph,
  normalizeTrackTitle,
  openingSentence,
  qualityStatus,
  raterCountSupportsScore,
  scoreHasOneDecimalPrecision,
  validateReview
};
