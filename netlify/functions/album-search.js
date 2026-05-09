exports.handler = async function(event) {
  try {
    const q = event.queryStringParameters?.q || "";

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
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Spotify token failed",
          spotifyResponse: tokenData
        })
      };
    }

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=10`,
      {
        headers: {
          "Authorization": "Bearer " + tokenData.access_token
        }
      }
    );

const rawText = await searchRes.text();

let data;
try {
  data = JSON.parse(rawText);
} catch (e) {
  return {
    statusCode: 500,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      error: "Spotify returned non-JSON",
      rawResponse: rawText
    })
  };
}

    if (!data.albums || !data.albums.items) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Spotify API failed",
          spotifyResponse: data
        })
      };
    }

    const albums = data.albums.items.map(a => ({
      spotify_id: a.id,
      title: a.name,
      artist: a.artists.map(x => x.name).join(", "),
      year: a.release_date ? a.release_date.slice(0, 4) : "",
      cover_url: a.images?.[0]?.url || "",
      spotify_url: a.external_urls.spotify
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albums })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Function crashed",
        message: err.message
      })
    };
  }
};
