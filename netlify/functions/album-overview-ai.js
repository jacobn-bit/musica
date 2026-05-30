const jsonHeaders = { "Content-Type": "application/json" };
const USER_AGENT = "MuzeAlbumOverview/1.0 (https://themuze.app)";
const LOG_PREFIX = "[Muze overview AI]";
const SOURCE_FETCH_TIMEOUT_MS = 8000;
const OPENAI_FETCH_TIMEOUT_MS = 25000;
const SUPABASE_FETCH_TIMEOUT_MS = 12000;

function logStep(label, details = {}) {
  console.log(LOG_PREFIX, label, details);
}

function normalizeOverviewTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value, max = 1200) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanAlbumTitle(title) {
  const editionWords = "deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|edition|version|bonus|mono|stereo|reissue";
  const removableParen = new RegExp(`\\s*\\((?=[^)]*(${editionWords}))[\\s\\S]*?\\)`, "gi");
  const removableBracket = new RegExp(`\\s*\\[(?=[^\\]]*(${editionWords}))[\\s\\S]*?\\]`, "gi");
  let cleaned = String(title || "")
    .replace(/\s*[-\u2013\u2014]\s*(deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|bonus).*$/i, "")
    .replace(removableParen, "")
    .replace(removableBracket, "")
    .replace(/\b(remaster(?:ed)?|deluxe|expanded|anniversary|edition|version)\s*\d{4}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(title || "").trim();
}

function hasStructuredOverview(row) {
  return Boolean(row && (row.intro_summary || row.sound_summary || row.impact_summary || row.legacy_summary || row.quote_headline));
}

function cleanTrackList(tracks) {
  return (Array.isArray(tracks) ? tracks : [])
    .map(track => typeof track === "string" ? track : track?.name)
    .map(track => cleanText(track, 120))
    .filter(Boolean)
    .filter((track, index, all) => all.findIndex(item => item.toLowerCase() === track.toLowerCase()) === index);
}

function unique(values) {
  return [...new Set(values.map(value => cleanText(value, 300)).filter(Boolean))];
}

function sourceUrl(type, id) {
  if (type === "wikidata" && id) return `https://www.wikidata.org/wiki/${id}`;
  if (type === "musicbrainz" && id) return `https://musicbrainz.org/release-group/${id}`;
  return "";
}

async function fetchWithTimeout(url, options = {}, label = "request", timeoutMs = SOURCE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, label = "request") {
  logStep(`${label} request`, { url });
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" } }, label);
  if (!res.ok) throw new Error(`${url} failed with ${res.status}`);
  const data = await res.json();
  logStep(`${label} success`, { url });
  return data;
}

async function fetchWikipediaSource(album) {
  const query = `${album.artist || ""} ${album.clean_title || album.title || ""} album`.trim();
  if (!query) return null;
  try {
    logStep("Wikipedia search identity", { title: album.title, clean_title: album.clean_title, artist: album.artist, query });
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=5`;
    const searchData = await fetchJson(searchUrl, "Wikipedia search");
    const results = searchData.query?.search || [];
    const identityTokens = normalizeOverviewTitle(`${album.artist || ""} ${album.clean_title || album.title || ""}`).split(" ").filter(Boolean).slice(0, 5);
    const result = results.find(item => {
      const haystack = normalizeOverviewTitle(`${item.title || ""} ${cleanText(item.snippet || "", 500)}`);
      return haystack.includes("album") && identityTokens.some(token => haystack.includes(token));
    }) || results.find(item => /album/i.test(`${item.title || ""} ${item.snippet || ""}`)) || results[0];
    if (!result?.title) {
      logStep("Wikipedia search empty", { query });
      return null;
    }

    const pageTitle = result.title;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const summary = await fetchJson(summaryUrl, "Wikipedia summary");
    const pageQueryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageprops&explaintext=1&exintro=0&redirects=1&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
    const pageData = await fetchJson(pageQueryUrl, "Wikipedia page extract").catch(error => {
      console.warn(LOG_PREFIX, "Wikipedia page extract failed", { url: pageQueryUrl, error: error.message || error });
      return null;
    });
    const page = pageData ? Object.values(pageData.query?.pages || {})[0] : null;
    const source = {
      type: "wikipedia",
      title: summary.title || pageTitle,
      extract: cleanText(page?.extract || summary.extract, 2600),
      summary: cleanText(summary.extract, 1200),
      wikidata_id: page?.pageprops?.wikibase_item || summary.wikibase_item || "",
      url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/\s+/g, "_"))}`
    };
    logStep("Wikipedia source returned", { title: source.title, url: source.url, wikidata_id: source.wikidata_id, summary: source.summary, extract_sample: cleanText(source.extract, 700) });
    return source;
  } catch (error) {
    console.warn(LOG_PREFIX, "Wikipedia lookup failed", { query, error: error.message || error });
    return null;
  }
}

async function fetchWikidataFacts(album, wikidataId) {
  try {
    let qid = wikidataId || "";
    if (!qid) {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(`${album.artist || ""} ${album.clean_title || album.title || ""}`)}&language=en&format=json&origin=*&limit=5`;
      const searchData = await fetchJson(searchUrl, "Wikidata entity search");
      qid = (searchData.search || []).find(item => /album|record|release/i.test(`${item.description || ""} ${item.label || ""}`))?.id || searchData.search?.[0]?.id || "";
    }
    if (!qid) {
      logStep("Wikidata no entity", { title: album.title, clean_title: album.clean_title, artist: album.artist });
      return null;
    }

    const query = `
      SELECT ?releaseDate ?genreLabel ?producerLabel ?labelLabel ?performerLabel ?countryLabel WHERE {
        VALUES ?album { wd:${qid} }
        OPTIONAL { ?album wdt:P577 ?releaseDate. }
        OPTIONAL { ?album wdt:P136 ?genre. }
        OPTIONAL { ?album wdt:P162 ?producer. }
        OPTIONAL { ?album wdt:P264 ?label. }
        OPTIONAL { ?album wdt:P175 ?performer. }
        OPTIONAL { ?album wdt:P495 ?country. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 60`;
    const data = await fetchJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, "Wikidata SPARQL");
    const rows = data.results?.bindings || [];
    const facts = {
      type: "wikidata",
      id: qid,
      url: sourceUrl("wikidata", qid),
      release_dates: unique(rows.map(row => row.releaseDate?.value?.slice(0, 10))),
      genres: unique(rows.map(row => row.genreLabel?.value)),
      producers: unique(rows.map(row => row.producerLabel?.value)),
      labels: unique(rows.map(row => row.labelLabel?.value)),
      performers: unique(rows.map(row => row.performerLabel?.value)),
      countries: unique(rows.map(row => row.countryLabel?.value))
    };
    logStep("Wikidata facts returned", facts);
    return facts;
  } catch (error) {
    console.warn(LOG_PREFIX, "Wikidata lookup failed", { title: album.title, clean_title: album.clean_title, artist: album.artist, error: error.message || error });
    return null;
  }
}

async function fetchMusicBrainzFacts(album) {
  try {
    const query = [
      album.artist ? `artist:"${album.artist}"` : "",
      album.clean_title || album.title ? `releasegroup:"${album.clean_title || album.title}"` : "",
      "primarytype:album"
    ].filter(Boolean).join(" AND ");
    if (!query) return null;
    const searchUrl = `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
    const searchData = await fetchJson(searchUrl, "MusicBrainz release-group search");
    const groups = searchData["release-groups"] || [];
    const identityTokens = normalizeOverviewTitle(`${album.artist || ""} ${album.clean_title || album.title || ""}`).split(" ").filter(Boolean).slice(0, 5);
    const group = groups.find(item => {
      const haystack = normalizeOverviewTitle(`${item.title || ""} ${(item["artist-credit"] || []).map(credit => credit.name).join(" ")}`);
      return identityTokens.every(token => haystack.includes(token)) || item.score >= 90;
    }) || groups[0];
    if (!group?.id) {
      logStep("MusicBrainz no release-group", { query });
      return null;
    }
    const detailUrl = `https://musicbrainz.org/ws/2/release-group/${group.id}?inc=artist-credits+tags+ratings+releases&fmt=json`;
    const detail = await fetchJson(detailUrl, "MusicBrainz release-group detail").catch(error => {
      console.warn(LOG_PREFIX, "MusicBrainz detail failed", { url: detailUrl, error: error.message || error });
      return {};
    });
    const releaseDates = unique([group["first-release-date"], detail["first-release-date"], ...(detail.releases || []).map(release => release.date)]);
    const labels = unique((detail.releases || []).flatMap(release => (release["label-info"] || []).map(info => info.label?.name)));
    const facts = {
      type: "musicbrainz",
      id: group.id,
      url: sourceUrl("musicbrainz", group.id),
      title: group.title || detail.title || "",
      artist: (group["artist-credit"] || detail["artist-credit"] || []).map(credit => credit.name).filter(Boolean).join(", "),
      first_release_dates: releaseDates,
      primary_type: group["primary-type"] || detail["primary-type"] || "",
      secondary_types: unique([...(group["secondary-types"] || []), ...(detail["secondary-types"] || [])]),
      tags: unique([...(group.tags || []), ...(detail.tags || [])].map(tag => tag.name)).slice(0, 12),
      labels: labels.slice(0, 8),
      score: group.score || null
    };
    logStep("MusicBrainz facts returned", facts);
    return facts;
  } catch (error) {
    console.warn(LOG_PREFIX, "MusicBrainz lookup failed", { title: album.title, clean_title: album.clean_title, artist: album.artist, error: error.message || error });
    return null;
  }
}

function compactSource(source) {
  if (!source) return null;
  if (source.type === "wikipedia") return { type: source.type, title: source.title, url: source.url, wikidata_id: source.wikidata_id };
  if (source.type === "wikidata") return { type: source.type, id: source.id, url: source.url };
  if (source.type === "musicbrainz") return { type: source.type, id: source.id, title: source.title, url: source.url };
  return source;
}

function buildResearchSummary(research) {
  const notes = [];
  const album = research.album;
  notes.push(`Album identity: ${album.clean_title || album.title} by ${album.artist || "Unknown artist"}${album.year ? ` (${album.year})` : ""}.`);
  if (album.genre) notes.push(`Spotify/app genre or style: ${album.genre}.`);
  if (research.spotify_tracks.length) notes.push(`Spotify/app known tracks: ${research.spotify_tracks.slice(0, 12).join(", ")}.`);
  if (research.wikipedia?.summary) notes.push(`Wikipedia page "${research.wikipedia.title}": ${research.wikipedia.summary}`);
  if (research.wikidata) {
    if (research.wikidata.release_dates?.length) notes.push(`Wikidata release date: ${research.wikidata.release_dates.slice(0, 3).join(", ")}.`);
    if (research.wikidata.genres?.length) notes.push(`Wikidata genre/style: ${research.wikidata.genres.slice(0, 8).join(", ")}.`);
    if (research.wikidata.producers?.length) notes.push(`Wikidata producer(s): ${research.wikidata.producers.slice(0, 8).join(", ")}.`);
    if (research.wikidata.labels?.length) notes.push(`Wikidata label(s): ${research.wikidata.labels.slice(0, 6).join(", ")}.`);
  }
  if (research.musicbrainz) {
    if (research.musicbrainz.first_release_dates?.length) notes.push(`MusicBrainz first release date: ${research.musicbrainz.first_release_dates.slice(0, 4).join(", ")}.`);
    if (research.musicbrainz.tags?.length) notes.push(`MusicBrainz tags: ${research.musicbrainz.tags.slice(0, 10).join(", ")}.`);
    if (research.musicbrainz.labels?.length) notes.push(`MusicBrainz label(s): ${research.musicbrainz.labels.slice(0, 6).join(", ")}.`);
  }
  if (research.wikipedia?.extract) notes.push(`Longer Wikipedia source material for context only, to paraphrase from and not copy: ${research.wikipedia.extract}`);
  return notes.join("\n");
}

function hasMeaningfulResearch(research) {
  return Boolean(
    research.wikipedia?.extract ||
    research.wikipedia?.summary ||
    research.wikidata?.release_dates?.length ||
    research.wikidata?.genres?.length ||
    research.wikidata?.producers?.length ||
    research.musicbrainz?.first_release_dates?.length ||
    research.musicbrainz?.tags?.length
  );
}

function sectionTokens(value) {
  const stopWords = new Set(["the", "and", "that", "this", "with", "for", "from", "into", "its", "it", "his", "her", "their", "album", "record", "music", "sound"]);
  return cleanText(value, 1800)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(token => token.length > 2 && !stopWords.has(token));
}

function sectionSimilarity(a, b) {
  const left = cleanText(a, 1800).toLowerCase();
  const right = cleanText(b, 1800).toLowerCase();
  if (!left || !right) return 0;
  if (left === right) return 1;
  if ((left.length > 45 || right.length > 45) && (left.includes(right) || right.includes(left))) return 0.95;
  const leftTokens = new Set(sectionTokens(left));
  const rightTokens = new Set(sectionTokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const shared = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return shared / union;
}

function containsGenericTemplateText(value) {
  return /building a world with its own mood|its guitars, melodies|made to be argued over|from the \d{4}s|old scenes and new listening habits|as ratings come in|individual tracks start to connect|ratings come in, its place|atmosphere, gravity, and afterlife|period when albums were stretching|researched source data|source data|source notes|sources connect|sourced album data|public source|research notes|metadata points/i.test(String(value || ""));
}

function overviewContainsGenericTemplateText(overview) {
  return ["intro_summary", "sound_summary", "impact_summary", "legacy_summary", "quote_headline", "overview"]
    .some(field => containsGenericTemplateText(overview?.[field]));
}

function duplicateSectionPairs(overview) {
  const fields = ["sound_summary", "impact_summary", "legacy_summary"];
  const pairs = [];
  for (let i = 0; i < fields.length; i += 1) {
    for (let j = i + 1; j < fields.length; j += 1) {
      const similarity = sectionSimilarity(overview?.[fields[i]], overview?.[fields[j]]);
      if (similarity >= 0.72) pairs.push({ left: fields[i], right: fields[j], similarity });
    }
  }
  return pairs;
}

function overviewHasDuplicateSections(overview) {
  return duplicateSectionPairs(overview).length > 0;
}

function makeDistinctFallbackSections(overview, research) {
  const album = research.album;
  const title = album.clean_title || album.title || "This album";
  const artist = album.artist || "the artist";
  const release = research.wikidata?.release_dates?.[0] || research.musicbrainz?.first_release_dates?.[0] || album.year || "";
  const year = release ? String(release).slice(0, 4) : "";
  const genres = unique([...(research.wikidata?.genres || []), ...(research.musicbrainz?.tags || []), album.genre]).slice(0, 5);
  const producers = research.wikidata?.producers || [];
  const labels = unique([...(research.wikidata?.labels || []), ...(research.musicbrainz?.labels || [])]).slice(0, 3);
  const tracks = research.spotify_tracks.slice(0, 5);
  return {
    ...overview,
    sound_summary: genres.length || producers.length
      ? `${genres.length ? `${title} moves through ${genres.join(", ")}` : `${title} carries a clearly shaped sound profile`}${producers.length ? `, with production credit including ${producers.slice(0, 3).join(", ")}` : ""}.`
      : `${title} is best approached through its track list and available production metadata rather than generic mood language.`,
    impact_summary: `${title}${year ? ` arrived in ${year}` : ""}${labels.length ? ` via ${labels.join(", ")}` : ""}, giving ${artist} a release moment that belongs to its original era rather than only to later nostalgia.`,
    legacy_summary: `Heard now, ${title}${tracks.length ? ` still routes listeners through songs such as ${tracks.slice(0, 4).join(", ")}` : ""}, which is why its reputation can be described through the record's specific catalogue details.`
  };
}

function removeGenericTemplateSections(overview, research) {
  if (!overviewContainsGenericTemplateText(overview)) return overview;
  logStep("generic template text rejected", { overview });
  return makeDistinctFallbackSections({
    ...overview,
    intro_summary: containsGenericTemplateText(overview.intro_summary) ? "" : overview.intro_summary,
    sound_summary: containsGenericTemplateText(overview.sound_summary) ? "" : overview.sound_summary,
    impact_summary: containsGenericTemplateText(overview.impact_summary) ? "" : overview.impact_summary,
    legacy_summary: containsGenericTemplateText(overview.legacy_summary) ? "" : overview.legacy_summary,
    quote_headline: containsGenericTemplateText(overview.quote_headline) ? "" : overview.quote_headline
  }, research);
}

async function repairDuplicateOverviewSections(overview, research) {
  const duplicates = duplicateSectionPairs(overview);
  if (!duplicates.length) return overview;
  logStep("duplicate overview sections detected", { duplicates, overview });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return makeDistinctFallbackSections(overview, research);
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["intro_summary", "sound_summary", "impact_summary", "legacy_summary", "quote_headline", "defining_tracks", "sources_used"],
    properties: {
      intro_summary: { type: "string" },
      sound_summary: { type: "string" },
      impact_summary: { type: "string" },
      legacy_summary: { type: "string" },
      quote_headline: { type: "string" },
      defining_tracks: { type: "array", items: { type: "string" } },
      sources_used: { type: "array", items: { type: "string" } }
    }
  };
  const prompt = [
    "Repair this Muze album overview so The Sound, The Impact, and The Legacy are unique.",
    "The Sound = music style, production, atmosphere, instrumentation.",
    "The Impact = reception, chart/commercial success, cultural effect, importance at release.",
    "The Legacy = long-term reputation, influence, and how the album is viewed now.",
    "Do not repeat the same sentence, phrase, or idea across those three fields.",
    "Use only the research notes. Do not invent facts.",
    "",
    "Research notes:",
    research.source_summary,
    "",
    "Current overview JSON:",
    JSON.stringify(overview, null, 2)
  ].join("\n");
  logStep("duplicate repair prompt", { prompt });
  let data;
  try {
    const res = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: "You repair duplicate editorial fields. You keep facts grounded, make sections distinct, and return valid JSON only." },
          { role: "user", content: prompt }
        ],
        text: { format: { type: "json_schema", name: "muze_album_overview_repair", strict: true, schema } }
      })
    }, "OpenAI duplicate repair", OPENAI_FETCH_TIMEOUT_MS);
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(LOG_PREFIX, "Duplicate repair request failed", { status: res.status, error: data.error?.message || data });
      return makeDistinctFallbackSections(overview, research);
    }
  } catch (error) {
    console.warn(LOG_PREFIX, "Duplicate repair request failed", { error: error.message || error });
    return makeDistinctFallbackSections(overview, research);
  }
  let repaired;
  try {
    repaired = JSON.parse(responseOutputText(data));
  } catch (error) {
    console.warn(LOG_PREFIX, "Duplicate repair response was not valid JSON", { error: error.message || error, data });
    return makeDistinctFallbackSections(overview, research);
  }
  const repairedDuplicates = duplicateSectionPairs(repaired);
  if (repairedDuplicates.length) {
    logStep("duplicate repair still similar; applying deterministic fallback", { repairedDuplicates, repaired });
    return makeDistinctFallbackSections(repaired, research);
  }
  logStep("duplicate repair succeeded", repaired);
  return repaired;
}

function researchedFallback(research) {
  const album = research.album;
  const title = album.clean_title || album.title || "This album";
  const artist = album.artist || "the artist";
  const release = research.wikidata?.release_dates?.[0] || research.musicbrainz?.first_release_dates?.[0] || album.year || "";
  const year = release ? String(release).slice(0, 4) : "";
  const genres = unique([...(research.wikidata?.genres || []), ...(research.musicbrainz?.tags || []), album.genre]).slice(0, 4);
  const producers = research.wikidata?.producers || [];
  const labels = unique([...(research.wikidata?.labels || []), ...(research.musicbrainz?.labels || [])]).slice(0, 3);
  const tracks = research.spotify_tracks.slice(0, 5);
  return {
    intro_summary: `${title} by ${artist}${year ? ` arrived in ${year}` : ""}${labels.length ? ` through ${labels.join(", ")}` : ""}, landing as a distinct chapter in the catalogue rather than a blur of nostalgia.`,
    sound_summary: `${genres.length ? `${title} moves through ${genres.join(", ")}.` : `${title} carries its identity through the album's own track list and atmosphere.`}${producers.length ? ` Producer credit includes ${producers.slice(0, 3).join(", ")}.` : ""}`,
    impact_summary: `${title}${year ? ` belongs to ${year}` : " has its own release-era weight"}, giving ${artist} a moment that can be heard as more than a footnote.`,
    legacy_summary: `Today, ${title}${tracks.length ? ` still points listeners toward ${tracks.slice(0, 3).join(", ")}` : " still asks to be heard as a full-album statement"}.`,
    quote_headline: `A charged chapter in ${artist}'s catalogue.`,
    defining_tracks: tracks,
    sources_used: research.sources.map(source => source.url || source.type).filter(Boolean)
  };
}

function metadataFallback(album) {
  const tracks = cleanTrackList(album.tracks).slice(0, 5);
  const title = album.clean_title || album.title || "This album";
  const artist = album.artist || "the artist";
  return {
    intro_summary: `${title} by ${artist} sits in Muze as a record still waiting for a fuller editorial pass.`,
    sound_summary: album.genre ? `${title} leans toward ${album.genre}, with the finer details best left to a deeper listen.` : `${title} keeps its sonic identity close to the album itself: the track list, the mood, and the way listeners carry it forward.`,
    impact_summary: `${title} has a place in ${artist}'s catalogue, but Muze is keeping the claim modest until the album earns a sharper writeup.`,
    legacy_summary: `For now, ${title} reads as an album for listeners to define through ratings, comments, and return visits.`,
    quote_headline: "A record waiting for its full Muze story.",
    defining_tracks: tracks,
    sources_used: ["Muze album metadata"]
  };
}

async function buildResearch(album) {
  const enrichedAlbum = { ...album, clean_title: cleanAlbumTitle(album.title), tracks: album.tracks || [] };
  logStep("research start", { title: enrichedAlbum.title, clean_title: enrichedAlbum.clean_title, artist: enrichedAlbum.artist, year: enrichedAlbum.year, genre: enrichedAlbum.genre, tracks: cleanTrackList(enrichedAlbum.tracks).slice(0, 12) });
  const wikipedia = await fetchWikipediaSource(enrichedAlbum);
  const [wikidata, musicbrainz] = await Promise.all([
    fetchWikidataFacts(enrichedAlbum, wikipedia?.wikidata_id),
    fetchMusicBrainzFacts(enrichedAlbum)
  ]);
  const sources = [wikipedia, wikidata, musicbrainz].filter(Boolean);
  const research = {
    album: enrichedAlbum,
    spotify_tracks: cleanTrackList(enrichedAlbum.tracks),
    wikipedia,
    wikidata,
    musicbrainz,
    sources: sources.map(compactSource).filter(Boolean)
  };
  research.source_summary = buildResearchSummary(research);
  research.has_meaningful_research = hasMeaningfulResearch(research);
  logStep("research complete", { has_meaningful_research: research.has_meaningful_research, sources: research.sources, source_summary: research.source_summary });
  return research;
}

function responseOutputText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .flatMap(item => item.content || [])
    .map(part => part.text || "")
    .join("")
    .trim();
}

async function generateWithOpenAI(research) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(LOG_PREFIX, "OPENAI_API_KEY is not configured; refusing to save generic fallback.");
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  logStep("AI API called", { yes: true, model });
  const prompt = [
    "Using the structured research notes below, write a Muze-style album overview.",
    "Every section must be grounded in the research notes. Mention album-specific facts where relevant.",
    "The Sound field must focus only on music style, production, atmosphere, instrumentation, and sonic identity.",
    "The Impact field must focus only on release-era reception, chart/commercial success, cultural effect, and why the album mattered when it arrived.",
    "The Legacy field must focus only on long-term reputation, influence, and how the album is viewed now.",
    "The Sound, Impact, and Legacy fields must not repeat the same sentence, phrase, or core idea.",
    "Do not write generic filler such as 'a world with its own mood' unless a concrete source fact supports it.",
    "Do not invent facts, awards, chart positions, reception, producers, genres, or recording context.",
    "If details are limited, say less but stay specific.",
    "Use Wikipedia only as source material. Do not copy Wikipedia wording directly.",
    "In the final overview, never mention research, source data, source notes, Wikipedia, Wikidata, MusicBrainz, metadata, or where the information came from.",
    "Keep the tone cinematic, concise, emotionally intelligent, and music-loving.",
    "",
    "Research notes:",
    research.source_summary,
    "",
    "Source URLs used:",
    research.sources.map(source => source.url).filter(Boolean).join("\n") || "No public source URLs found."
  ].join("\n");
  logStep("final AI prompt", { prompt });

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["intro_summary", "sound_summary", "impact_summary", "legacy_summary", "quote_headline", "defining_tracks", "sources_used"],
    properties: {
      intro_summary: { type: "string" },
      sound_summary: { type: "string" },
      impact_summary: { type: "string" },
      legacy_summary: { type: "string" },
      quote_headline: { type: "string" },
      defining_tracks: { type: "array", items: { type: "string" } },
      sources_used: { type: "array", items: { type: "string" } }
    }
  };

  const res = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: "You write original researched editorial album overviews for Muze. You avoid generic copy, never copy source wording, and never invent facts." },
        { role: "user", content: prompt }
      ],
      text: { format: { type: "json_schema", name: "muze_album_overview", strict: true, schema } }
    })
  }, "OpenAI overview generation", OPENAI_FETCH_TIMEOUT_MS);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error?.message || `OpenAI request failed with ${res.status}`);
    error.details = data;
    throw error;
  }
  const generated = JSON.parse(responseOutputText(data));
  generated.generation_model = model;
  logStep("final AI generated overview", generated);
  return generated;
}

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error(LOG_PREFIX, "Supabase service settings missing", { hasSupabaseUrl: Boolean(supabaseUrl), hasServiceRoleKey: Boolean(serviceKey) });
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: "Supabase service settings are missing." }) };
  }

  const api = async (path, options = {}) => {
    const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        ...(options.headers || {})
      }
    }, "Supabase request", SUPABASE_FETCH_TIMEOUT_MS);
    const text = await res.text();
    if (!res.ok) {
      const error = new Error(text || `Supabase request failed: ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return text ? JSON.parse(text) : null;
  };

  try {
    const body = JSON.parse(event.body || "{}");
    const album = { ...(body.album || {}) };
    album.tracks = Array.isArray(body.tracks) ? body.tracks : (Array.isArray(album.tracks) ? album.tracks : []);
    album.clean_title = cleanAlbumTitle(album.title);
    const album_key = normalizeOverviewTitle(body.album_key || album.clean_title || album.title);
    logStep("request received", { album_key, title: album.title, clean_title: album.clean_title, artist: album.artist, force: Boolean(body.force) });
    if (!album_key || !album.title) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: "Album title and album key are required." }) };
    }

    let existingRow = null;
    try {
      const existing = await api(`album_overviews?album_key=eq.${encodeURIComponent(album_key)}&select=*`);
      existingRow = existing?.[0] || null;
      logStep("existing overview lookup", {
        found: Boolean(existingRow),
        fallback_generated: existingRow?.fallback_generated,
        manual_override: existingRow?.manual_override,
        has_source_summary: Boolean(existingRow?.source_summary),
        intro_sample: cleanText(existingRow?.intro_summary || existingRow?.overview || "", 300)
      });
    } catch (error) {
      console.warn(LOG_PREFIX, "Existing overview lookup failed; generating without cache", { message: error.message || error });
    }
    const existingDuplicates = duplicateSectionPairs(existingRow);
    const existingGeneric = overviewContainsGenericTemplateText(existingRow);
    logStep("existing overview validation", { duplicate_count: existingDuplicates.length, duplicates: existingDuplicates, contains_generic_template: existingGeneric });
    if (hasStructuredOverview(existingRow) && existingRow.manual_override && !existingDuplicates.length && !existingGeneric && !body.force) {
      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true, cached: true, row: existingRow }) };
    }
    if (hasStructuredOverview(existingRow) && existingRow.fallback_generated !== true && existingRow.source_summary && !existingDuplicates.length && !existingGeneric && !body.force) {
      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true, cached: true, row: existingRow }) };
    }

    const research = await buildResearch(album);
    let overview;
    let generatedBy = "openai";
    let fallbackGenerated = false;
    try {
      if (!research.has_meaningful_research) {
        logStep("AI API called", { yes: false, reason: "no meaningful research sources found" });
        overview = metadataFallback(research.album);
        generatedBy = "metadata-fallback";
        fallbackGenerated = true;
      } else {
        overview = await generateWithOpenAI(research);
      }
      overview = await repairDuplicateOverviewSections(overview, research);
    } catch (error) {
      console.error(LOG_PREFIX, "Generation failed", { message: error.message || error, details: error.details || null });
      if (research.has_meaningful_research) {
        overview = researchedFallback(research);
        generatedBy = "researched-fallback";
        fallbackGenerated = false;
      } else {
        fallbackGenerated = true;
        overview = metadataFallback(research.album);
        generatedBy = "metadata-fallback";
      }
    }
    overview = removeGenericTemplateSections(await repairDuplicateOverviewSections(overview, research), research);
    const finalDuplicates = duplicateSectionPairs(overview);
    if (finalDuplicates.length) {
      logStep("final duplicate guard applied before save", { finalDuplicates });
      overview = makeDistinctFallbackSections(overview, research);
    }
    if (overviewContainsGenericTemplateText(overview)) {
      console.error(LOG_PREFIX, "Refusing to save generic template overview", { overview });
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: "Generated overview contained generic template text and was rejected." }) };
    }

    const now = new Date().toISOString();
    const sourceUrls = research.sources.map(source => source.url).filter(Boolean);
    const row = {
      album_key,
      album_id: String(album.id || body.album_id || ""),
      title: album.title,
      artist: album.artist || "",
      overview: overview.intro_summary || "",
      intro_summary: overview.intro_summary || "",
      sound_summary: overview.sound_summary || "",
      impact_summary: overview.impact_summary || "",
      legacy_summary: overview.legacy_summary || "",
      quote_headline: overview.quote_headline || "",
      defining_tracks: cleanTrackList(overview.defining_tracks || research.spotify_tracks),
      sources_used: unique([...(overview.sources_used || []), ...sourceUrls, "Muze album metadata"]),
      source_summary: research.source_summary,
      fallback_generated: fallbackGenerated,
      generated_at: now,
      updated_at: now,
      generation_model: overview.generation_model || generatedBy,
      manual_override: false
    };
    logStep("saving overview to Supabase", { generatedBy, fallback_generated: fallbackGenerated, row });

    let saved;
    try {
      saved = await api("album_overviews", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(row)
      });
      logStep("Supabase save success", { row: saved ? saved[0] : row });
    } catch (error) {
      console.error(LOG_PREFIX, "Supabase save error", { message: error.message || error, row });
      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true, generatedBy, researched: research.has_meaningful_research, saved: false, save_error: error.message || String(error), row }) };
    }
    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true, generatedBy, researched: research.has_meaningful_research, saved: true, row: saved ? saved[0] : row }) };
  } catch (error) {
    console.error(LOG_PREFIX, "Function failed", error);
    return { statusCode: error.status || 500, headers: jsonHeaders, body: JSON.stringify({ error: error.message || "Unexpected error" }) };
  }
};
