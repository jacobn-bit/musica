const SPOTIFY_SEARCH_LIMIT = 10;
const PRODUCTION_SEARCH_URL = "https://themuze.app/.netlify/functions/album-search";

function normalizeAlbumText(value) {
  return String(value || "").toLowerCase().replace(/&/g, " and ")
    .replace(/\([^)]*(remaster(?:ed)?|deluxe|expanded|anniversary|edition|version|bonus)[^)]*\)/gi, " ")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function itunesGenreForSpotifyAlbum(album, itunesAlbums) {
  const title = normalizeAlbumText(album?.name);
  const artists = (album?.artists || []).map(item => normalizeAlbumText(item?.name)).filter(Boolean);
  const exact = (itunesAlbums || []).find(item => {
    const itemTitle = normalizeAlbumText(item?.collectionName);
    const itemArtist = normalizeAlbumText(item?.artistName);
    return title && itemTitle === title && artists.some(artist => itemArtist === artist || itemArtist.includes(artist) || artist.includes(itemArtist));
  });
  if (exact?.primaryGenreName) return String(exact.primaryGenreName).trim();
  const sameArtist = (itunesAlbums || []).find(item => {
    const itemArtist = normalizeAlbumText(item?.artistName);
    return artists.some(artist => itemArtist === artist || itemArtist.includes(artist) || artist.includes(itemArtist));
  });
  return String(sameArtist?.primaryGenreName || "").trim();
}

async function itunesAlbumResults(q) {
  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=album&limit=50`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (_) { return []; }
}

function isLocalRequest(event) {
  return /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(String(event.headers?.host || ""));
}

async function productionSearch(q) {
  const response = await fetch(`${PRODUCTION_SEARCH_URL}?q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
  return { statusCode: response.status, headers: { "Content-Type": "application/json" }, body: await response.text() };
}

exports.handler = async function(event) {
  const headers = { "Content-Type": "application/json" };
  try {
    const q = String(event.queryStringParameters?.q || "").trim();
    if (!q) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Search query is required." }) };
    }

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
    if (!tokenRes.ok || !tokenData.access_token) {
      // Netlify keeps secret values write-only, so local Netlify Dev receives a
      // redacted value. Use Muze's deployed server without exposing the secret.
      if (isLocalRequest(event)) return productionSearch(q);
      return { statusCode: tokenRes.status || 500, headers, body: JSON.stringify({ error: "Spotify token failed.", spotifyResponse: tokenData }) };
    }

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?type=album&limit=${SPOTIFY_SEARCH_LIMIT}&q=` + encodeURIComponent(q),
      { headers: { "Authorization": "Bearer " + tokenData.access_token } }
    );

    const data = await searchRes.json();
    if (!searchRes.ok || !data.albums || !data.albums.items) {
      return { statusCode: searchRes.status || 500, headers, body: JSON.stringify({ error: "Spotify API failed", spotifyResponse: data }) };
    }

    const itunesAlbums = await itunesAlbumResults(q);
    const albums = data.albums.items.map(a => ({
      spotify_id: a.id || "",
      title: a.name,
      artist: a.artists.map(x => x.name).join(", "),
      genre: itunesGenreForSpotifyAlbum(a, itunesAlbums),
      album_type: a.album_type || "album",
      release_date: a.release_date || "",
      total_tracks: Number(a.total_tracks || 0),
      year: a.release_date ? a.release_date.slice(0, 4) : "",
      cover_url: a.images?.[0]?.url || "",
      spotify_url: a.external_urls?.spotify || ""
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ albums }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Album search failed." }) };
  }
};

exports._test = { SPOTIFY_SEARCH_LIMIT, isLocalRequest, normalizeAlbumText, itunesGenreForSpotifyAlbum };
