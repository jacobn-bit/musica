const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=1800"
};

async function fetchJson(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || data?.message || `Request failed: ${response.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function addTrend(scoreMap, name, points, source) {
  const clean = String(name || "").trim();
  if (!clean) return;
  const key = clean.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!key) return;
  const existing = scoreMap.get(key) || { name: clean, score: 0, sources: [] };
  existing.score += points;
  if (!existing.sources.includes(source)) existing.sources.push(source);
  scoreMap.set(key, existing);
}

async function listenBrainzArtists(scoreMap) {
  const url = "https://api.listenbrainz.org/1/stats/sitewide/artists?range=week&count=50";
  const data = await fetchJson(url, { headers: { "User-Agent": "Muze/1.0 (https://themuze.app)" } });
  const artists = data?.payload?.artists || data?.payload?.artist || data?.artists || [];
  artists.forEach((artist, index) => {
    const name = artist.artist_name || artist.name || artist.artist_mbid || "";
    const listens = Number(artist.listen_count || artist.total_listen_count || 0);
    addTrend(scoreMap, name, Math.max(5, 80 - index) + Math.min(40, listens / 1000), "ListenBrainz weekly listeners");
  });
}

async function lastFmArtists(scoreMap) {
  const apiKey = process.env.LASTFM_API_KEY || process.env.LAST_FM_API_KEY;
  if (!apiKey) return;
  const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${encodeURIComponent(apiKey)}&format=json&limit=50`;
  const data = await fetchJson(url);
  const artists = data?.artists?.artist || [];
  artists.forEach((artist, index) => {
    const name = artist.name || "";
    const listeners = Number(artist.listeners || 0);
    addTrend(scoreMap, name, Math.max(5, 70 - index) + Math.min(30, listeners / 100000), "Last.fm global chart");
  });
}

exports.handler = async function () {
  try {
    const scoreMap = new Map();
    const results = await Promise.allSettled([
      listenBrainzArtists(scoreMap),
      lastFmArtists(scoreMap)
    ]);
    const errors = results
      .filter(result => result.status === "rejected")
      .map(result => result.reason?.message || String(result.reason));
    const artists = [...scoreMap.values()]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 60)
      .map((artist, index) => ({ ...artist, rank: index + 1, score: Number(artist.score.toFixed(2)) }));
    return { statusCode: 200, headers, body: JSON.stringify({ artists, errors, updated_at: new Date().toISOString() }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Trending artists could not be loaded." }) };
  }
};
