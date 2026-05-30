async function findItunesPreview(trackName, artistName) {
  if (!trackName || !artistName) return "";
  try {
    const cleanTrack = String(trackName).replace(/\s*\[[^\]]+\]|\s*\([^)]*remaster[^)]*\)/ig, "").trim();
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${cleanTrack} ${artistName}`)}&entity=song&limit=5`);
    if (!res.ok) return "";
    const data = await res.json();
    const targetTrack = cleanTrack.toLowerCase();
    const targetArtist = String(artistName).toLowerCase();
    const match = (data.results || []).find(item => {
      const itemTrack = String(item.trackName || "").toLowerCase();
      const itemArtist = String(item.artistName || "").toLowerCase();
      return item.previewUrl && itemArtist.includes(targetArtist.split(/\s+/)[0]) && (itemTrack === targetTrack || itemTrack.includes(targetTrack) || targetTrack.includes(itemTrack));
    }) || (data.results || []).find(item => item.previewUrl);
    return match?.previewUrl || "";
  } catch (err) {
    return "";
  }
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
      const fallbackPreview = spotifyPreview ? "" : await findItunesPreview(t.name, artist);
      return {
        spotify_id: t.id,
        name: t.name,
        track_number: t.track_number,
        disc_number: t.disc_number || fullTrack.disc_number || null,
        spotify_url: t.external_urls?.spotify || "",
        preview_url: spotifyPreview || fallbackPreview,
        preview_source: spotifyPreview ? "spotify" : (fallbackPreview ? "itunes" : ""),
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
