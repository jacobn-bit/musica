exports.handler = async function(event) {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Supabase admin settings are missing in Netlify." })
      };
    }

    const title = String(body.title || "").replace(/\s+/g, " ").trim();
    const artist = String(body.artist || "").replace(/\s+/g, " ").trim();
    if (!title || !artist) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Album title and artist are required." }) };
    }

    const yearValue = Number(body.year);
    const album = {
      title,
      artist,
      year: Number.isFinite(yearValue) && yearValue > 0 ? Math.round(yearValue) : null,
      genre: String(body.genre || "Album").replace(/\s+/g, " ").trim().slice(0, 60) || "Album",
      cover_url: String(body.cover_url || "").trim(),
      spotify_url: String(body.spotify_url || "").trim(),
      summary: String(body.summary || "").replace(/\s+/g, " ").trim(),
      spotify_id: String(body.spotify_id || "").trim()
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/albums`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(album)
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({ error: "Album save failed.", details: text })
      };
    }

    const rows = text ? JSON.parse(text) : [];
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, album: rows[0] || album }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Function crashed", message: error.message }) };
  }
};
