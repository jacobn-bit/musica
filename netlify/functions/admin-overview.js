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
    const submission_id = String(body.submission_id || "").trim();
    const artist_id = String(body.artist_id || "").trim();
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
    const stringArray = value => {
      if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
      try {
        const parsed = JSON.parse(String(value || "[]"));
        return Array.isArray(parsed) ? parsed.map(cleanText).filter(Boolean) : [];
      } catch (_) { return []; }
    };
    const portraitIdentityIsAllowed = row => cleanText(row?.person_name).toLowerCase() !== "prince"
      || cleanText(row?.person_wikidata_id).toUpperCase() === "Q7542";
    const artistImageCandidate = (rows, rejectedUrls) => {
      const rejected = new Set((rejectedUrls || []).map(cleanText).filter(Boolean));
      const seen = new Set();
      return (Array.isArray(rows) ? rows : [])
        .filter(row => row?.image_approved === true && cleanText(row?.image_url) && String(row?.image_status || "").toLowerCase() === "approved")
        .filter(portraitIdentityIsAllowed)
        .filter(row => !rejected.has(cleanText(row.image_url)) && !rejected.has(cleanText(row.image_source_url)))
        .filter(row => {
          const key = cleanText(row.person_wikidata_id || row.person_name || row.image_url).toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((left, right) => (Number(left.sort_order) || 99999) - (Number(right.sort_order) || 99999))[0] || null;
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

    if (action === "list_album_review_submissions") {
      if (!album_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Album id is required." }) };
      const rows = await api(`album_review_submissions?album_id=eq.${encodeURIComponent(album_id)}&status=eq.pending&select=id,album_id,album_key,album_title,artist_name,user_id,username,review_text,submission_type,status,created_at&order=created_at.asc`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, rows: rows || [] }) };
    }

    if (action === "approve_album_review_submission") {
      if (!submission_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Review submission id is required." }) };
      const submissions = await api(`album_review_submissions?id=eq.${encodeURIComponent(submission_id)}&status=eq.pending&select=*`);
      const submission = Array.isArray(submissions) ? submissions[0] : null;
      if (!submission) return { statusCode: 404, headers, body: JSON.stringify({ error: "Pending review submission was not found." }) };
      const now = new Date().toISOString();
      const submissionType = ["sound", "impact", "legacy"].includes(submission.submission_type) ? submission.submission_type : "bio";
      await api(`album_review_submissions?album_id=eq.${encodeURIComponent(submission.album_id)}&submission_type=eq.${encodeURIComponent(submissionType)}&status=eq.approved`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "superseded", reviewed_at: now, updated_at: now })
      });
      const rows = await api(`album_review_submissions?id=eq.${encodeURIComponent(submission_id)}&status=eq.pending`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({ status: "approved", reviewed_at: now, updated_at: now })
      });
      if (submissionType !== "bio") {
        await api("album_overviews?on_conflict=album_key", {
          method: "POST",
          headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            album_key: submission.album_key,
            album_id: submission.album_id,
            title: submission.album_title,
            artist: submission.artist_name,
            [`${submissionType}_summary`]: cleanParagraphText(submission.review_text),
            manual_override: true,
            updated_at: now
          })
        });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: Array.isArray(rows) ? rows[0] : rows }) };
    }

    if (action === "reject_album_review_submission") {
      if (!submission_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Review submission id is required." }) };
      const now = new Date().toISOString();
      const rows = await api(`album_review_submissions?id=eq.${encodeURIComponent(submission_id)}&status=eq.pending`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({ status: "rejected", reviewed_at: now, updated_at: now })
      });
      if (!Array.isArray(rows) || !rows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: "Pending review submission was not found." }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows[0] }) };
    }

    if (action === "list_defining_track_submissions") {
      if (!album_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Album id is required." }) };
      const rows = await api(`album_defining_track_submissions?album_id=eq.${encodeURIComponent(album_id)}&status=eq.pending&select=id,album_id,album_key,album_title,artist_name,user_id,username,track_names,status,created_at&order=created_at.asc`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, rows: rows || [] }) };
    }

    if (action === "approve_defining_track_submission") {
      if (!submission_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Defining-track submission id is required." }) };
      const submissions = await api(`album_defining_track_submissions?id=eq.${encodeURIComponent(submission_id)}&status=eq.pending&select=*`);
      const submission = Array.isArray(submissions) ? submissions[0] : null;
      if (!submission) return { statusCode: 404, headers, body: JSON.stringify({ error: "Pending defining-track submission was not found." }) };
      const trackNames = cleanTextList(submission.track_names).slice(0, 5);
      if (trackNames.length !== 5) return { statusCode: 400, headers, body: JSON.stringify({ error: "Submission must contain exactly five tracks." }) };
      const now = new Date().toISOString();
      const overviewRows = await api("album_overviews?on_conflict=album_key", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ album_key: submission.album_key, album_id: submission.album_id, title: submission.album_title, artist: submission.artist_name, defining_tracks: trackNames, manual_override: true, updated_at: now })
      });
      await api(`album_defining_track_submissions?album_id=eq.${encodeURIComponent(submission.album_id)}&status=eq.pending`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "rejected", reviewed_at: now, updated_at: now })
      });
      const rows = await api(`album_defining_track_submissions?id=eq.${encodeURIComponent(submission_id)}`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({ status: "approved", reviewed_at: now, updated_at: now })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: Array.isArray(rows) ? rows[0] : rows, overview: Array.isArray(overviewRows) ? overviewRows[0] : overviewRows }) };
    }

    if (action === "reject_defining_track_submission") {
      if (!submission_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Defining-track submission id is required." }) };
      const now = new Date().toISOString();
      const rows = await api(`album_defining_track_submissions?id=eq.${encodeURIComponent(submission_id)}&status=eq.pending`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({ status: "rejected", reviewed_at: now, updated_at: now })
      });
      if (!Array.isArray(rows) || !rows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: "Pending defining-track submission was not found." }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows[0] }) };
    }

    if (action === "list_artist_bio_submissions") {
      if (!artist_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Artist id is required." }) };
      const rows = await api(`artist_bio_submissions?artist_id=eq.${encodeURIComponent(artist_id)}&status=eq.pending&select=id,artist_id,user_id,bio_text,status,created_at,updated_at&order=created_at.asc`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, rows: rows || [] }) };
    }

    if (action === "approve_artist_bio_submission") {
      if (!submission_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Biography submission id is required." }) };
      const submissions = await api(`artist_bio_submissions?id=eq.${encodeURIComponent(submission_id)}&status=eq.pending&select=*`);
      const submission = Array.isArray(submissions) ? submissions[0] : null;
      if (!submission) return { statusCode: 404, headers, body: JSON.stringify({ error: "Pending biography submission was not found." }) };
      const bio = cleanParagraphText(submission.bio_text);
      if (bio.length < 150) return { statusCode: 400, headers, body: JSON.stringify({ error: "Biography submission is too short." }) };
      const now = new Date().toISOString();
      const artistRows = await api(`artists?id=eq.${encodeURIComponent(submission.artist_id)}`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({ bio, updated_at: now })
      });
      if (!Array.isArray(artistRows) || !artistRows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: "Artist was not found." }) };
      await api(`artist_bio_submissions?artist_id=eq.${encodeURIComponent(submission.artist_id)}&status=eq.pending`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "rejected", reviewed_at: now, updated_at: now })
      });
      const rows = await api(`artist_bio_submissions?id=eq.${encodeURIComponent(submission_id)}`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({ status: "approved", reviewed_at: now, updated_at: now })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: Array.isArray(rows) ? rows[0] : rows, artist: artistRows[0] }) };
    }

    if (action === "reject_artist_bio_submission") {
      if (!submission_id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Biography submission id is required." }) };
      const now = new Date().toISOString();
      const rows = await api(`artist_bio_submissions?id=eq.${encodeURIComponent(submission_id)}&status=eq.pending`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({ status: "rejected", reviewed_at: now, updated_at: now })
      });
      if (!Array.isArray(rows) || !rows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: "Pending biography submission was not found." }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows[0] }) };
    }

    if (action === "save_artist") {
      const artistName = cleanText(body.name).slice(0, 180);
      const slugify = value => cleanText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const artistSlug = slugify(body.slug || artistName);
      const artistKey = artistSlug.replace(/-/g, "");
      const cleanYear = value => {
        if (value === "" || value === null || value === undefined) return null;
        const year = Math.round(Number(value));
        return Number.isFinite(year) && year >= 1000 && year <= 9999 ? year : null;
      };
      const cleanDate = value => /^\d{4}-\d{2}-\d{2}$/.test(cleanText(value)) ? cleanText(value) : null;
      const cleanSourceRows = value => (Array.isArray(value) ? value : []).slice(0, 12).map(row => ({
        name: cleanText(row?.name).slice(0, 120),
        url: cleanText(row?.url).slice(0, 800),
        kind: cleanText(row?.kind).slice(0, 120),
        accessed_at: cleanText(row?.accessed_at).slice(0, 40)
      })).filter(row => row.name && /^https:\/\//i.test(row.url));
      const cleanTimestamp = value => {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      };
      if (!artistName || !artistSlug || !artistKey) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Artist name and slug are required." }) };
      }
      const artistPayload = {
        name: artistName,
        name_key: artistKey,
        slug: artistSlug,
        image_url: artistKey === "prince" ? null : cleanText(body.image_url) || null,
        image_source_url: cleanText(body.image_source_url) || null,
        image_author: cleanText(body.image_author) || null,
        image_license: cleanText(body.image_license) || null,
        image_license_url: cleanText(body.image_license_url) || null,
        image_attribution: cleanText(body.image_attribution) || null,
        image_rejected_urls: stringArray(body.image_rejected_urls),
        bio: cleanParagraphText(body.bio) || null,
        bio_sources: cleanSourceRows(body.bio_sources),
        bio_generated_at: cleanTimestamp(body.bio_generated_at),
        bio_generation_model: cleanText(body.bio_generation_model).slice(0, 120) || null,
        country: cleanText(body.country) || null,
        formed_year: cleanYear(body.formed_year),
        disbanded_year: cleanYear(body.disbanded_year),
        birth_date: cleanDate(body.birth_date),
        death_date: cleanDate(body.death_date),
        artist_type: cleanText(body.artist_type) || null,
        genres: cleanTextList(body.genres),
        updated_at: new Date().toISOString()
      };
      const strippedColumns = [];
      let nextPayload = { ...artistPayload };
      let rows = null;
      const maximumAttempts = Object.keys(nextPayload).length + 1;
      for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
        try {
          rows = await api("artists?on_conflict=slug", {
            method: "POST",
            headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify(nextPayload)
          });
          break;
        } catch (error) {
          const missingColumn = missingColumnFromError(error);
          if (!missingColumn || !Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) throw error;
          strippedColumns.push(missingColumn);
          delete nextPayload[missingColumn];
        }
      }
      if (!rows) throw new Error("Could not save the artist after checking the live artist schema.");
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows?.[0] || nextPayload, stripped_columns: strippedColumns }) };
    }

    if (action === "reject_artist_image") {
      const slugify = value => cleanText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const artistSlug = slugify(body.slug || body.name);
      const artistName = cleanText(body.name).slice(0, 180);
      if (!artistSlug && !artistName) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Artist name or slug is required." }) };
      }
      const artistRows = await api(`artists?${artistSlug ? `slug=eq.${encodeURIComponent(artistSlug)}` : `name=eq.${encodeURIComponent(artistName)}`}&select=*`);
      const artistRow = artistRows?.[0] || null;
      if (!artistRow) return { statusCode: 404, headers, body: JSON.stringify({ error: "Artist profile was not found." }) };
      const rejectedUrls = [...new Set(stringArray(artistRow.image_rejected_urls).concat([body.image_url, artistRow.image_url]).map(cleanText).filter(Boolean))];
      let albumIds = [];
      try {
        const links = await api(`album_artists?artist_id=eq.${encodeURIComponent(artistRow.id)}&select=album_id`);
        albumIds = [...new Set((links || []).map(row => cleanText(row.album_id)).filter(Boolean))];
      } catch (error) {
        console.warn("[Muze admin] artist album links unavailable for image replacement", error.message);
      }
      let portraitRows = [];
      if (albumIds.length) {
        const ids = albumIds.map(id => encodeURIComponent(id)).join(",");
        portraitRows = await api(`album_credits?album_id=in.(${ids})&credit_type=eq.performer&image_approved=eq.true&image_url=not.is.null&select=person_name,person_wikidata_id,image_url,image_source_url,image_author,image_license,image_license_url,image_attribution,image_status,image_approved,sort_order`);
      }
      if (!portraitRows.length && artistName) {
        portraitRows = await api(`album_credits?person_name=eq.${encodeURIComponent(artistName)}&image_approved=eq.true&image_url=not.is.null&select=person_name,person_wikidata_id,image_url,image_source_url,image_author,image_license,image_license_url,image_attribution,image_status,image_approved,sort_order&limit=100`);
      }
      const replacement = artistImageCandidate(portraitRows, rejectedUrls);
      const patch = {
        image_url: replacement?.image_url || null,
        image_source_url: replacement?.image_source_url || null,
        image_author: replacement?.image_author || null,
        image_license: replacement?.image_license || null,
        image_license_url: replacement?.image_license_url || null,
        image_attribution: replacement?.image_attribution || null,
        image_rejected_urls: rejectedUrls,
        updated_at: new Date().toISOString()
      };
      const strippedColumns = [];
      let nextPatch = { ...patch };
      let rows = null;
      const maximumAttempts = Object.keys(nextPatch).length + 1;
      for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
        try {
          rows = await api(`artists?id=eq.${encodeURIComponent(artistRow.id)}`, {
            method: "PATCH",
            headers: { "Prefer": "return=representation" },
            body: JSON.stringify(nextPatch)
          });
          break;
        } catch (error) {
          const missingColumn = missingColumnFromError(error);
          if (!missingColumn || !Object.prototype.hasOwnProperty.call(nextPatch, missingColumn)) throw error;
          strippedColumns.push(missingColumn);
          delete nextPatch[missingColumn];
        }
      }
      if (!rows) throw new Error("Could not reject the artist image after checking the live artist schema.");
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: rows?.[0] || { ...artistRow, ...nextPatch }, replacement, rejected_urls: rejectedUrls, stripped_columns: strippedColumns }) };
    }

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







