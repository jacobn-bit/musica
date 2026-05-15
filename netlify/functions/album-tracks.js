exports.handler = async function(event) {
  try {
    const spotifyId = event.queryStringParameters?.spotify_id || "";
    const title = event.queryStringParameters?.title || "";
    const artist = event.queryStringParameters?.artist || "";

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Spotify token failed", spotifyResponse: tokenData }) };
    }

    let albumId = spotifyId;
    if (!albumId) {
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(`${title} ${artist}`)}&type=album&limit=1`,
        { headers: { "Authorization": "Bearer " + tokenData.access_token } }
      );
      const searchData = await searchRes.json();
      albumId = searchData.albums?.items?.[0]?.id || "";
    }

    if (!albumId) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks: [] }) };
    }

    const tracksRes = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
      headers: { "Authorization": "Bearer " + tokenData.access_token }
    });
    const tracksData = await tracksRes.json();
    const tracks = (tracksData.items || []).map(t => ({
      spotify_id: t.id,
      name: t.name,
      track_number: t.track_number,
      spotify_url: t.external_urls?.spotify || "",
      preview_url: t.preview_url || "",
      duration_ms: t.duration_ms || 0
    }));

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks }) };
  } catch (err) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Function crashed", message: err.message }) };
  }
};

