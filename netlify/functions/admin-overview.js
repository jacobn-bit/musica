exports.handler = async function(event) {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const action = String(body.action || "").trim();
    const normalizePin = value => String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/^['"]|['"]$/g, "").trim();
    const receivedPin = normalizePin(body.pin);
    const hashPin = value => require("crypto").createHash("sha256").update(normalizePin(value)).digest("hex");
    const adminPinHashes = ["71bdc015e35ca2f9fbb2cfd5c82374fba64813d4a7a1baae09e29f27f46891c5"];
    const pinSources = [
      ["MUSICA_ADMIN_PIN", process.env.MUSICA_ADMIN_PIN],
      ["ADMIN_PIN", process.env.ADMIN_PIN],
      ["VITE_ADMIN_PIN", process.env.VITE_ADMIN_PIN],
      ["NEXT_PUBLIC_ADMIN_PIN", process.env.NEXT_PUBLIC_ADMIN_PIN]
    ];
    const matchedPinSource = pinSources.find(([, value]) => normalizePin(value));
    const adminPin = matchedPinSource ? normalizePin(matchedPinSource[1]) : "";
    const adminPinSource = matchedPinSource ? matchedPinSource[0] : "none";
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const debug = {
      action,
      enteredPinLength: receivedPin.length,
      expectedPinExists: Boolean(adminPin),
      expectedPinSource: adminPinSource,
      hashFallbackExists: Boolean(adminPinHashes.length),
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceKey)
    };
    console.log("[Muze admin] validation start", debug);

    const hashMatched = Boolean(receivedPin) && adminPinHashes.includes(hashPin(receivedPin));

    if (!adminPin && !hashMatched) {
      console.log("[Muze admin] validation failed: missing admin PIN", debug);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Admin PIN is not configured in Netlify.", debug }) };
    }

    if (adminPin && receivedPin !== adminPin && !hashMatched) {
      console.log("[Muze admin] validation failed: incorrect PIN", debug);
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Admin PIN was not accepted.", debug }) };
    }

    if (body.action === "verify") {
      console.log("[Muze admin] validation ok", debug);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, debug }) };
    }

    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Supabase admin settings are missing in Netlify. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Netlify environment variables." }) };
    }

    const api = async (path, options = {}) => {
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          ...(options.headers || {})
        }
      });
      const text = await res.text();
      if (!res.ok) {
        const error = new Error(text || `Supabase request failed: ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return text ? JSON.parse(text) : null;
    };

    const album_key = String(body.album_key || "").trim();
    const album_ref = String(body.album_ref || "").trim();
    const album_id = String(body.album_id || "").trim();
    const title = String(body.title || "").trim();
    const artist = String(body.artist || "").trim();
    const comment_id = String(body.comment_id || "").trim();
    const reply_id = String(body.reply_id || "").trim();
    const library_id = String(body.library_id || "").trim();
    const loved_track_key = String(body.loved_track_key || "").trim();
    const loved_track_name = String(body.loved_track_name || "").trim();
    const admin_ratings_count = body.admin_ratings_count === undefined || body.admin_ratings_count === null || body.admin_ratings_count === "" ? null : Math.max(0, Math.round(Number(body.admin_ratings_count)));
    const admin_score = body.admin_score === undefined || body.admin_score === null || body.admin_score === "" ? null : Math.round(Number(body.admin_score) * 10) / 10;
    const mood_score = body.mood_score === undefined || body.mood_score === null || body.mood_score === "" ? null : Math.max(0, Math.min(100, Math.round(Number(body.mood_score))));
    const manual_genre = String(body.manual_genre || "").replace(/\s+/g, " ").trim().slice(0, 40);
    const hero_focus = String(body.hero_focus || "").trim();
    const overview_focus = String(body.overview_focus || "").trim();
    const moment_focus = String(body.moment_focus || "").trim();
    const cleanText = value => String(value || "").replace(/\s+/g, " ").trim();
    const cleanTextList = value => {
      if (Array.isArray(value)) return value.map(item => cleanText(item)).filter(Boolean);
      return String(value || "").split(/\n|,/).map(item => cleanText(item)).filter(Boolean);
    };
    const overviewFieldPayload = () => {
      const fields = {};
      ["intro_summary", "sound_summary", "impact_summary", "legacy_summary", "quote_headline"].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(body, key)) fields[key] = cleanText(body[key]);
      });
      if (Object.prototype.hasOwnProperty.call(body, "defining_tracks")) fields.defining_tracks = cleanTextList(body.defining_tracks);
      if (Object.prototype.hasOwnProperty.call(body, "sources_used")) fields.sources_used = Array.isArray(body.sources_used) ? body.sources_used : cleanTextList(body.sources_used);
      if (album_id) fields.album_id = album_id;
      return fields;
    };

    if (action === "save") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key and title are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, ...overviewFieldPayload(), fallback_generated: false, manual_override: true, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }







    if (action === "set_hero_focus") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !hero_focus) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and hero focus are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, hero_focus, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_overview_focus") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !overview_focus) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and overview focus are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, overview_focus, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_moment_focus") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !moment_focus) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and moment focus are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, moment_focus, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_album_score") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || admin_score === null || !Number.isFinite(admin_score) || admin_score < 0 || admin_score > 10) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and score from 0 to 10 are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, admin_score, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_album_genre") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !manual_genre) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and genre are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, manual_genre, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }
    if (action === "set_mood_score") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || mood_score === null || !Number.isFinite(mood_score)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and mood value from 0 to 100 are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, mood_score, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_rating_count") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || admin_ratings_count === null || !Number.isFinite(admin_ratings_count)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and rating count are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, admin_ratings_count, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_loved_track") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !loved_track_key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and track are required." }) };
      }
      const rows = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key, title, artist, overview, loved_track_key, loved_track_name, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "delete_album_comment") {
      if (!comment_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Comment id is required." }) };
      await api(`album_comment_replies?comment_id=eq.${encodeURIComponent(comment_id)}`, { method: "DELETE" });
      await api(`album_comments?id=eq.${encodeURIComponent(comment_id)}`, { method: "DELETE" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "delete_album_reply") {
      if (!reply_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Reply id is required." }) };
      await api(`album_comment_replies?id=eq.${encodeURIComponent(reply_id)}`, { method: "DELETE" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "delete_library") {
      if (!library_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Library id is required." }) };
      await api(`library_follows?library_id=eq.${encodeURIComponent(library_id)}`, { method: "DELETE" });
      await api(`user_libraries?id=eq.${encodeURIComponent(library_id)}`, { method: "DELETE" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "delete_overview") {
      if (!album_key) return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key is required." }) };
      await api(`album_overviews?album_key=eq.${encodeURIComponent(album_key)}`, { method: "DELETE" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "clear_reactions") {
      if (!album_ref) return { statusCode: 400, headers, body: JSON.stringify({ error: "Album reference is required." }) };
      await api(`album_comment_replies?album_ref=eq.${encodeURIComponent(album_ref)}`, { method: "DELETE" });
      await api(`album_comments?album_ref=eq.${encodeURIComponent(album_ref)}`, { method: "DELETE" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "clear_track_activity") {
      if (!album_ref) return { statusCode: 400, headers, body: JSON.stringify({ error: "Album reference is required." }) };
      await api(`track_comments?album_ref=eq.${encodeURIComponent(album_ref)}`, { method: "DELETE" });
      await api(`track_ratings?album_ref=eq.${encodeURIComponent(album_ref)}`, { method: "DELETE" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "clear_album_ratings") {
      if (!album_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Album id is required." }) };
      await api(`ratings?album_id=eq.${encodeURIComponent(album_id)}`, { method: "DELETE" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "delete_album") {
      if (!album_id || !album_ref) return { statusCode: 400, headers, body: JSON.stringify({ error: "Album id and reference are required." }) };
      await api(`album_comment_replies?album_ref=eq.${encodeURIComponent(album_ref)}`, { method: "DELETE" });
      await api(`album_comments?album_ref=eq.${encodeURIComponent(album_ref)}`, { method: "DELETE" });
      await api(`track_comments?album_ref=eq.${encodeURIComponent(album_ref)}`, { method: "DELETE" });
      await api(`track_ratings?album_ref=eq.${encodeURIComponent(album_ref)}`, { method: "DELETE" });
      await api(`ratings?album_id=eq.${encodeURIComponent(album_id)}`, { method: "DELETE" });
      if (album_key) await api(`album_overviews?album_key=eq.${encodeURIComponent(album_key)}`, { method: "DELETE" });
      await api(`albums?id=eq.${encodeURIComponent(album_id)}`, { method: "DELETE" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action." }) };
  } catch (error) {
    return { statusCode: error.status || 500, headers, body: JSON.stringify({ error: error.message || "Unexpected error" }) };
  }
};







