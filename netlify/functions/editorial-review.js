"use strict";

const crypto = require("crypto");
const {
  approveReview,
  createSupabaseClient,
  generatePremiumReview,
  latestReview,
  patchReview,
  regenerateSection,
  rerunQualityControl,
  saveDraft
} = require("./lib/editorial-service");

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function normalizePin(value) {
  return String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/^['"]|['"]$/g, "").trim();
}

function hashPin(value) {
  return crypto.createHash("sha256").update(normalizePin(value)).digest("hex");
}

function validAdminPin(received, env = process.env) {
  const configured = [
    env.MUSICA_ADMIN_PIN,
    env.ADMIN_PIN,
    env.VITE_ADMIN_PIN,
    env.NEXT_PUBLIC_ADMIN_PIN
  ].map(normalizePin).find(Boolean);
  const legacyHashes = ["71bdc015e35ca2f9fbb2cfd5c82374fba64813d4a7a1baae09e29f27f46891c5"];
  const pin = normalizePin(received);
  return Boolean(pin) && ((configured && pin === configured) || legacyHashes.includes(hashPin(pin)));
}

async function authenticatedUserId(event, env = process.env) {
  const authorization = event.headers?.authorization || event.headers?.Authorization || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization }
    });
    if (!response.ok) return null;
    const user = await response.json();
    return /^[0-9a-f-]{36}$/i.test(user?.id || "") ? user.id : null;
  } catch (_) {
    return null;
  }
}

function requiredAlbumId(body) {
  const albumId = String(body.albumId || body.album_id || "").trim();
  if (!albumId) throw Object.assign(new Error("albumId is required."), { status: 400 });
  return albumId;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (_) {
    return json(400, { error: "Request body must be valid JSON." });
  }
  if (!validAdminPin(body.pin)) return json(401, { error: "Admin PIN was not accepted." });

  const action = String(body.action || "").trim();
  try {
    const api = createSupabaseClient();
    const albumId = action === "bulk_generate" ? "" : requiredAlbumId(body);
    let row = null;

    if (action === "get") {
      row = await latestReview(api, albumId);
      return json(200, { ok: true, row });
    }
    if (action === "generate") {
      row = await generatePremiumReview(api, albumId);
    } else if (action === "quality_check") {
      row = await rerunQualityControl(api, albumId, String(body.reviewId || ""));
    } else if (action === "regenerate_section") {
      row = await regenerateSection(api, albumId, String(body.reviewId || ""), String(body.section || ""));
    } else if (action === "save_draft") {
      row = await saveDraft(api, albumId, String(body.reviewId || ""), body.review);
    } else if (action === "approve") {
      row = await approveReview(api, albumId, String(body.reviewId || ""), await authenticatedUserId(event));
    } else if (action === "reject") {
      const reviewId = String(body.reviewId || "").trim();
      if (!reviewId) return json(400, { error: "reviewId is required." });
      row = await patchReview(api, reviewId, { status: "rejected" });
    } else if (action === "bulk_generate") {
      const albumIds = [...new Set((Array.isArray(body.albumIds) ? body.albumIds : [])
        .map(value => String(value || "").trim()).filter(Boolean))];
      if (!albumIds.length || albumIds.length > 20) {
        return json(400, { error: "Select between 1 and 20 albums." });
      }
      const results = [];
      for (const id of albumIds) {
        try {
          const generated = await generatePremiumReview(api, id);
          results.push({ albumId: id, ok: true, reviewId: generated.id, status: generated.status });
        } catch (error) {
          results.push({ albumId: id, ok: false, error: error.message || "Generation failed." });
        }
      }
      return json(200, { ok: true, results });
    } else {
      return json(400, { error: "Unknown editorial action." });
    }
    return json(200, { ok: true, row });
  } catch (error) {
    console.error("[Muze editorial]", {
      action,
      albumId: body.albumId || body.album_id || null,
      status: error.status || 500,
      message: error.message || "Unexpected error"
    });
    const status = Number(error.status) || 500;
    const publicMessage = status >= 500 ? "Muze could not complete the editorial request. Check the Netlify function log." : error.message;
    return json(status, { error: publicMessage });
  }
};
