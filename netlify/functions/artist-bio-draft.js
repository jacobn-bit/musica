const crypto = require("crypto");

const JSON_HEADERS = { "Content-Type": "application/json" };
const USER_AGENT = "Muze/1.0 (https://themuze.app; artist biography research)";
const MUSICBRAINZ_ROOT = "https://musicbrainz.org/ws/2";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const OPENAI_TIMEOUT_MS = 45000;
const SOURCE_TIMEOUT_MS = 12000;
const cache = new Map();

function cleanText(value, max = 500) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeName(value) {
  return cleanText(value, 180).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizePin(value) {
  return String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/^['"]|['"]$/g, "").trim();
}

function adminPinAccepted(value) {
  const received = normalizePin(value);
  const configured = [process.env.MUSICA_ADMIN_PIN, process.env.ADMIN_PIN, process.env.VITE_ADMIN_PIN, process.env.NEXT_PUBLIC_ADMIN_PIN]
    .map(normalizePin).find(Boolean) || "";
  const allowedHashes = ["71bdc015e35ca2f9fbb2cfd5c82374fba64813d4a7a1baae09e29f27f46891c5"];
  const hashMatched = Boolean(received) && allowedHashes.includes(crypto.createHash("sha256").update(received).digest("hex"));
  return Boolean(received) && ((configured && received === configured) || hashMatched);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = SOURCE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function cachedJson(url, label) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${label} returned ${response.status}.`);
  cache.set(url, data);
  return data;
}

function musicBrainzQuery(name) {
  return String(name || "").replace(/([+\-!(){}\[\]^"~*?:\\/])/g, "\\$1");
}

function relationUrl(relations, type) {
  return (relations || []).find(row => row.type === type)?.url?.resource || "";
}

async function musicBrainzFacts(name) {
  const searchUrl = `${MUSICBRAINZ_ROOT}/artist/?query=${encodeURIComponent(`artist:"${musicBrainzQuery(name)}"`)}&fmt=json&limit=5`;
  const search = await cachedJson(searchUrl, "MusicBrainz artist search");
  const wanted = normalizeName(name);
  const result = (search.artists || []).find(item => normalizeName(item.name) === wanted) || (search.artists || [])[0];
  if (!result?.id) return null;
  const detailUrl = `${MUSICBRAINZ_ROOT}/artist/${encodeURIComponent(result.id)}?inc=aliases+tags+genres+url-rels&fmt=json`;
  const artist = await cachedJson(detailUrl, "MusicBrainz artist details");
  const wikidataUrl = relationUrl(artist.relations, "wikidata");
  const officialWebsite = relationUrl(artist.relations, "official homepage");
  return {
    id: artist.id,
    name: cleanText(artist.name, 180),
    sort_name: cleanText(artist["sort-name"], 180),
    type: cleanText(artist.type, 80),
    gender: cleanText(artist.gender, 80),
    area: cleanText(artist.area?.name, 120),
    begin_area: cleanText(artist["begin-area"]?.name, 120),
    active_from: cleanText(artist["life-span"]?.begin, 20),
    active_until: cleanText(artist["life-span"]?.end, 20),
    ended: Boolean(artist["life-span"]?.ended),
    genres: (artist.genres || []).sort((a, b) => Number(b.count || 0) - Number(a.count || 0)).slice(0, 8).map(item => cleanText(item.name, 80)).filter(Boolean),
    tags: (artist.tags || []).sort((a, b) => Number(b.count || 0) - Number(a.count || 0)).slice(0, 10).map(item => cleanText(item.name, 80)).filter(Boolean),
    aliases: (artist.aliases || []).filter(item => item.primary || item.type === "Legal name").slice(0, 4).map(item => cleanText(item.name, 180)).filter(Boolean),
    wikidata_id: (wikidataUrl.match(/\bQ\d+\b/i) || [""])[0].toUpperCase(),
    official_website: officialWebsite,
    source_url: `https://musicbrainz.org/artist/${artist.id}`
  };
}

async function findWikidataId(name) {
  const params = new URLSearchParams({ action: "wbsearchentities", search: name, language: "en", uselang: "en", type: "item", limit: "5", format: "json", origin: "*" });
  const data = await cachedJson(`${WIKIDATA_API}?${params}`, "Wikidata artist search");
  return cleanText(data.search?.[0]?.id, 20);
}

function claimEntityIds(entity, properties) {
  return [...new Set(properties.flatMap(property => (entity?.claims?.[property] || []).map(claim => claim?.mainsnak?.datavalue?.value?.id)).filter(Boolean))];
}

function claimStrings(entity, property) {
  return (entity?.claims?.[property] || []).map(claim => claim?.mainsnak?.datavalue?.value).filter(value => typeof value === "string").map(value => cleanText(value, 300)).filter(Boolean);
}

function claimDates(entity, property) {
  return (entity?.claims?.[property] || []).map(claim => claim?.mainsnak?.datavalue?.value?.time).filter(Boolean).map(value => String(value).replace(/^\+/, "").slice(0, 10));
}

async function wikidataEntities(ids) {
  const cleanIds = [...new Set(ids.filter(id => /^Q\d+$/i.test(id)))];
  if (!cleanIds.length) return {};
  const params = new URLSearchParams({ action: "wbgetentities", ids: cleanIds.join("|"), props: "claims|labels|sitelinks", languages: "en", sitefilter: "enwiki", format: "json", origin: "*" });
  return (await cachedJson(`${WIKIDATA_API}?${params}`, "Wikidata entities")).entities || {};
}

function labelsFor(ids, entities) {
  return ids.map(id => cleanText(entities[id]?.labels?.en?.value, 180)).filter(Boolean);
}

async function wikidataFacts(name, requestedId) {
  const id = requestedId || await findWikidataId(name);
  if (!/^Q\d+$/i.test(id || "")) return null;
  const primaryEntities = await wikidataEntities([id]);
  const entity = primaryEntities[id];
  if (!entity) return null;
  const properties = ["P31", "P27", "P17", "P740", "P136", "P106", "P463", "P527", "P166", "P264"];
  const relatedIds = claimEntityIds(entity, properties);
  const related = await wikidataEntities(relatedIds);
  const values = property => labelsFor(claimEntityIds(entity, [property]), related);
  const wikipediaTitle = entity.sitelinks?.enwiki?.title || "";
  return {
    id,
    name: cleanText(entity.labels?.en?.value || name, 180),
    entity_types: values("P31"),
    countries: [...values("P27"), ...values("P17")].filter((value, index, all) => all.indexOf(value) === index),
    formed_in: values("P740"),
    genres: values("P136"),
    occupations: values("P106"),
    member_of: values("P463"),
    members: values("P527").slice(0, 20),
    awards: values("P166").slice(0, 12),
    record_labels: values("P264").slice(0, 12),
    inception: claimDates(entity, "P571")[0] || "",
    career_start: claimDates(entity, "P2031")[0] || "",
    career_end: claimDates(entity, "P2032")[0] || "",
    birth_date: claimDates(entity, "P569")[0] || "",
    death_date: claimDates(entity, "P570")[0] || "",
    birth_name: claimStrings(entity, "P1477")[0] || "",
    official_website: claimStrings(entity, "P856")[0] || "",
    musicbrainz_id: claimStrings(entity, "P434")[0] || "",
    source_url: `https://www.wikidata.org/wiki/${id}`,
    wikipedia_url: wikipediaTitle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikipediaTitle.replace(/ /g, "_"))}` : ""
  };
}

function responseOutputText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || []).flatMap(item => item.content || []).map(part => part.text || "").join("").trim();
}

function sourceNameFromUrl(url, title = "") {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (_) {}
  const labels = {
    "musicbrainz.org": "MusicBrainz",
    "wikidata.org": "Wikidata",
    "en.wikipedia.org": "Wikipedia",
    "britannica.com": "Britannica",
    "allmusic.com": "AllMusic",
    "billboard.com": "Billboard",
    "rollingstone.com": "Rolling Stone",
    "npr.org": "NPR",
    "bbc.com": "BBC",
    "bbc.co.uk": "BBC",
    "theguardian.com": "The Guardian",
    "nytimes.com": "The New York Times"
  };
  return labels[host] || cleanText(title, 120) || host || "Web source";
}

function webSourcesFromResponse(response) {
  const rows = [];
  const add = (url, title) => {
    const cleanUrl = cleanText(url, 1000);
    if (!/^https:\/\//i.test(cleanUrl) || rows.some(row => row.url === cleanUrl)) return;
    rows.push({ name: sourceNameFromUrl(cleanUrl, title), url: cleanUrl, kind: "web research" });
  };
  (response.output || []).forEach(item => {
    (item?.action?.sources || []).forEach(source => add(source?.url, source?.title));
    (item?.content || []).forEach(part => (part?.annotations || []).forEach(annotation => {
      if (annotation?.type === "url_citation") add(annotation.url, annotation.title);
    }));
  });
  return rows.slice(0, 20);
}

async function generateBiography(artist, facts, albums) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured in Netlify.");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["bio"],
    properties: { bio: { type: "string" } }
  };
  const prompt = [
    "Research and write an original Muze artist biography from the structured facts below and current web sources.",
    "Use several independent factual sources where available rather than treating one biography as the text to rewrite.",
    "Prioritize sources in this order: MusicBrainz and Wikidata structured data; the artist's official website; official record-label artist pages; Britannica; Wikipedia for factual chronology and source discovery; AllMusic for factual career and genre research; then reputable reporting or interviews from Billboard, Rolling Stone, NPR, BBC, The Guardian, and The New York Times.",
    "You may use those publications to identify facts and context, but never copy, closely paraphrase, or imitate their prose, sentence structure, distinctive phrases, judgments, or biography organization.",
    "Treat official artist and label pages as primary sources for their own current claims, not as independent critical assessment.",
    "For living people, omit disputed, private, sensational, or weakly sourced claims.",
    "Use only supplied facts. Do not infer missing milestones, relationships, achievements, reception, influence, or chronology.",
    "Do not copy or imitate prose from Wikipedia, artist websites, streaming services, magazines, or reference works.",
    "Write in Muze's own clear, premium, music-literate editorial voice.",
    "Use two to four short paragraphs when the facts support them. If the evidence is sparse, write one concise paragraph rather than adding filler.",
    "Do not mention the research process or sources in the biography.",
    "The Muze discography list only proves that those albums are present on Muze; do not call them the artist's complete discography.",
    "Return JSON only.",
    JSON.stringify({ artist, structured_facts: facts, muze_album_context: albums }, null, 2)
  ].join("\n\n");
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: "You are Muze's artist editor. Accuracy comes before flourish. You never invent facts and you return valid JSON only." },
        { role: "user", content: prompt }
      ],
      tools: [{ type: "web_search", search_context_size: "high" }],
      include: ["web_search_call.action.sources"],
      text: { format: { type: "json_schema", name: "muze_artist_biography", strict: true, schema } }
    })
  }, OPENAI_TIMEOUT_MS);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `OpenAI returned ${response.status}.`);
  const generated = JSON.parse(responseOutputText(data));
  const bio = String(generated.bio || "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 6000);
  if (!bio) throw new Error("The biography draft was empty.");
  return { bio, model, web_sources: webSourcesFromResponse(data) };
}

function sourceRows(musicbrainz, wikidata, webSources = []) {
  const accessedAt = new Date().toISOString();
  return [
    musicbrainz?.source_url ? { name: "MusicBrainz", url: musicbrainz.source_url, kind: "structured data", accessed_at: accessedAt } : null,
    wikidata?.source_url ? { name: "Wikidata", url: wikidata.source_url, kind: "structured data", accessed_at: accessedAt } : null,
    ...webSources.map(row => ({ ...row, accessed_at: accessedAt }))
  ].filter(Boolean).filter((row, index, rows) => rows.findIndex(other => other.url === row.url) === index).slice(0, 24);
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const body = JSON.parse(event.body || "{}");
    if (!adminPinAccepted(body.pin)) return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: "Admin PIN was not accepted." }) };
    const name = cleanText(body.name, 180);
    if (!name) return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "Artist name is required." }) };
    const albums = (Array.isArray(body.albums) ? body.albums : []).slice(0, 30).map(album => ({ title: cleanText(album?.title, 180), year: cleanText(album?.year, 12) })).filter(album => album.title);
    const musicbrainz = await musicBrainzFacts(name).catch(error => ({ error: error.message }));
    const wikidata = await wikidataFacts(name, musicbrainz?.wikidata_id).catch(error => ({ error: error.message }));
    if (!musicbrainz?.id && !wikidata?.id) throw new Error("No reliable structured artist record was found in MusicBrainz or Wikidata.");
    const facts = { musicbrainz: musicbrainz?.id ? musicbrainz : null, wikidata: wikidata?.id ? wikidata : null };
    const generated = await generateBiography({ name }, facts, albums);
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ ok: true, bio: generated.bio, sources: sourceRows(musicbrainz, wikidata, generated.web_sources), generation_model: generated.model, generated_at: new Date().toISOString() }) };
  } catch (error) {
    console.error("[Muze artist bio]", error);
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: error.message || "Artist biography generation failed." }) };
  }
};

exports._test = { cleanText, generateBiography, musicBrainzFacts, normalizeName, sourceNameFromUrl, sourceRows, webSourcesFromResponse, wikidataFacts };
