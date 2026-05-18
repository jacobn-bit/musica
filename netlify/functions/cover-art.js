const MUSICBRAINZ_ROOT = "https://musicbrainz.org/ws/2";
const COVER_ART_ROOT = "https://coverartarchive.org";
const USER_AGENT = "Musica/1.0 (https://lucent-cucurucho-2eda91.netlify.app)";

function json(statusCode, body, cacheSeconds = 0) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": cacheSeconds ? "public, max-age=" + cacheSeconds : "no-store"
    },
    body: JSON.stringify(body)
  };
}

function clean(value) {
  return String(value || "")
    .replace(/\([^)]*remaster[^)]*\)/ig, " ")
    .replace(/\([^)]*edition[^)]*\)/ig, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(remastered|remaster|deluxe|expanded|anniversary|edition|explicit|clean)\b/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeQuery(value) {
  return String(value || "").replace(/([+\-!(){}\[\]^"~*?:\\/])/g, "\\$1");
}

function imageUrl(image) {
  return image && image.thumbnails && (image.thumbnails["1200"] || image.thumbnails.large || image.thumbnails["500"]) || image && image.image || "";
}

function pickBackImage(images) {
  return (images || []).find(img => img.back === true)
    || (images || []).find(img => (img.types || []).some(type => String(type).toLowerCase() === "back"));
}

function releaseScore(release, wantedTitle, wantedArtist, wantedYear) {
  const title = normalize(release.title);
  const artist = normalize((release["artist-credit"] || []).map(a => a.name || (a.artist && a.artist.name) || "").join(" "));
  const year = String(release.date || "").slice(0, 4);
  let score = Number(release.score || 0);
  if (title === wantedTitle) score += 35;
  else if (title.includes(wantedTitle) || wantedTitle.includes(title)) score += 15;
  if (artist.includes(wantedArtist) || wantedArtist.includes(artist)) score += 25;
  if (wantedYear && year === wantedYear) score += 15;
  if (String(release.status || "").toLowerCase() === "official") score += 8;
  if (String(release["primary-type"] || "").toLowerCase() === "album") score += 8;
  return score;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": USER_AGENT
    }
  });
  if (!res.ok) return { ok: false, status: res.status, data: null };
  return { ok: true, status: res.status, data: await res.json() };
}

async function findBackCover({ title, artist, year }) {
  const cleanTitle = clean(title);
  const cleanArtist = clean(artist);
  const wantedTitle = normalize(cleanTitle);
  const wantedArtist = normalize(cleanArtist);
  const wantedYear = String(year || "").slice(0, 4);
  const queryParts = [];
  if (cleanTitle) queryParts.push('release:"' + escapeQuery(cleanTitle) + '"');
  if (cleanArtist) queryParts.push('artist:"' + escapeQuery(cleanArtist) + '"');
  const url = MUSICBRAINZ_ROOT + "/release?query=" + encodeURIComponent(queryParts.join(" ")) + "&limit=8&fmt=json";
  const search = await fetchJson(url);
  if (!search.ok) return { found: false, reason: "musicbrainz-search-failed", status: search.status };
  const releases = (search.data.releases || [])
    .filter(release => release.id)
    .sort((a, b) => releaseScore(b, wantedTitle, wantedArtist, wantedYear) - releaseScore(a, wantedTitle, wantedArtist, wantedYear));

  for (const release of releases.slice(0, 5)) {
    const art = await fetchJson(COVER_ART_ROOT + "/release/" + release.id + "/");
    if (!art.ok) continue;
    const back = pickBackImage(art.data.images);
    const backUrl = imageUrl(back);
    if (backUrl) {
      return {
        found: true,
        mbid: release.id,
        title: release.title || cleanTitle,
        artist: (release["artist-credit"] || []).map(a => a.name || (a.artist && a.artist.name) || "").filter(Boolean).join(", ") || cleanArtist,
        year: String(release.date || "").slice(0, 4),
        back_url: backUrl,
        image_id: back.id || null,
        source: "cover-art-archive"
      };
    }
  }
  return { found: false, reason: "no-back-cover-found" };
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, {});
  try {
    const params = event.queryStringParameters || {};
    const title = params.title || "";
    const artist = params.artist || "";
    const year = params.year || "";
    if (!title || !artist) return json(400, { error: "title and artist are required" });
    const result = await findBackCover({ title, artist, year });
    return json(200, result, result.found ? 604800 : 86400);
  } catch (error) {
    return json(500, { error: "Cover art lookup failed", message: error.message });
  }
};
