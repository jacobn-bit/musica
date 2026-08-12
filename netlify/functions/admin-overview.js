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
    const missingColumnFromError = error => {
      const raw = String(error?.message || error || "");
      let message = raw;
      try { message = JSON.parse(raw).message || message; } catch (_) {}
      const match = message.match(/Could not find the '([^']+)' column/);
      return match ? match[1] : "";
    };
    const postAlbumOverview = async payload => {
      const strippedColumns = [];
      let nextPayload = { ...payload };
      const maximumAttempts = Object.keys(nextPayload).length + 1;
      for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
        try {
          const rows = await api("album_overviews", {
            method: "POST",
            headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify(nextPayload)
          });
          return { rows, strippedColumns };
        } catch (error) {
          const missingColumn = missingColumnFromError(error);
          if (!missingColumn || !Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) throw error;
          strippedColumns.push(missingColumn);
          delete nextPayload[missingColumn];
          console.warn("[Muze admin] album_overviews column missing; saving without it", missingColumn);
        }
      }
      throw new Error("Could not save album overview after removing missing schema columns.");
    };

    const normalizeAlbumKey = value => String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    let album_key = String(body.album_key || "").trim();
    const album_ref = String(body.album_ref || "").trim();
    const album_id = String(body.album_id || "").trim();
    let title = String(body.title || body.album_title || body.name || "").trim();
    const artist = String(body.artist || "").trim();
    const comment_id = String(body.comment_id || "").trim();
    const reply_id = String(body.reply_id || "").trim();
    const library_id = String(body.library_id || "").trim();
    const album_item = body.album_item && typeof body.album_item === "object" ? body.album_item : null;
    const loved_track_key = String(body.loved_track_key || "").trim();
    const loved_track_name = String(body.loved_track_name || "").trim();
    const admin_ratings_count = body.admin_ratings_count === undefined || body.admin_ratings_count === null || body.admin_ratings_count === "" ? null : Math.max(0, Math.round(Number(body.admin_ratings_count)));
    const admin_score = body.admin_score === undefined || body.admin_score === null || body.admin_score === "" ? null : Math.round(Number(body.admin_score) * 10) / 10;
    const mood_score = body.mood_score === undefined || body.mood_score === null || body.mood_score === "" ? null : Math.max(0, Math.min(100, Math.round(Number(body.mood_score))));
    const manual_genre = String(body.manual_genre || body.genre || body.category || "").replace(/\s+/g, " ").trim().slice(0, 40);
    const hero_focus = String(body.hero_focus || "").trim();
    const overview_focus = String(body.overview_focus || "").trim();
    const moment_focus = String(body.moment_focus || "").trim();
    const cleanText = value => String(value || "").replace(/\s+/g, " ").trim();
    const cleanParagraphText = value => String(value || "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(line => line.replace(/[ \t\f\v]+/g, " ").trim())
      .join("\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .split(/\n{3,}/)
      .map(section => section.trim())
      .filter(Boolean)
      .join("\n\n");
    const cleanTextList = value => {
      if (Array.isArray(value)) return value.map(item => cleanText(item)).filter(Boolean);
      return String(value || "").split(/\n|,/).map(item => cleanText(item)).filter(Boolean);
    };
    const overviewFieldPayload = () => {
      const fields = {};
      ["intro_summary", "sound_summary", "impact_summary", "legacy_summary", "quote_headline"].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(body, key)) fields[key] = cleanParagraphText(body[key]);
      });
      if (Object.prototype.hasOwnProperty.call(body, "defining_tracks")) fields.defining_tracks = cleanTextList(body.defining_tracks);
      if (Object.prototype.hasOwnProperty.call(body, "sources_used")) fields.sources_used = Array.isArray(body.sources_used) ? body.sources_used : cleanTextList(body.sources_used);
      const reviewTextFields = ["review_overview", "review_sound", "review_impact", "review_legacy", "review_tagline", "review_closing_verdict", "review_mellow_intense_explanation"];
      reviewTextFields.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(body, key)) fields[key] = cleanParagraphText(body[key]);
      });
      if (Object.prototype.hasOwnProperty.call(body, "review_alternative_taglines")) fields.review_alternative_taglines = cleanTextList(body.review_alternative_taglines);
      if (Object.prototype.hasOwnProperty.call(body, "review_defining_moments")) fields.review_defining_moments = cleanTextList(body.review_defining_moments);
      if (Object.prototype.hasOwnProperty.call(body, "review_most_popular_track")) {
        const popularTrack = body.review_most_popular_track;
        const title = cleanText(popularTrack?.title || popularTrack?.name || popularTrack);
        const explanation = cleanParagraphText(popularTrack?.explanation || "");
        fields.review_most_popular_track = title ? { title, explanation } : null;
      }
      if (Object.prototype.hasOwnProperty.call(body, "review_factual_warnings")) fields.review_factual_warnings = cleanTextList(body.review_factual_warnings);
      if (Object.prototype.hasOwnProperty.call(body, "review_muze_score")) fields.review_muze_score = Math.max(0, Math.min(9.7, Math.round(Number(body.review_muze_score || 0) * 10) / 10));
      if (Object.prototype.hasOwnProperty.call(body, "review_minimum_raters")) fields.review_minimum_raters = Math.max(0, Math.round(Number(body.review_minimum_raters || 0)));
      if (Object.prototype.hasOwnProperty.call(body, "review_mellow_intense_score")) fields.review_mellow_intense_score = Math.max(0, Math.min(100, Math.round(Number(body.review_mellow_intense_score || 0))));
      if (Object.prototype.hasOwnProperty.call(body, "review_manual_fields")) fields.review_manual_fields = cleanTextList(body.review_manual_fields);
      if (album_id) fields.album_id = album_id;
      return fields;
    };
    const overviewPatchPayload = fields => {
      const overview = String(body.overview || "").trim();
      const patch = { album_key, title, artist, ...fields, updated_at: new Date().toISOString() };
      if (overview) patch.overview = overview;
      return patch;
    };

    if (action === "save") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key and title are required." }) };
      }
      const { rows, strippedColumns } = await postAlbumOverview({ album_key, title, artist, overview, ...overviewFieldPayload(), fallback_generated: false, manual_override: true, updated_at: new Date().toISOString() });
      const meaningful = value => Array.isArray(value) ? value.length > 0 : value && typeof value === "object" ? Object.keys(value).length > 0 : String(value ?? "").trim() !== "";
      const lostManualFields = strippedColumns.filter(column => column !== "review_manual_fields" && meaningful(body[column]));
      if (lostManualFields.length) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: `Manual overview fields could not be saved because the live database is missing: ${lostManualFields.join(", ")}. Run supabase/migrations/202608120005_album_overview_manual_fields.sql in the Supabase SQL Editor, then try again.`,
            missing_columns: lostManualFields
          })
        };
      }
      const verified = await api(`album_overviews?album_key=eq.${encodeURIComponent(album_key)}&select=*&limit=1`);
      const savedRow = verified?.[0] || rows?.[0] || null;
      if (!savedRow || String(savedRow.overview || "").trim() !== overview) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "The manual overview was not confirmed in the database. Nothing was reported as saved." }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: savedRow, strippedColumns }) };
    }







    if (action === "set_hero_focus") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !hero_focus) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and hero focus are required." }) };
      }
      const { rows } = await postAlbumOverview(overviewPatchPayload({ hero_focus }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_overview_focus") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !overview_focus) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and overview focus are required." }) };
      }
      const { rows } = await postAlbumOverview(overviewPatchPayload({ overview_focus }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_moment_focus") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !moment_focus) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and moment focus are required." }) };
      }
      const { rows } = await postAlbumOverview(overviewPatchPayload({ moment_focus }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_album_score") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || admin_score === null || !Number.isFinite(admin_score) || admin_score < 0 || admin_score > 10) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and score from 0 to 10 are required." }) };
      }
      const { rows } = await postAlbumOverview(overviewPatchPayload({ admin_score }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_album_genre") {
      const overview = String(body.overview || "").trim();
      if (!title && album_key) title = album_key;
      if (!album_key && title) {
        const titleKey = normalizeAlbumKey(title);
        const artistKey = normalizeAlbumKey(artist);
        album_key = titleKey && artistKey ? `${artistKey} ${titleKey}` : titleKey;
      }
      if (!album_key || !title || !manual_genre) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and genre are required." }) };
      }
      const { rows } = await postAlbumOverview(overviewPatchPayload({ manual_genre }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }
    if (action === "set_mood_score") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || mood_score === null || !Number.isFinite(mood_score)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and mood value from 0 to 100 are required." }) };
      }
      const { rows } = await postAlbumOverview(overviewPatchPayload({ mood_score }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_rating_count") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || admin_ratings_count === null || !Number.isFinite(admin_ratings_count)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and rating count are required." }) };
      }
      const { rows } = await postAlbumOverview(overviewPatchPayload({ admin_ratings_count }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows ? rows[0] : null }) };
    }

    if (action === "set_loved_track") {
      const overview = String(body.overview || "").trim();
      if (!album_key || !title || !loved_track_key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key, title, and track are required." }) };
      }
      const { rows } = await postAlbumOverview(overviewPatchPayload({ loved_track_key, loved_track_name }));
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

    if (action === "add_library_album") {
      if (!library_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Library id is required." }) };
      if (!album_item || !String(album_item.title || "").trim()) return { statusCode: 400, headers, body: JSON.stringify({ error: "Album item is required." }) };
      const rows = await api(`user_libraries?id=eq.${encodeURIComponent(library_id)}&select=id,items`, { method: "GET" });
      const library = rows && rows[0];
      if (!library) return { statusCode: 404, headers, body: JSON.stringify({ error: "Library not found." }) };
      const cleanItem = {
        id: String(album_item.id || album_item.spotify_id || `${album_item.artist || ""}-${album_item.title || ""}`).trim(),
        title: String(album_item.title || "").trim(),
        artist: String(album_item.artist || "").trim(),
        year: String(album_item.year || "").trim(),
        genre: String(album_item.genre || "").trim(),
        cover_url: String(album_item.cover_url || "").trim(),
        spotify_url: String(album_item.spotify_url || "").trim(),
        summary: String(album_item.summary || "").trim(),
        rating: album_item.rating || "",
        added_at: album_item.added_at || new Date().toISOString()
      };
      const sameAlbum = (a, b) => {
        const norm = value => String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
        return (a.id && b.id && String(a.id) === String(b.id)) || (norm(a.title) === norm(b.title) && norm(a.artist) === norm(b.artist));
      };
      const items = Array.isArray(library.items) ? library.items : [];
      const nextItems = items.some(item => sameAlbum(item, cleanItem)) ? items : [...items, cleanItem];
      const updated = await api(`user_libraries?id=eq.${encodeURIComponent(library_id)}`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({ items: nextItems, album_count: nextItems.length, updated_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: updated ? updated[0] : null }) };
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







