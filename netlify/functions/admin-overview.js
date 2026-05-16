exports.handler = async function(event) {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const adminPin = process.env.MUSICA_ADMIN_PIN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!adminPin) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "MUSICA_ADMIN_PIN is not configured in Netlify." }) };
    }

    if (String(body.pin || "") !== String(adminPin)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Incorrect admin PIN." }) };
    }

    if (body.action === "verify") {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (body.action !== "save") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action." }) };
    }

    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Supabase service role settings are missing in Netlify." }) };
    }

    const album_key = String(body.album_key || "").trim();
    const title = String(body.title || "").trim();
    const artist = String(body.artist || "").trim();
    const overview = String(body.overview || "").trim();

    if (!album_key || !title) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Album key and title are required." }) };
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/album_overviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({ album_key, title, artist, overview, updated_at: new Date().toISOString() })
    });

    const text = await res.text();
    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: "Could not save overview.", details: text }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, row: text ? JSON.parse(text)[0] : null }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Unexpected error" }) };
  }
};
