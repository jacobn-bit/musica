exports.handler = async function(event) {
  const q = event.queryStringParameters.q;

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

  const searchRes = await fetch(
    "https://api.spotify.com/v1/search?type=album&limit=12&q=" + encodeURIComponent(q),
    {
      headers: {
        "Authorization": "Bearer " + tokenData.access_token
      }
    }
  );

  const data = await searchRes.json();

  const albums = data.albums.items.map(a => ({
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
};