exports.handler = async function(event) {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Supabase service settings are missing." }) };
    }

    const token = String(event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Missing auth token." }) };
    }

    const body = JSON.parse(event.body || "{}");
    const ownDeviceId = String(body.device_id || "").trim();
    const ownUsername = String(body.username || "").trim();

    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` }
    });
    const authText = await authRes.text();
    if (!authRes.ok) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid auth token." }) };
    }
    const user = authText ? JSON.parse(authText) : {};
    const userId = String(user.id || "").trim();
    if (!userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid auth user." }) };
    }
    const explicitTarget = Boolean(body.target_user_id || body.target_device_id || body.target_username);
    const targetUserId = String(body.target_user_id || "").trim() || (explicitTarget ? "" : userId);
    const targetDeviceId = String(body.target_device_id || "").trim() || (explicitTarget ? "" : ownDeviceId);
    const targetUsername = String(body.target_username || "").trim() || (explicitTarget ? "" : ownUsername);

    const api = async path => {
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "count=exact"
        }
      });
      const text = await res.text();
      if (!res.ok) {
        const error = new Error(text || `Supabase request failed: ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return text ? JSON.parse(text) : [];
    };

    const encode = value => encodeURIComponent(value);
    const schemaError = error => /column|schema cache|does not exist|user_id|username|name/i.test(String(error?.message || error || ""));
    const fetchStatRows = async (table, select, usernameColumn = "username") => {
      const queries = [
        targetUserId ? `${table}?select=${encode(select)}&user_id=eq.${encode(targetUserId)}` : "",
        targetDeviceId ? `${table}?select=${encode(select)}&device_id=eq.${encode(targetDeviceId)}` : "",
        targetUsername ? `${table}?select=${encode(select)}&${usernameColumn}=ilike.${encode(targetUsername)}` : ""
      ].filter(Boolean);
      const batches = await Promise.all(queries.map(async query => {
        try {
          return await api(query);
        } catch (error) {
          if (schemaError(error)) return [];
          throw error;
        }
      }));
      return batches.flat();
    };

    const uniqueCount = (rows, keyFn) => new Set((rows || []).map(keyFn).filter(Boolean).map(String)).size;
    const uniqueRows = (rows, keyFn) => {
      const seen = new Set();
      return (rows || []).filter((row, index) => {
        const key = String(keyFn(row, index) || "").trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const [libraries, albumRatings, trackRatings, albumComments, trackComments, albumReplies, sharedMessages] = await Promise.all([
      fetchStatRows("user_libraries", "id,album_count,items"),
      fetchStatRows("ratings", "id,album_id"),
      fetchStatRows("track_ratings", "id,album_ref,track_key,track_name,rating,created_at"),
      fetchStatRows("album_comments", "id", "name"),
      fetchStatRows("track_comments", "id", "name"),
      fetchStatRows("album_comment_replies", "id", "name"),
      targetUserId ? api(`chat_messages?select=id&sender_id=eq.${encode(targetUserId)}&message_type=neq.text`) : []
    ]);
    const uniqueTrackRatings = uniqueRows(trackRatings, row => `${row.album_ref || ""}::${row.track_key || row.id || ""}`);

    const albumsAdded = Math.max(0, ...libraries.map(row => Math.max(Number(row.album_count || 0), Array.isArray(row.items) ? row.items.length : 0)));
    const stats = {
      albumsAdded,
      albumsRated: uniqueCount(albumRatings, row => row.album_id || row.id),
      songsRated: uniqueTrackRatings.length,
      songsShared: uniqueCount(sharedMessages, row => row.id),
      commentsLeft: uniqueCount(albumComments, row => row.id) + uniqueCount(trackComments, row => row.id) + uniqueCount(albumReplies, row => row.id)
    };

    if (body.activity === "songsRated") {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, stats, activity: uniqueTrackRatings }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, stats }) };
  } catch (error) {
    console.error("[Muze profile stats]", error);
    return { statusCode: error.status || 500, headers, body: JSON.stringify({ error: error.message || "Unable to load profile stats." }) };
  }
};
