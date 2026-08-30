async function findItunesPreview(trackName, artistName) {
  if (!trackName || !artistName) return null;
  const albumTitle = arguments[2] || "";
  try {
    const cleanTrack = String(trackName).replace(/\s*\[[^\]]+\]|\s*\([^)]*remaster[^)]*\)/ig, "").trim();
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${cleanTrack} ${artistName}`)}&entity=song&limit=10`);
    if (!res.ok) return null;
    const data = await res.json();
    const match = selectItunesPreview(data.results, trackName, artistName, albumTitle);
    return match ? {
      preview_url: match.previewUrl || "",
      single_art_url: String(match.artworkUrl100 || "").replace("100x100bb", "600x600bb")
    } : null;
  } catch (err) {
    return null;
  }
}

function cleanTrackTitle(value) {
  return clean(String(value || "")
    .replace(/\s*\[[^\]]+\]/g, "")
    .replace(/\s*\([^)]*(?:remaster|version|edit)[^)]*\)/ig, ""));
}

function selectItunesPreview(results, trackName, artistName, albumTitle = "") {
  const targetTrack = cleanTrackTitle(trackName);
  const targetArtist = clean(artistName);
  const targetAlbum = clean(albumTitle);
  const exact = (results || []).filter(item => item.previewUrl
    && cleanTrackTitle(item.trackName) === targetTrack
    && clean(item.artistName) === targetArtist);
  return exact.find(item => targetAlbum && clean(item.collectionName) === targetAlbum) || exact[0] || null;
}

function clean(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+\-=÷x]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function isEdSheeranArtist(value) {
  return clean(value).replace(/[^a-z0-9]+/g, " ").trim() === "ed sheeran";
}
function edSheeranAlbumKey(title, artist) {
  if (!isEdSheeranArtist(artist)) return "";
  const raw = String(title || "").trim().toLowerCase();
  const text = clean(title);
  if (raw === "-" || text === "-" || text.includes("subtract") || text.includes("minus")) return "subtract";
  if (raw === "÷" || text === "÷" || text.includes("divide")) return "divide";
  if (raw === "x" || text === "x" || text.includes("multiply")) return "multiply";
  if (raw === "+" || text === "+" || text.includes("plus")) return "plus";
  if (raw === "=" || text === "=" || text.includes("equals")) return "equals";
  return "";
}
function albumArtistText(album) {
  return (album?.artists || []).map(artist => artist.name || "").join(", ");
}
function albumMatchesRequest(album, title, artist) {
  const wantedEdKey = edSheeranAlbumKey(title, artist);
  const candidateArtist = albumArtistText(album);
  if (wantedEdKey) return edSheeranAlbumKey(album?.name, candidateArtist) === wantedEdKey;
  const wantedTitle = clean(title).replace(/[^a-z0-9]+/g, " ").trim();
  const wantedArtist = clean(artist).replace(/[^a-z0-9]+/g, " ").trim();
  const candidateTitle = clean(album?.name).replace(/[^a-z0-9]+/g, " ").trim();
  const candidateArtistClean = clean(candidateArtist).replace(/[^a-z0-9]+/g, " ").trim();
  const artistOk = !wantedArtist || candidateArtistClean.includes(wantedArtist) || wantedArtist.includes(candidateArtistClean);
  const titleOk = wantedTitle && (candidateTitle === wantedTitle || candidateTitle.includes(wantedTitle) || wantedTitle.includes(candidateTitle));
  return artistOk && titleOk;
}
function edSheeranSearchTitle(title, artist) {
  const key = edSheeranAlbumKey(title, artist);
  return ({ subtract: "-", divide: "÷", multiply: "x", plus: "+", equals: "=" })[key] || title;
}

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
    if (albumId) {
      const albumRes = await fetch(`https://api.spotify.com/v1/albums/${encodeURIComponent(albumId)}`, {
        headers: { "Authorization": "Bearer " + tokenData.access_token }
      });
      const albumData = await albumRes.json().catch(() => null);
      if (!albumRes.ok || !albumMatchesRequest(albumData, title, artist)) albumId = "";
    }
    if (!albumId) {
      const searchTitle = edSheeranSearchTitle(title, artist);
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(`${searchTitle} ${artist}`)}&type=album&limit=20`,
        { headers: { "Authorization": "Bearer " + tokenData.access_token } }
      );
      const searchData = await searchRes.json();
      const albums = searchData.albums?.items || [];
      const match = albums.find(album => albumMatchesRequest(album, title, artist))
        || albums.find(album => albumMatchesRequest(album, searchTitle, artist))
        || albums[0];
      albumId = match?.id || "";
    }

    if (!albumId) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks: [] }) };
    }

    const tracksRes = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
      headers: { "Authorization": "Bearer " + tokenData.access_token }
    });
    const tracksData = await tracksRes.json();
    const spotifyTracks = tracksData.items || [];
    const trackIds = spotifyTracks.map(t => t.id).filter(Boolean).slice(0, 50);
    const trackDetailsById = {};
    if (trackIds.length) {
      try {
        const detailsRes = await fetch(`https://api.spotify.com/v1/tracks?ids=${trackIds.join(",")}`, {
          headers: { "Authorization": "Bearer " + tokenData.access_token }
        });
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          (detailsData.tracks || []).filter(Boolean).forEach(track => {
            trackDetailsById[track.id] = track;
          });
        }
      } catch (err) {
        // Track details are nice-to-have metadata for the UI vibe pill.
      }
    }
    const tracks = await Promise.all(spotifyTracks.map(async t => {
      const fullTrack = trackDetailsById[t.id] || t;
      const spotifyPreview = fullTrack.preview_url || t.preview_url || "";
      const itunesMatch = spotifyPreview ? null : await findItunesPreview(t.name, artist, title);
      const spotifyTrackArt = fullTrack.album?.images?.[0]?.url || "";
      return {
        spotify_id: t.id,
        name: t.name,
        track_number: t.track_number,
        disc_number: t.disc_number || fullTrack.disc_number || null,
        spotify_url: t.external_urls?.spotify || "",
        preview_url: itunesMatch?.preview_url || spotifyPreview,
        preview_source: itunesMatch?.preview_url ? "itunes" : (spotifyPreview ? "spotify" : ""),
        single_art_url: itunesMatch?.single_art_url || spotifyTrackArt,
        duration_ms: fullTrack.duration_ms || t.duration_ms || 0,
        popularity: Number.isFinite(Number(fullTrack.popularity)) ? Number(fullTrack.popularity) : null,
        explicit: Boolean(fullTrack.explicit)
      };
    }));

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks }) };
  } catch (err) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Function crashed", message: err.message }) };
  }
};

exports._test = { cleanTrackTitle, selectItunesPreview };
