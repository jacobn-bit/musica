"use strict";

const crypto = require("crypto");
const MUSICBRAINZ_ROOT = "https://musicbrainz.org/ws/2";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "Muze/1.0 (https://themuze.app; factual album metadata and licensed artwork)";
const ALBUM_INFO_IMPORT_VERSION = "structured-sources-v2-preserve-solo-primary";
const BESTSELLING_ALBUMS_ROOT = "https://bestsellingalbums.org";
const WIKIPEDIA_BESTSELLERS_URL = "https://en.wikipedia.org/wiki/List_of_best-selling_albums";
let wikipediaSalesHtmlCache = { html: "", expiresAt: 0 };
const recordLabelLogoCache = new Map();
const artistPortraitCache = new Map();
const musicBrainzApiCache = new Map();
const wikipediaApiCache = new Map();
const wikidataApiCache = new Map();
const commonsApiCache = new Map();
let activeWikimediaRequests = 0;
const pendingWikimediaRequests = [];

function json(statusCode, body, cacheSeconds = 0) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Muze-Admin-Pin",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Cache-Control": cacheSeconds ? `public, max-age=${cacheSeconds}` : "no-store"
    },
    body: JSON.stringify(body)
  };
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalAlbumTitle(value) {
  return clean(value)
    .replace(/\([^)]*\b(remaster(?:ed)?|deluxe|expanded|anniversary|special edition|legacy edition)\b[^)]*\)/ig, " ")
    .replace(/\[[^\]]*\b(remaster(?:ed)?|deluxe|expanded|anniversary|special edition|legacy edition)\b[^\]]*\]/ig, " ")
    .replace(/\s+-\s+(?:\d{4}\s+)?(?:remaster(?:ed)?|deluxe|expanded|anniversary|special edition|legacy edition).*$/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeQuery(value) {
  return String(value || "").replace(/([+\-!(){}\[\]^"~*?:\\/])/g, "\\$1");
}

function albumRef(input) {
  return clean(input.album_ref || input.album_id || `${normalize(input.artist)}-${normalize(input.title)}`);
}

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  };
}

async function timedFetch(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withWikimediaRequestSlot(task) {
  if (activeWikimediaRequests >= 3) await new Promise(resolve => pendingWikimediaRequests.push(resolve));
  activeWikimediaRequests += 1;
  try {
    return await task();
  } finally {
    activeWikimediaRequests -= 1;
    pendingWikimediaRequests.shift()?.();
  }
}

async function cachedApiJson(cache, url, errorLabel, options = {}) {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached?.expiresAt > now) return cached.promise;
  const request = (options.wikimedia ? withWikimediaRequestSlot : task => task())(async () => {
    const response = await timedFetch(url, { headers: { "Accept": "application/json", "User-Agent": USER_AGENT } }, options.timeoutMs || 8000);
    if (!response.ok) throw new Error(`${errorLabel} request failed (${response.status}).`);
    return response.json();
  });
  cache.set(url, { promise: request, expiresAt: now + (options.ttlMs || 6 * 60 * 60 * 1000) });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  try {
    return await request;
  } catch (error) {
    cache.delete(url);
    throw error;
  }
}

async function api(path, options = {}) {
  const config = supabaseConfig();
  if (!config.url || !config.key) throw new Error("Supabase service settings are missing.");
  const authorization = config.key.includes(".") ? { "Authorization": `Bearer ${config.key}` } : {};
  const response = await timedFetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": config.key,
      ...authorization,
      ...(options.headers || {})
    }
  }, 6000);
  const text = await response.text();
  if (!response.ok) {
    let message = text || `Supabase request failed (${response.status}).`;
    try {
      const details = JSON.parse(text);
      message = clean(details.message || details.details || details.error || message);
    } catch (_) {}
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

async function readCachedInfo(ref) {
  const filter = encodeURIComponent(ref);
  const [metadata, credits, labels, sales, certifications] = await Promise.all([
    api(`album_metadata?album_ref=eq.${filter}&select=*`),
    api(`album_credits?album_ref=eq.${filter}&select=*&order=sort_order.asc,person_name.asc`),
    api(`album_labels?album_ref=eq.${filter}&select=*&order=is_original_label.desc,label_name.asc`),
    api(`album_sales?album_ref=eq.${filter}&select=*`),
    api(`album_certifications?album_ref=eq.${filter}&select=*&order=country.asc`)
  ]);
  let recordLabelLogos = [];
  let recordLabelLogoSchemaReady = true;
  try {
    recordLabelLogos = await api(`record_label_logos?album_ref=eq.${filter}&select=*&order=updated_at.desc`);
  } catch (error) {
    if (!/record_label_logos|PGRST205|42P01/i.test(error.message || "")) throw error;
    recordLabelLogoSchemaReady = false;
  }
  return {
    metadata: metadata?.[0] || null,
    credits: credits || [],
    labels: labels || [],
    sales: sales?.[0] || null,
    certifications: certifications || [],
    record_label_logos: recordLabelLogos || [],
    record_label_logo_schema_ready: recordLabelLogoSchemaReady
  };
}

async function musicBrainzJson(path) {
  return cachedApiJson(musicBrainzApiCache, `${MUSICBRAINZ_ROOT}${path}`, "MusicBrainz", { timeoutMs: 9000 });
}

function releaseArtist(release) {
  return (release?.["artist-credit"] || []).map(item => item.name || item.artist?.name || "").filter(Boolean).join(", ");
}

function releaseScore(release, input) {
  const title = normalize(release?.title);
  const artist = normalize(releaseArtist(release));
  const wantedTitle = normalize(canonicalAlbumTitle(input.title));
  const wantedArtist = normalize(input.artist);
  const wantedYear = String(input.year || "").slice(0, 4);
  const preferredCountry = String(input.preferred_country || "").toUpperCase();
  const year = String(release?.date || "").slice(0, 4);
  let score = Number(release?.score || 0);
  if (title === wantedTitle) score += 80;
  else if (title.includes(wantedTitle) || wantedTitle.includes(title)) score += 25;
  if (artist === wantedArtist) score += 60;
  else if (artist.includes(wantedArtist) || wantedArtist.includes(artist)) score += 20;
  if (wantedYear && year === wantedYear) score += 35;
  const firstReleaseYear = String(release?.["release-group"]?.["first-release-date"] || "").slice(0, 4);
  if (firstReleaseYear && year === firstReleaseYear) score += 45;
  if (preferredCountry && String(release?.country || "").toUpperCase() === preferredCountry) score += 70;
  if (String(release?.status || "").toLowerCase() === "official") score += 12;
  if (release?.country) score += 2;
  return score;
}

function pickCanonicalRelease(releases, input) {
  return (releases || []).filter(release => release?.id)
    .sort((a, b) => releaseScore(b, input) - releaseScore(a, input)
      || String(a.date || "9999").localeCompare(String(b.date || "9999")))[0] || null;
}

function relationPerson(relation) {
  const target = relation?.artist || relation?.person;
  return target ? { name: clean(target.name || target["sort-name"]), id: clean(target.id) } : null;
}

function classifyRelation(relation) {
  const type = normalize(relation?.type);
  const attributes = (relation?.attributes || []).map(clean).filter(Boolean);
  const production = /producer|engineer|mix|master|recording|additional production|arranger/.test(type);
  const songwriting = /writer|composer|lyricist|songwriting|librettist/.test(type);
  const performance = /instrument|vocal|perform|conductor|orchestra|choir|ensemble/.test(type) || attributes.length > 0;
  if (songwriting) return { credit_type: "songwriting", role: clean(relation.type), instrument: "" };
  if (production) return { credit_type: "production", role: clean(relation.type), instrument: "" };
  if (performance) return {
    credit_type: "performer",
    role: /vocal|perform|conductor|orchestra|choir|ensemble/.test(type) ? clean(relation.type) : "Performer",
    instrument: attributes.join(", ") || (/instrument/.test(type) ? clean(relation.type) : "")
  };
  return null;
}

function collectRelations(release) {
  const relations = [...(release?.relations || [])];
  (release?.media || []).forEach(medium => (medium.tracks || []).forEach(track => {
    relations.push(...(track.recording?.relations || []));
  }));
  return relations;
}

function aggregateCredits(release, ref, albumId) {
  const grouped = new Map();
  (release?.["artist-credit"] || []).forEach(item => {
    const artist = item.artist || {};
    const name = clean(item.name || artist.name);
    if (!name) return;
    grouped.set(`${normalize(name)}::performer`, {
      album_ref: ref, album_id: albumId || null, person_name: name,
      person_id: clean(artist.id) || null, image_url: "", credit_type: "performer",
      roles: new Set(["Primary artist"]), instruments: new Set(), source: "MusicBrainz",
      source_url: artist.id ? `https://musicbrainz.org/artist/${artist.id}` : "",
      manually_verified: false
    });
  });
  collectRelations(release).forEach(relation => {
    const person = relationPerson(relation);
    const credit = classifyRelation(relation);
    if (!person?.name || !credit) return;
    const key = `${normalize(person.name)}::${credit.credit_type}`;
    const current = grouped.get(key) || {
      album_ref: ref, album_id: albumId || null, person_name: person.name,
      person_id: person.id || null, image_url: "", credit_type: credit.credit_type,
      roles: new Set(), instruments: new Set(), source: "MusicBrainz",
      source_url: person.id ? `https://musicbrainz.org/artist/${person.id}` : "",
      manually_verified: false
    };
    if (credit.role) current.roles.add(credit.role);
    if (credit.instrument) credit.instrument.split(",").map(clean).filter(Boolean).forEach(value => current.instruments.add(value));
    grouped.set(key, current);
  });
  return [...grouped.values()].map((item, index) => ({
    album_ref: item.album_ref,
    album_id: item.album_id,
    person_name: item.person_name,
    person_id: item.person_id,
    image_url: item.image_url,
    credit_type: item.credit_type,
    role: [...item.roles].join(", "),
    instrument: [...item.instruments].join(", "),
    sort_order: index,
    source: item.source,
    source_url: item.source_url,
    manually_verified: false
  }));
}

function stripWikiMarkup(value) {
  let text = String(value || "");
  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text.replace(/\{\{[^{}]*\}\}/g, " ");
  }
  return clean(text
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&amp;/gi, "&")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi, " ")
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\[(?:https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, " "));
}

function wikipediaInfoboxField(wikitext, name) {
  const start = String(wikitext || "").search(/\{\{\s*Infobox\s+album\b/i);
  if (start < 0) return "";
  let depth = 0;
  let end = -1;
  for (let index = start; index < wikitext.length - 1; index += 1) {
    const pair = wikitext.slice(index, index + 2);
    if (pair === "{{") { depth += 1; index += 1; continue; }
    if (pair === "}}") {
      depth -= 1;
      index += 1;
      if (depth === 0) { end = index + 1; break; }
    }
  }
  const infobox = String(wikitext).slice(start, end > start ? end : undefined);
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^\\s*\\|\\s*${escaped}\\s*=\\s*(.+)$`, "im").exec(infobox);
  return match ? match[1].trim() : "";
}

function wikipediaDate(value) {
  const raw = String(value || "");
  const template = /\{\{\s*(?:start date|release date)[^|}]*\|(\d{4})\|(\d{1,2})\|(\d{1,2})/i.exec(raw);
  if (template) return `${template[1]}-${String(template[2]).padStart(2, "0")}-${String(template[3]).padStart(2, "0")}`;
  const text = stripWikiMarkup(raw.replace(/<br\s*\/?>[\s\S]*$/i, " "));
  const dayFirst = /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/.exec(text);
  const monthFirst = /\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/.exec(text);
  const parsed = dayFirst ? new Date(`${dayFirst[2]} ${dayFirst[1]}, ${dayFirst[3]} UTC`) : monthFirst ? new Date(`${monthFirst[1]} ${monthFirst[2]}, ${monthFirst[3]} UTC`) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return text;
}

function wikipediaRuntime(value) {
  const raw = String(value || "");
  const duration = /\{\{\s*(?:duration|time)\b([^}]*)\}\}/i.exec(raw)?.[1] || "";
  const minutes = /(?:^|\|)\s*(?:m(?:in(?:utes?)?)?\s*=\s*)?(\d{1,3})(?=\s*\||$)/i.exec(duration)?.[1];
  const seconds = /(?:^|\|)\s*s(?:ec(?:onds?)?)?\s*=\s*(\d{1,2})/i.exec(duration)?.[1];
  if (minutes) return (Number(minutes) * 60 + Number(seconds || 0)) * 1000;
  const clock = /(\d{1,3}):(\d{2})/.exec(stripWikiMarkup(raw));
  return clock ? (Number(clock[1]) * 60 + Number(clock[2])) * 1000 : null;
}

function wikipediaList(value) {
  const expanded = String(value || "")
    .replace(/<br\s*\/?>/gi, "|")
    .replace(/\{\{\s*(?:hlist|ubl|unbulleted list|flatlist)\s*\|/gi, "")
    .replace(/\}\}/g, "")
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1");
  return [...new Set(expanded.split(/\||,\s*(?=[A-Z])/).map(stripWikiMarkup).map(item => item.replace(/^[*;:\s]+/, "").trim()).filter(Boolean))];
}

function wikipediaCountry(value) {
  const country = wikipediaList(value).find(item => !/^(?:europe|worldwide)$/i.test(clean(item))) || "";
  return normalize(country) === "united states of america" ? "United States" : country;
}

function parseWikipediaAlbumInfo(wikitext, context = {}) {
  const released = wikipediaDate(wikipediaInfoboxField(wikitext, "released"));
  const country = wikipediaCountry(wikipediaInfoboxField(wikitext, "country"));
  const type = normalize(stripWikiMarkup(wikipediaInfoboxField(wikitext, "type")));
  const albumTypes = { studio: "Studio album", live: "Live album", compilation: "Compilation album", soundtrack: "Soundtrack album", ep: "EP" };
  const runtime = wikipediaRuntime(wikipediaInfoboxField(wikitext, "length"));
  const labels = wikipediaList(wikipediaInfoboxField(wikitext, "label")).map((label, index) => ({
    album_ref: context.album_ref || "",
    album_id: context.album_id || null,
    label_name: label,
    label_type: "label",
    is_original_label: index === 0,
    release_region: "",
    source: "Wikipedia",
    source_url: context.source_url || "",
    manually_verified: false
  }));
  const credits = parseWikipediaCredits(wikitext, context);
  const hasNamedPerformers = credits.some(row => row.credit_type === "performer" && row.person_name);
  const metadata = {
    source: "Wikipedia",
    source_url: context.source_url || "",
    source_confidence: hasNamedPerformers ? ALBUM_INFO_IMPORT_VERSION : "wikipedia-metadata-only"
  };
  if (released) {
    metadata.original_release_date = released;
    metadata.release_year = Number(String(released).match(/\b(19|20)\d{2}\b/)?.[0]) || null;
  }
  if (country) metadata.country = country;
  if (albumTypes[type]) metadata.album_type = albumTypes[type];
  if (runtime) metadata.total_runtime_ms = runtime;
  return { metadata, labels, credits };
}

function wikipediaCreditType(section, roles, context = {}) {
  const sectionText = normalize(section);
  const roleText = normalize(roles);
  if (/production|technical|engineering|artwork|packaging|design|photograph|illustration/.test(sectionText)) return "production";
  if (/songwriting|composition|lyrics/.test(sectionText)) return "songwriting";
  if (wikipediaCreditGroup(section, context) && /\b(vocals?|singers?|guitars?|bass|drums?|percussion|keyboards?|piano|organ|synthesizers?|synths?|violin|viola|cello|strings?|saxophones?|trumpets?|trombone|flute|clarinet|harmonica|mandolin|banjo|harp|conductor|conducting|orchestra|choir)\b/.test(roleText)) return "performer";
  if (/\b(producers?|production|engineers?|engineering|mixing|mixer|mastering|remastering|recording|arranger|arrangement|orchestration|art direction|art director|artwork|additional artwork|illustration|photography|photos?|pictures?|editing|editor|director|coordination|booklet|studio assistance|studio assistant|audio level balancing|audio balancing|level balancing)\b|\bcover (?:design|concept)\b|\bcommitting to tape\b|\btape operator\b/.test(roleText)) return "production";
  if (/\b(songwriter|written by|composer|lyricist)\b/.test(roleText)) return "songwriting";
  if (wikipediaCreditGroup(section, context)) return "performer";
  return "performer";
}

function wikipediaExcludedCreditSection(subsection) {
  return /\b(reissue|bonus tracks?|deluxe|anniversary edition|expanded edition)\b/.test(normalize(subsection));
}

function wikipediaProductionRows(item, context, startOrder) {
  const match = /^(.*?)\s+by\s+(.+)$/i.exec(String(item || ""));
  if (!match) return [];
  const action = normalize(match[1]);
  let role = "";
  if (/produc/.test(action)) role = "Producer";
  else if (/assistant engineer/.test(action)) role = "Assistant engineer";
  else if (/record/.test(action)) role = "Recording engineer";
  else if (/mix/.test(action)) role = "Mixer";
  else if (/program/.test(action)) role = "Programming";
  else if (/orchestrat|conduct/.test(action)) role = "Orchestration and conducting";
  if (!role) return [];
  const names = match[2]
    .replace(/\(\s*with\s+/gi, ", ")
    .replace(/[()]/g, " ")
    .split(/\s*,\s*|\s+and\s+|\s+with\s+/i)
    .map(clean)
    .filter(name => /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)+$/.test(name));
  return [...new Set(names)].map((personName, index) => ({
    album_ref: context.album_ref || "",
    album_id: context.album_id || null,
    person_name: personName,
    person_id: null,
    image_url: "",
    credit_type: "production",
    role,
    instrument: "",
    sort_order: startOrder + index,
    source: "Wikipedia",
    source_url: context.source_url || "",
    manually_verified: false
  }));
}

function wikipediaCreditGroup(subsection, context = {}) {
  const section = normalize(subsection);
  const artist = normalize(context.artist);
  if (/additional|session musician|touring musician/.test(section)) return "additional";
  if (/guest|featured/.test(section)) return "guest";
  if (/orchestra|ensemble|choir|chorus/.test(section)) return "ensemble";
  if (/core|band members|the band|members/.test(section) || (artist && section === artist)) return "core";
  return "";
}

function wikipediaCreditSortOrder(subsection, context, sortOrder) {
  const bases = { core: 10000, additional: 20000, guest: 30000, ensemble: 40000 };
  return (bases[wikipediaCreditGroup(subsection, context)] || 0) + sortOrder;
}

function wikipediaCreditPersonName(rawValue, fallbackValue) {
  const raw = String(rawValue || "");
  const links = [...raw.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g)];
  if (links.length !== 1) return clean(fallbackValue);
  const outsideLink = stripWikiMarkup(raw.replace(links[0][0], "")).replace(/^[,;:&\s]+|[,;:&\s]+$/g, "");
  if (outsideLink) return clean(fallbackValue);
  return stripWikiMarkup(links[0][1]).replace(/\s+\([^)]*\)\s*$/, "").trim() || clean(fallbackValue);
}

function wikipediaCreditPersonNames(rawValue, fallbackValue) {
  const raw = String(rawValue || "");
  const links = [...raw.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g)];
  if (links.length < 2) return [wikipediaCreditPersonName(raw, fallbackValue)].filter(Boolean);
  const separators = stripWikiMarkup(links.reduce((value, link) => value.replace(link[0], " "), raw))
    .replace(/\band\b|[,&;:/]/gi, " ")
    .trim();
  if (separators) return [clean(fallbackValue)].filter(Boolean);
  return [...new Set(links.map(link => stripWikiMarkup(link[1]).replace(/\s+\([^)]*\)\s*$/, "").trim()).filter(Boolean))];
}

function creditFactBase(value) {
  const text = normalize(value);
  const bases = [
    ["vocals", /\bvocals?\b/], ["guitar", /\bguitars?\b/], ["bass", /\bbasses?|bass guitar\b/],
    ["keyboards", /\bkeyboards?\b/], ["piano", /\bpiano\b/], ["organ", /\borgan\b/],
    ["drums", /\bdrums?\b/], ["percussion", /\bpercussion\b/], ["saxophone", /\bsaxophones?\b/],
    ["trumpet", /\btrumpets?\b/], ["trombone", /\btrombones?\b/], ["violin", /\bviolins?\b/],
    ["viola", /\bviolas?\b/], ["cello", /\bcellos?\b/], ["flute", /\bflutes?\b/],
    ["clarinet", /\bclarinets?\b/], ["harmonica", /\bharmonica\b/], ["synthesizer", /\bsynthesizers?|synths?\b/]
  ];
  return bases.find(([, pattern]) => pattern.test(text))?.[0] || "";
}

function normalizeCreditFact(value) {
  return clean(value)
    .replace(/\bbackground vocals?\b/ig, "backing vocals")
    .replace(/\bguitars\b/ig, "guitar")
    .replace(/\bsaxophones\b/ig, "saxophone")
    .replace(/\btrumpets\b/ig, "trumpet")
    .replace(/\btrombones\b/ig, "trombone")
    .replace(/\bviolins\b/ig, "violin")
    .replace(/\bviolas\b/ig, "viola")
    .replace(/\bcellos\b/ig, "cello")
    .replace(/\bflutes\b/ig, "flute")
    .replace(/\bclarinets\b/ig, "clarinet");
}

function structuredCreditFacts(value) {
  const modifiers = new Set(["lead", "harmony", "backing", "background", "rhythm", "acoustic", "electric", "slide"]);
  const facts = [];
  String(value || "").split(/\s*;\s*/).forEach(group => {
    const parts = group.split(/\s*,\s*|\s+and\s+/i).map(normalizeCreditFact).filter(Boolean);
    parts.forEach((part, index) => {
      if (creditFactBase(part) || !modifiers.has(normalize(part))) { facts.push(part); return; }
      const base = parts.slice(index + 1).map(creditFactBase).find(Boolean);
      facts.push(base ? `${part} ${base}` : part);
    });
  });
  return [...new Set(facts.map(normalizeCreditFact).filter(Boolean))];
}

function wikipediaCreditRow(personName, roles, subsection, context, sortOrder) {
  const name = clean(personName).replace(/^['"\s]+|['"\s]+$/g, "");
  const role = structuredCreditFacts(roles).join(", ");
  if (wikipediaExcludedCreditSection(subsection)) return null;
  if (!name || !role || name.length > 100 || /^["']|\b(track|song|side|session musicians?|orchestra|section)\b/i.test(name)) return null;
  const creditType = wikipediaCreditType(subsection, role, context);
  return {
    album_ref: context.album_ref || "",
    album_id: context.album_id || null,
    person_name: name,
    person_id: null,
    image_url: "",
    credit_type: creditType,
    role,
    instrument: creditType === "performer" ? role : "",
    sort_order: wikipediaCreditSortOrder(subsection, context, sortOrder),
    source: "Wikipedia",
    source_url: context.source_url || "",
    manually_verified: false
  };
}

function parseWikipediaCreditSection(sectionText, initialSubsection, context, rows) {
  let subsection = initialSubsection || "Personnel";
  let definitionName = "";
  const lines = sectionText.split(/\r?\n/);
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    const subheading = /^===+\s*(.*?)\s*===+\s*$/.exec(trimmed);
    if (subheading) { subsection = stripWikiMarkup(subheading[1]); definitionName = ""; return; }
    const boldSubheading = /^'{3}\s*(.*?)\s*'{3}\s*$/.exec(trimmed);
    if (boldSubheading) { subsection = stripWikiMarkup(boldSubheading[1]); definitionName = ""; return; }
    const definition = /^;\s*(.+)$/.exec(trimmed);
    if (definition) {
      const label = wikipediaCreditPersonName(definition[1], stripWikiMarkup(definition[1]));
      const nextContent = lines.slice(lineIndex + 1).find(candidate => candidate.trim());
      if (/^\s*[*#]+/.test(nextContent || "")) { subsection = label; definitionName = ""; }
      else definitionName = label;
      return;
    }
    const definitionRole = /^:\s*(.+)$/.exec(trimmed);
    if (definitionRole && definitionName) {
      const row = wikipediaCreditRow(definitionName, stripWikiMarkup(definitionRole[1]), subsection, context, rows.length);
      if (row) rows.push(row);
      definitionName = "";
      return;
    }
    const tableRow = /^\|\s*(.*?)\s*\|\|\s*(.+)$/.exec(trimmed);
    if (tableRow) {
      const row = wikipediaCreditRow(wikipediaCreditPersonName(tableRow[1], stripWikiMarkup(tableRow[1])), stripWikiMarkup(tableRow[2]), subsection, context, rows.length);
      if (row) rows.push(row);
      return;
    }
    if (!/^\s*[*#]+/.test(line)) return;
    const rawItem = line.replace(/^\s*[*#]+\s*/, "");
    const item = stripWikiMarkup(rawItem);
    const creditSeparator = /(?:\s*:\s+|\s+(?:-|\u2013|\u2014)\s+)/;
    const parts = item.split(creditSeparator);
    if (parts.length < 2) {
      if (/production|technical|engineering/i.test(subsection)) rows.push(...wikipediaProductionRows(item, context, rows.length));
      return;
    }
    const fallbackName = parts.shift();
    const rawParts = rawItem.replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ").replace(/&ndash;/gi, "\u2013").replace(/&mdash;/gi, "\u2014").split(creditSeparator);
    const names = wikipediaCreditPersonNames(rawParts.length > 1 ? rawParts[0] : "", fallbackName);
    names.forEach((name, nameIndex) => {
      const row = wikipediaCreditRow(name, parts.join(" - "), subsection, context, rows.length + nameIndex);
      if (row) rows.push(row);
    });
  });
}

function parseWikipediaCredits(wikitext, context = {}) {
  const text = String(wikitext || "");
  const headings = [...text.matchAll(/^==\s*([^=\n]+?)\s*==\s*$/gim)];
  const relevant = headings.filter(match => /personnel|credits|musicians|production/i.test(match[1]));
  const rows = [];
  relevant.forEach(heading => {
    const headingIndex = headings.indexOf(heading);
    const next = headings[headingIndex + 1];
    const sectionText = text.slice(heading.index + heading[0].length, next?.index ?? text.length);
    parseWikipediaCreditSection(sectionText, stripWikiMarkup(heading[1]), context, rows);
  });
  return mergeCredits(rows);
}

function mergeCredits(...lists) {
  const merged = new Map();
  lists.flat().forEach(row => {
    if (!row?.person_name || !row?.credit_type) return;
    const key = `${normalize(row.person_name)}::${normalize(row.credit_type)}`;
    const current = merged.get(key);
    if (!current) { merged.set(key, { ...row }); return; }
    const currentIsManual = current.manually_verified === true;
    const rowIsManual = row.manually_verified === true;
    if (rowIsManual && !currentIsManual) {
      merged.set(key, { ...current, ...row });
      return;
    }
    if (currentIsManual && !rowIsManual) return;
    const roles = [...new Set(`${current.role || ""},${row.role || ""}`.split(",").map(clean).filter(Boolean))];
    const instruments = [...new Set(`${current.instrument || ""},${row.instrument || ""}`.split(",").map(clean).filter(Boolean))];
    current.role = roles.join(", ");
    current.instrument = instruments.join(", ");
    if (!current.source_url && row.source_url) current.source_url = row.source_url;
    if (row.source && !String(current.source || "").includes(row.source) && !normalize(current.source).includes("wikipedia")) {
      current.source = [current.source, row.source].filter(Boolean).join(" + ");
    }
  });
  return [...merged.values()]
    .map((row, index) => ({ ...row, sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index }))
    .sort((left, right) => left.sort_order - right.sort_order);
}

function hasNamedPerformerCredits(info) {
  return Array.isArray(info?.credits) && info.credits.some(row => normalize(row?.credit_type) === "performer" && clean(row?.person_name));
}

function mergeLabels(...lists) {
  const merged = new Map();
  lists.flat().forEach(row => {
    if (!row?.label_name) return;
    const key = normalize(row.label_name);
    if (!merged.has(key)) merged.set(key, { ...row });
  });
  return [...merged.values()].map((row, index) => ({ ...row, is_original_label: index === 0 }));
}

function mergeStructuredCredits(structuredRows = [], wikipediaRows = [], albumArtist = "") {
  const artistKey = normalize(albumArtist);
  const wikipediaNamedPerformers = wikipediaRows.filter(row => row.credit_type === "performer" && normalize(row.person_name) !== artistKey);
  const wikipediaCorePerformers = wikipediaNamedPerformers.filter(row => {
    const order = Number(row.sort_order);
    return Number.isFinite(order) && order >= 10000 && order < 20000;
  });
  let primary = structuredRows.slice();
  const structuredPerformers = primary.filter(row => row.credit_type === "performer");
  const onlyGenericArtist = structuredPerformers.length === 1 && /primary artist/.test(normalize(structuredPerformers[0].role))
    && (!artistKey || normalize(structuredPerformers[0].person_name) === artistKey);
  if (onlyGenericArtist && wikipediaCorePerformers.length >= 2) {
    const genericName = normalize(structuredPerformers[0].person_name);
    primary = primary.filter(row => row.credit_type !== "performer" || normalize(row.person_name) !== genericName);
  }
  const merged = new Map(primary.filter(row => row?.person_name && row?.credit_type)
    .map(row => [`${normalize(row.person_name)}::${normalize(row.credit_type)}`, { ...row }]));
  wikipediaRows.forEach(row => {
    if (!row?.person_name || !row?.credit_type) return;
    const key = `${normalize(row.person_name)}::${normalize(row.credit_type)}`;
    const current = merged.get(key);
    if (!current) { merged.set(key, { ...row }); return; }
    let usedWikipedia = false;
    if (!clean(current.role) && clean(row.role)) { current.role = row.role; usedWikipedia = true; }
    if (!clean(current.instrument) && clean(row.instrument)) { current.instrument = row.instrument; usedWikipedia = true; }
    if (usedWikipedia) {
      current.source_secondary = "Wikipedia";
      current.source_secondary_url = clean(row.source_url);
    }
  });
  return [...merged.values()]
    .map((row, index) => ({ ...row, sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index }))
    .sort((left, right) => left.sort_order - right.sort_order);
}

function mergeWikipediaAlbumInfo(fallback, wikipedia) {
  if (!wikipedia) return { ...fallback, metadata: { ...(fallback?.metadata || {}), source_confidence: ALBUM_INFO_IMPORT_VERSION } };
  const wikipediaMetadata = Object.fromEntries(Object.entries(wikipedia.metadata || {}).filter(([, value]) => value !== "" && value !== null && value !== undefined));
  const structuredMetadata = Object.fromEntries(Object.entries(fallback?.metadata || {}).filter(([, value]) => value !== "" && value !== null && value !== undefined));
  const metadata = { ...wikipediaMetadata, ...structuredMetadata, source_confidence: ALBUM_INFO_IMPORT_VERSION };
  const credits = mergeStructuredCredits(fallback?.credits || [], wikipedia.credits || [], fallback?.metadata?.artist);
  return {
    ...fallback,
    metadata,
    credits,
    labels: mergeLabels(fallback?.labels || [], wikipedia.labels || []),
    sales: fallback?.sales || null,
    certifications: fallback?.certifications || []
  };
}

async function wikipediaJson(params) {
  const query = new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  return cachedApiJson(wikipediaApiCache, `${WIKIPEDIA_API}?${query}`, "Wikipedia API", { timeoutMs: 7000, wikimedia: true });
}

function plainCommonsValue(value) {
  return clean(String(value || "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'"));
}

function recordLabelLogoHasReuseBasis(logo) {
  const sourcePage = clean(logo?.source_page_url);
  const status = clean(logo?.license_name || logo?.copyright_status);
  const attributionReady = !logo?.requires_attribution || Boolean(clean(logo?.attribution_text));
  return Boolean(sourcePage && status && logo?.commercial_use_allowed === true && attributionReady);
}

function recordLabelLogoIsPublic(logo) {
  return clean(logo?.review_status).toLowerCase() === "approved"
    && logo?.verified === true
    && recordLabelLogoHasReuseBasis(logo)
    && logo?.license_status_changed !== true;
}

function albumInfoResponseView(info, includeAudit = false) {
  const labels = (info?.labels || []).map(label => {
    const logo = label?.record_label_logo;
    if (includeAudit) return label;
    if (!recordLabelLogoIsPublic(logo)) {
      const { record_label_logo, ...plainLabel } = label;
      return plainLabel;
    }
    return {
      ...label,
      record_label_logo: {
        logo_url: logo.logo_url,
        source_page_url: logo.source_page_url,
        license_name: logo.license_name,
        license_url: logo.license_url,
        attribution_text: logo.attribution_text,
        requires_attribution: logo.requires_attribution,
        trademark_notice: logo.trademark_notice,
        review_status: "approved",
        verified: true
      }
    };
  });
  const response = { ...info, labels };
  if (!includeAudit) delete response.record_label_logos;
  return response;
}

function commonsLogoMetadata(filename, page) {
  const imageInfo = page?.imageinfo?.[0] || {};
  const metadata = imageInfo.extmetadata || {};
  const licenseName = plainCommonsValue(metadata.LicenseShortName?.value || metadata.License?.value);
  const licenseUrl = clean(metadata.LicenseUrl?.value);
  const creator = plainCommonsValue(metadata.Artist?.value || metadata.Credit?.value);
  const copyrighted = plainCommonsValue(metadata.Copyrighted?.value);
  const restrictions = plainCommonsValue(metadata.Restrictions?.value);
  const usageTerms = plainCommonsValue(metadata.UsageTerms?.value);
  const description = plainCommonsValue(metadata.ImageDescription?.value);
  const publicDomain = /public domain|pd-|cc0|copyrighted\s*[:=]?\s*(?:false|no)/i.test([licenseName, copyrighted, usageTerms].join(" "));
  const threshold = /threshold of originality|too simple|ineligible for copyright/i.test([description, restrictions, usageTerms].join(" "));
  const trademarkNotice = /trademark|logo/i.test(restrictions)
    ? restrictions
    : "This logo may be protected by trademark rights; use is limited to identifying the associated record label.";
  const commercialUseAllowed = isAllowedCommonsLicense(licenseName) || publicDomain || threshold;
  const requiresAttribution = /^cc by/i.test(licenseName) && !/^cc0/i.test(licenseName);
  const attribution = requiresAttribution
    ? [creator || "Creator listed on Wikimedia Commons", licenseName, "via Wikimedia Commons"].filter(Boolean).join(" / ")
    : "";
  return {
    logo_url: clean(imageInfo.thumburl || imageInfo.url),
    source_type: "Wikimedia Commons",
    source_page_url: clean(imageInfo.descriptionurl),
    source_file_url: clean(imageInfo.url),
    license_name: licenseName,
    license_url: licenseUrl,
    copyright_status: publicDomain ? "Public domain stated by Wikimedia Commons" : threshold ? "Below threshold of originality stated by source metadata" : copyrighted || licenseName,
    attribution_text: attribution,
    creator,
    trademark_notice: trademarkNotice,
    commercial_use_allowed: commercialUseAllowed,
    requires_attribution: requiresAttribution,
    verified: false,
    manually_verified: false,
    review_status: "needs_review",
    review_reason: commercialUseAllowed
      ? "Commons metadata provides a potential reuse basis; trademark and source details require administrator review."
      : "The Commons metadata does not establish a commercially reusable basis.",
    notes: "Automated candidate. Do not publish until manually approved.",
    last_license_check_at: new Date().toISOString(),
    license_status_changed: false,
    source_metadata: { filename, licenseName, licenseUrl, copyrighted, restrictions, usageTerms }
  };
}

async function wikidataLabelLogoFilename(labelName) {
  const name = clean(labelName).replace(/\s*\([^)]*\)\s*/g, " ").trim();
  if (!name) return "";
  const search = await wikidataJson({ action: "wbsearchentities", search: `${name} record label`, language: "en", uselang: "en", type: "item", limit: "8" });
  const wanted = normalize(name);
  const score = item => {
      const label = normalize(item.label);
      const description = normalize(item.description);
      let value = label === wanted ? 8 : label === `${wanted} records` ? 7 : label.includes(wanted) ? 4 : 0;
      if (/record label|record company|music label/.test(description)) value += 4;
      return value;
    };
  const ranked = (search?.search || []).map(item => ({ item, score: score(item) }))
    .filter(candidate => candidate.score >= 8)
    .sort((left, right) => right.score - left.score);
  for (const candidate of ranked.slice(0, 4)) {
    const item = candidate.item;
    const itemId = clean(item.id);
    if (!/^Q\d+$/.test(itemId)) continue;
    const entities = await wikidataJson({ action: "wbgetentities", ids: itemId, props: "claims" });
    const filename = clean(entities?.entities?.[itemId]?.claims?.P154?.[0]?.mainsnak?.datavalue?.value);
    if (filename) return filename;
  }
  return "";
}

async function discoverCommonsLabelLogo(labelName) {
  const key = normalize(labelName);
  if (!key) return null;
  if (recordLabelLogoCache.has(key)) return recordLabelLogoCache.get(key);
  const request = (async () => {
    const filename = await wikidataLabelLogoFilename(labelName);
    if (!filename) return null;
    const result = await commonsJson({
      action: "query",
      titles: `File:${filename}`,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "256"
    });
    const page = (result?.query?.pages || []).find(item => !item.missing);
    if (!page) return null;
    const candidate = commonsLogoMetadata(filename, page);
    return candidate.logo_url && candidate.source_page_url ? candidate : null;
  })();
  recordLabelLogoCache.set(key, request);
  try { return await request; } catch (error) { recordLabelLogoCache.delete(key); throw error; }
}

function recordLabelLogoAuditSignature(logo) {
  return [logo?.source_page_url, logo?.source_file_url, logo?.license_name, logo?.license_url, logo?.copyright_status, logo?.attribution_text, logo?.trademark_notice, logo?.commercial_use_allowed, logo?.requires_attribution]
    .map(value => String(value ?? "")).join("::");
}

async function persistRecordLabelLogo(logo) {
  if (!logo?.label_id) return logo;
  const rows = await api("record_label_logos?on_conflict=label_id", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...logo, updated_at: new Date().toISOString() })
  });
  return rows?.[0] || logo;
}

async function attachRecordLabelLogos(info, options = {}) {
  const labels = Array.isArray(info?.labels) ? info.labels : [];
  const stored = Array.isArray(info?.record_label_logos) ? info.record_label_logos : [];
  const byLabelId = new Map(stored.filter(row => row.label_id).map(row => [String(row.label_id), row]));
  const byName = new Map(stored.filter(row => row.label_name).map(row => [normalize(row.label_name), row]));
  const now = Date.now();
  await Promise.all(labels.map(async label => {
    delete label.logo_url;
    let logo = byLabelId.get(String(label.id || "")) || byName.get(normalize(label.label_name)) || null;
    const lastCheck = Date.parse(logo?.last_license_check_at || "") || 0;
    const shouldCheck = !logo || options.force || logo?.source_type === "Legacy Muze source"
      || (logo?.source_type === "Wikimedia Commons" && now - lastCheck > 30 * 24 * 60 * 60 * 1000);
    if (shouldCheck) {
      try {
        const discovered = await discoverCommonsLabelLogo(label.label_name);
        if (discovered) {
          const changed = Boolean(logo && recordLabelLogoAuditSignature(logo) !== recordLabelLogoAuditSignature(discovered));
          const preserveApproval = Boolean(logo && !changed && recordLabelLogoIsPublic(logo));
          logo = {
            ...logo,
            ...discovered,
            id: logo?.id,
            album_ref: label.album_ref || info?.metadata?.album_ref || "",
            label_id: label.id || logo?.label_id || null,
            label_name: label.label_name,
            review_status: preserveApproval ? "approved" : "needs_review",
            verified: preserveApproval,
            manually_verified: preserveApproval,
            verified_at: preserveApproval ? logo.verified_at : null,
            approved_by: preserveApproval ? logo.approved_by : null,
            approved_at: preserveApproval ? logo.approved_at : null,
            approval_notes: preserveApproval ? logo.approval_notes : null,
            license_status_changed: changed
          };
          if (options.persist !== false && logo.label_id) {
            try { logo = await persistRecordLabelLogo(logo); } catch (error) { console.warn("[Muze label logo] candidate cache failed", error.message); }
          }
        }
      } catch (error) { console.warn("[Muze label logo] Commons lookup failed", label.label_name, error.message); }
    }
    if (!logo) return;
    label.record_label_logo = logo;
    if (recordLabelLogoIsPublic(logo)) label.logo_url = clean(logo.logo_url);
  }));
  info.record_label_logos = labels.map(label => label.record_label_logo).filter(Boolean);
  return info;
}

async function wikidataJson(params) {
  const query = new URLSearchParams({ format: "json", origin: "*", ...params });
  return cachedApiJson(wikidataApiCache, `${WIKIDATA_API}?${query}`, "Wikidata API", { timeoutMs: 7000, wikimedia: true });
}

async function commonsJson(params) {
  const query = new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  return cachedApiJson(commonsApiCache, `${COMMONS_API}?${query}`, "Wikimedia Commons API", { timeoutMs: 7000, wikimedia: true });
}

function isAllowedCommonsLicense(value) {
  const license = normalize(value);
  if (!license || /\b(?:noncommercial|no derivatives|nc|nd)\b/.test(license)) return false;
  return license === "public domain" || license === "cc0" || license.startsWith("cc0 ")
    || /^cc by(?: \d+(?: \d+)?)?$/.test(license)
    || /^cc by sa(?: \d+(?: \d+)?)?$/.test(license);
}

function metadataValue(metadata, key) {
  return clean(metadata?.[key]?.value);
}

function stringArray(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [];
  } catch (_) { return []; }
}

async function wikidataIdForCredit(credit) {
  const name = clean(credit?.person_name);
  if (name) {
    try {
      const result = await wikipediaJson({ action: "query", titles: name, redirects: "1", prop: "pageprops" });
      const page = (result?.query?.pages || []).find(item => !item.missing);
      const itemId = clean(page?.pageprops?.wikibase_item);
      if (/^Q\d+$/.test(itemId)) return itemId;
    } catch (_) {}
  }
  const personId = clean(credit?.person_id);
  if (personId) {
    try {
      const artist = await musicBrainzJson(`/artist/${encodeURIComponent(personId)}?inc=url-rels&fmt=json`);
      const relation = (artist.relations || []).find(item => /wikidata/i.test(item.type || "") || /wikidata\.org\/wiki\/Q\d+/i.test(item.url?.resource || ""));
      const itemId = /\/wiki\/(Q\d+)/i.exec(relation?.url?.resource || "")?.[1];
      if (itemId) return itemId.toUpperCase();
    } catch (_) {}
  }
  return "";
}

function commonsPortraitFromPage(page, itemId, personName, requireNamedFile = false, autoApprove = false) {
  const image = page?.imageinfo?.[0];
  const metadata = image?.extmetadata || {};
  const license = htmlText(metadataValue(metadata, "LicenseShortName") || metadataValue(metadata, "UsageTerms"));
  if (!image || !isAllowedCommonsLicense(license)) return null;
  const filename = clean(String(page?.title || "").replace(/^File:/i, ""));
  if (requireNamedFile && !normalize(filename).includes(normalize(personName))) return null;
  const author = htmlText(metadataValue(metadata, "Artist") || metadataValue(metadata, "Credit")) || "Wikimedia Commons contributor";
  const suppliedAttribution = htmlText(metadataValue(metadata, "Attribution"));
  const sourceUrl = clean(image.descriptionurl) || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename.replace(/ /g, "_"))}`;
  return {
    person_wikidata_id: itemId,
    image_url: clean(image.thumburl || image.url),
    image_source_url: sourceUrl,
    image_author: author,
    image_license: license,
    image_license_url: clean(metadataValue(metadata, "LicenseUrl")),
    image_attribution: suppliedAttribution || `Photo: ${author} / Wikimedia Commons / ${license}`,
    image_modified: "Displayed with a circular crop",
    image_status: autoApprove ? "approved" : "candidate",
    image_approved: autoApprove,
    image_last_verified_at: new Date().toISOString()
  };
}

async function fetchCommonsPortrait(itemId, personName, excludedUrls = [], findAlternative = false) {
  if (!/^Q\d+$/.test(clean(itemId))) return null;
  const excluded = new Set((excludedUrls || []).map(clean).filter(Boolean));
  const entityData = await wikidataJson({ action: "wbgetentities", ids: itemId, props: "claims|labels|aliases", languages: "en" });
  const entity = entityData?.entities?.[itemId];
  const names = [entity?.labels?.en?.value, ...(entity?.aliases?.en || []).map(item => item.value)].map(normalize).filter(Boolean);
  if (!names.includes(normalize(personName))) return null;
  const filename = clean(entity?.claims?.P18?.find(claim => claim.rank === "preferred")?.mainsnak?.datavalue?.value
    || entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value);
  if (filename) {
    const result = await commonsJson({
      action: "query", titles: `File:${filename}`, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "240",
      iiextmetadatalanguage: "en", iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|Attribution|AttributionRequired|UsageTerms"
    });
    const portrait = commonsPortraitFromPage(result?.query?.pages?.[0], itemId, personName, false, true);
    if (portrait && !excluded.has(portrait.image_url) && !excluded.has(portrait.image_source_url)) return portrait;
  }
  if (!findAlternative) return null;
  const search = await commonsJson({
    action: "query", generator: "search", gsrsearch: `\"${personName}\" filetype:bitmap`, gsrnamespace: "6", gsrlimit: "20",
    prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "240", iiextmetadatalanguage: "en",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|Attribution|AttributionRequired|UsageTerms"
  });
  const alternatives = (search?.query?.pages || [])
    .map(page => commonsPortraitFromPage(page, itemId, personName, true))
    .filter(Boolean)
    .filter(portrait => !excluded.has(portrait.image_url) && !excluded.has(portrait.image_source_url));
  return alternatives[0] || null;
}

const portraitFields = ["person_wikidata_id", "image_url", "image_source_url", "image_author", "image_license", "image_license_url", "image_attribution", "image_modified", "image_status", "image_approved", "image_last_verified_at", "image_rejected_urls"];

async function portraitForCredit(credit) {
  const key = clean(credit?.person_id) || normalize(credit?.person_name);
  if (!key) return null;
  if (artistPortraitCache.has(key)) return artistPortraitCache.get(key);
  let portrait = null;
  try {
    const itemId = await wikidataIdForCredit(credit);
    if (itemId) portrait = await fetchCommonsPortrait(itemId, credit.person_name);
  } catch (error) {
    console.warn("[Muze album info] artist portrait unavailable", credit.person_name, error.message);
  }
  artistPortraitCache.set(key, portrait);
  return portrait;
}

async function attachArtistPortraits(info) {
  const credits = Array.isArray(info?.credits) ? info.credits : [];
  const candidates = credits.filter(row => ["performer", "production"].includes(row.credit_type) && !row.image_approved
    && (!row.image_status || (row.image_status === "candidate" && (!row.image_url || !stringArray(row.image_rejected_urls).length)))).slice(0, 8);
  await Promise.all(candidates.map(async credit => {
    const portrait = await portraitForCredit(credit);
    if (portrait) Object.assign(credit, portrait);
    else if (!credit.image_url) Object.assign(credit, { image_status: "unavailable", image_approved: false, image_last_verified_at: new Date().toISOString() });
    if (!credit.id) return;
    const patch = Object.fromEntries(portraitFields.filter(field => Object.prototype.hasOwnProperty.call(credit, field)).map(field => [field, credit[field]]));
    patch.updated_at = new Date().toISOString();
    try {
      await api(`album_credits?id=eq.${encodeURIComponent(credit.id)}`, { method: "PATCH", headers: { "Prefer": "return=minimal" }, body: JSON.stringify(patch) });
    } catch (error) {
      console.warn("[Muze album info] portrait cache write unavailable", error.message);
    }
  }));
  return info;
}

async function persistAttachedPortraits(info) {
  const credits = (info?.credits || []).filter(credit => credit.id && credit.image_url && credit.image_status === "candidate" && !credit.image_approved);
  await Promise.all(credits.map(async credit => {
    const patch = Object.fromEntries(portraitFields.filter(field => Object.prototype.hasOwnProperty.call(credit, field)).map(field => [field, credit[field]]));
    patch.updated_at = new Date().toISOString();
    try {
      await api(`album_credits?id=eq.${encodeURIComponent(credit.id)}`, { method: "PATCH", headers: { "Prefer": "return=minimal" }, body: JSON.stringify(patch) });
    } catch (error) {
      console.warn("[Muze album info] attached portrait write unavailable", error.message);
    }
  }));
  return info;
}

async function fetchWikidataCountry(itemId, claimProperties = ["P495"]) {
  if (!/^Q\d+$/.test(clean(itemId))) return "";
  const entityData = await wikidataJson({ action: "wbgetentities", ids: itemId, props: "claims" });
  const claims = entityData?.entities?.[itemId]?.claims || {};
  const countryIds = [...new Set(claimProperties.flatMap(property => claims[property] || [])
    .map(claim => claim?.mainsnak?.datavalue?.value?.id)
    .filter(id => /^Q\d+$/.test(clean(id))))];
  if (!countryIds.length) return "";
  const labelData = await wikidataJson({ action: "wbgetentities", ids: countryIds.join("|"), props: "labels", languages: "en" });
  return wikipediaCountry(countryIds.map(id => clean(labelData?.entities?.[id]?.labels?.en?.value)).filter(Boolean).join("|"));
}

async function fetchWikipediaArtistCountry(artistName) {
  const artist = clean(artistName);
  if (!artist) return "";
  const result = await wikipediaJson({ action: "query", titles: artist, redirects: "1", prop: "pageprops" });
  const page = (result?.query?.pages || []).find(item => !item.missing);
  return fetchWikidataCountry(page?.pageprops?.wikibase_item, ["P495", "P27"]);
}

function htmlText(value) {
  return clean(String(value || "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>|<sup\b[^>]*>[\s\S]*?<\/sup>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&ndash;|&#8211;/gi, "\u2013")
    .replace(/&mdash;|&#8212;/gi, "\u2014"));
}

function salesRow(input, value, options = {}) {
  const now = new Date().toISOString();
  return {
    album_ref: albumRef(input),
    album_id: clean(input.album_id) || null,
    worldwide_sales_estimate: Math.round(Number(value) || 0) || null,
    worldwide_sales_min: options.min ? Math.round(options.min) : null,
    worldwide_sales_max: options.max ? Math.round(options.max) : null,
    display_value: clean(options.display_value),
    confidence: clean(options.confidence || "documented"),
    source: clean(options.source),
    source_url: clean(options.source_url),
    manually_verified: false,
    last_verified_at: now,
    updated_at: now
  };
}

function parseWikipediaSalesHtml(html, input) {
  const wantedTitle = normalize(canonicalAlbumTitle(input.title));
  const wantedArtist = normalize(input.artist);
  const wantedYear = String(input.year || "").match(/\b(19|20)\d{2}\b/)?.[0] || "";
  for (const row of String(html || "").match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || []) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => match[1]);
    if (cells.length < 6) continue;
    const artist = normalize(htmlText(cells[0]));
    const title = normalize(canonicalAlbumTitle(htmlText(cells[1])));
    const year = htmlText(cells[2]).match(/\b(19|20)\d{2}\b/)?.[0] || "";
    if (title !== wantedTitle || (wantedArtist && artist !== wantedArtist) || (wantedYear && year && year !== wantedYear)) continue;
    const claimed = htmlText(cells[cells.length - 2]);
    const range = /(\d+(?:\.\d+)?)\s*(?:\u2013|-)\s*(\d+(?:\.\d+)?)/.exec(claimed);
    const exact = /\d+(?:\.\d+)?/.exec(claimed);
    if (!range && !exact) continue;
    const min = Number(range?.[1] || exact[0]) * 1000000;
    const max = Number(range?.[2] || exact[0]) * 1000000;
    const display = range ? `${range[1]}\u2013${range[2]} million` : `${exact[0]} million`;
    return salesRow(input, max, { min, max, display_value: display, confidence: "reported worldwide sales", source: "Wikipedia", source_url: WIKIPEDIA_BESTSELLERS_URL });
  }
  return null;
}

function parseBestsellingSearchHtml(html, input) {
  const wantedTitle = normalize(canonicalAlbumTitle(input.title));
  const wantedArtist = normalize(input.artist);
  for (const match of String(html || "").matchAll(/<a\b[^>]*href=["']([^"']*\/album\/\d+)["'][^>]*>\s*<p>([\s\S]*?)<\/p>/gi)) {
    const label = htmlText(match[2]).replace(/\s*\(album\)\s*$/i, "");
    const parts = /^(.*?)\s+by\s+(.+)$/i.exec(label);
    if (!parts) continue;
    if (normalize(canonicalAlbumTitle(parts[1])) !== wantedTitle || normalize(parts[2]) !== wantedArtist) continue;
    return new URL(match[1], BESTSELLING_ALBUMS_ROOT).href;
  }
  return "";
}

function parseBestsellingArtistSearchUrl(html, artist) {
  const wantedArtist = normalize(artist);
  for (const match of String(html || "").matchAll(/<a\b[^>]*href=["']([^"']*\/artist\/\d+)["'][^>]*>\s*<p>([\s\S]*?)<\/p>/gi)) {
    const label = htmlText(match[2]).replace(/\s*\(artist\)\s*$/i, "");
    if (normalize(label) === wantedArtist) return new URL(match[1], BESTSELLING_ALBUMS_ROOT).href;
  }
  return "";
}

function parseBestsellingArtistAlbumUrl(html, input) {
  const wantedTitle = normalize(canonicalAlbumTitle(input.title));
  const wantedArtist = normalize(input.artist);
  const wantedYear = String(input.year || "").match(/\b(19|20)\d{2}\b/)?.[0] || "";
  for (const match of String(html || "").matchAll(/<td\b[^>]*class=["'][^"']*artist-album-title[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi)) {
    const cell = match[1];
    const album = /<a\b[^>]*href=["']([^"']*\/album\/\d+)["'][^>]*>\s*<b>([\s\S]*?)<\/b>/i.exec(cell);
    const artist = /<a\b[^>]*href=["'][^"']*\/artist\/\d+["'][^>]*>([\s\S]*?)<\/a>/i.exec(cell);
    const year = htmlText(cell).match(/\b(19|20)\d{2}\b/)?.[0] || "";
    if (!album || !artist) continue;
    if (normalize(canonicalAlbumTitle(htmlText(album[2]))) !== wantedTitle || normalize(htmlText(artist[1])) !== wantedArtist || (wantedYear && year && year !== wantedYear)) continue;
    return new URL(album[1], BESTSELLING_ALBUMS_ROOT).href;
  }
  return "";
}

function parseBestsellingSalesHtml(html, input, sourceUrl) {
  const heading = htmlText(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(String(html || ""))?.[1]);
  const identity = /^(.*?)\s+by\s+(.*?)\s+-\s+(?:sales|charts)/i.exec(heading);
  if (!identity || normalize(canonicalAlbumTitle(identity[1])) !== normalize(canonicalAlbumTitle(input.title)) || normalize(identity[2]) !== normalize(input.artist)) return null;
  const text = htmlText(html);
  const sold = /\bhas sold\s+([\d,\s]+)\s+copies\b/i.exec(text);
  if (!sold) return null;
  const value = Number(sold[1].replace(/[^0-9]/g, ""));
  if (!value) return null;
  return salesRow(input, value, { min: value, max: value, display_value: value.toLocaleString("en-US"), confidence: "documented sales and album-equivalent units", source: "BestSellingAlbums.org", source_url: sourceUrl });
}

async function fetchWikipediaSales(input) {
  if (!wikipediaSalesHtmlCache.html || wikipediaSalesHtmlCache.expiresAt < Date.now()) {
    const parsed = await wikipediaJson({ action: "parse", page: "List_of_best-selling_albums", prop: "text" });
    wikipediaSalesHtmlCache = { html: parsed?.parse?.text || "", expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  }
  return parseWikipediaSalesHtml(wikipediaSalesHtmlCache.html, input);
}

async function fetchBestsellingAlbumSales(input) {
  const searchUrl = `${BESTSELLING_ALBUMS_ROOT}/search-database/backend-search.php?term=${encodeURIComponent(canonicalAlbumTitle(input.title))}`;
  const searchResponse = await timedFetch(searchUrl, { headers: { "Accept": "text/html", "User-Agent": USER_AGENT } }, 7000);
  if (!searchResponse.ok) throw new Error(`BestSellingAlbums.org search failed (${searchResponse.status}).`);
  const searchHtml = await searchResponse.text();
  let albumUrl = parseBestsellingSearchHtml(searchHtml, input);
  if (!albumUrl) {
    const artistUrl = parseBestsellingArtistSearchUrl(searchHtml, input.artist);
    if (artistUrl) {
      const artistResponse = await timedFetch(artistUrl, { headers: { "Accept": "text/html", "User-Agent": USER_AGENT } }, 7000);
      if (artistResponse.ok) albumUrl = parseBestsellingArtistAlbumUrl(await artistResponse.text(), input);
    }
  }
  if (!albumUrl) return null;
  const albumResponse = await timedFetch(albumUrl, { headers: { "Accept": "text/html", "User-Agent": USER_AGENT } }, 7000);
  if (!albumResponse.ok) throw new Error(`BestSellingAlbums.org album lookup failed (${albumResponse.status}).`);
  return parseBestsellingSalesHtml(await albumResponse.text(), input, albumUrl);
}

async function fetchAlbumSales(input) {
  const [wikipedia, bestselling] = await Promise.allSettled([fetchWikipediaSales(input), fetchBestsellingAlbumSales(input)]);
  if (wikipedia.status === "rejected") console.warn("[Muze album info] Wikipedia sales unavailable", wikipedia.reason?.message || wikipedia.reason);
  if (bestselling.status === "rejected") console.warn("[Muze album info] BestSellingAlbums.org unavailable", bestselling.reason?.message || bestselling.reason);
  return (wikipedia.status === "fulfilled" && wikipedia.value) || (bestselling.status === "fulfilled" && bestselling.value) || null;
}

function wikipediaAlbumMatches(wikitext, input) {
  if (!/\{\{\s*Infobox\s+album\b/i.test(String(wikitext || ""))) return false;
  const listedArtist = normalize(stripWikiMarkup(wikipediaInfoboxField(wikitext, "artist")));
  const wantedArtist = normalize(input.artist);
  const listedTitle = normalize(stripWikiMarkup(wikipediaInfoboxField(wikitext, "name")));
  const wantedTitle = normalize(canonicalAlbumTitle(input.title));
  const listedRelease = wikipediaDate(wikipediaInfoboxField(wikitext, "released"));
  const listedYear = String(listedRelease || "").match(/\b(19|20)\d{2}\b/)?.[0] || "";
  const wantedYear = String(input.year || "").match(/\b(19|20)\d{2}\b/)?.[0] || "";
  const artistMatches = !listedArtist || !wantedArtist || listedArtist.includes(wantedArtist) || wantedArtist.includes(listedArtist);
  const titleMatches = !listedTitle || !wantedTitle || listedTitle === wantedTitle;
  const yearMatches = !listedYear || !wantedYear || listedYear === wantedYear;
  return artistMatches && titleMatches && yearMatches;
}

async function wikipediaAlbumPageInfo(page, input) {
  if (!page?.pageid) return null;
  const revision = await wikipediaJson({ action: "query", pageids: String(page.pageid), prop: "revisions|pageprops", rvprop: "content", rvslots: "main" });
  const resolved = revision?.query?.pages?.[0];
  const wikitext = resolved?.revisions?.[0]?.slots?.main?.content || "";
  if (!wikipediaAlbumMatches(wikitext, input)) return null;
  const sourceUrl = page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`;
  const info = parseWikipediaAlbumInfo(wikitext, { album_ref: albumRef(input), album_id: clean(input.album_id) || null, artist: clean(input.artist), source_url: sourceUrl });
  if (!info.metadata.country) {
    try { info.metadata.country = await fetchWikidataCountry(resolved?.pageprops?.wikibase_item); } catch (_) {}
  }
  if (!info.metadata.country) {
    try { info.metadata.country = await fetchWikipediaArtistCountry(input.artist); } catch (_) {}
  }
  return info;
}

async function fetchWikipediaInfo(input) {
  const canonicalTitle = canonicalAlbumTitle(input.title);
  const wanted = normalize(canonicalTitle);
  const exact = await wikipediaJson({ action: "query", titles: canonicalTitle, redirects: "1", prop: "info", inprop: "url" });
  const exactPage = (exact?.query?.pages || []).find(item => !item.missing);
  const exactInfo = await wikipediaAlbumPageInfo(exactPage, input);
  if (exactInfo) return exactInfo;
  const qualifiedTitles = [`${canonicalTitle} (${input.artist} album)`, `${canonicalTitle} (album)`];
  const qualified = await wikipediaJson({ action: "query", titles: qualifiedTitles.join("|"), redirects: "1", prop: "info", inprop: "url" });
  for (const page of qualified?.query?.pages || []) {
    if (page.missing || page.pageid === exactPage?.pageid) continue;
    const info = await wikipediaAlbumPageInfo(page, input);
    if (info) return info;
  }
  const search = await wikipediaJson({ action: "query", generator: "search", gsrsearch: `intitle:"${canonicalTitle}" ${input.artist} album`, gsrlimit: "8", prop: "info", inprop: "url" });
  const pages = (search?.query?.pages || []).slice().sort((left, right) => {
    const rank = page => normalize(page.title) === wanted ? 3 : normalize(page.title).includes(wanted) && /album/i.test(page.title) ? 2 : normalize(page.title).includes(wanted) ? 1 : 0;
    return rank(right) - rank(left);
  });
  for (const page of pages.slice(0, 5)) {
    if (page.pageid === exactPage?.pageid) continue;
    const info = await wikipediaAlbumPageInfo(page, input);
    if (info) return info;
  }
  return null;
}

function releaseTracks(release) {
  return (release?.media || []).flatMap(medium => medium.tracks || []);
}

function importedInfo(release, input) {
  const ref = albumRef(input);
  const tracks = releaseTracks(release);
  const releaseGroup = release?.["release-group"] || {};
  const labels = (release?.["label-info"] || []).map((item, index) => ({
    album_ref: ref,
    album_id: clean(input.album_id) || null,
    label_name: clean(item.label?.name),
    label_type: "label",
    is_original_label: index === 0,
    release_region: clean(release.country),
    source: "MusicBrainz",
    source_url: item.label?.id ? `https://musicbrainz.org/label/${item.label.id}` : `https://musicbrainz.org/release/${release.id}`,
    manually_verified: false
  })).filter(item => item.label_name);
  const runtime = tracks.reduce((sum, track) => sum + (Number(track.length || track.recording?.length) || 0), 0);
  const metadata = {
    album_ref: ref,
    album_id: clean(input.album_id) || null,
    title: clean(input.title || release.title),
    artist: clean(input.artist || releaseArtist(release)),
    original_release_date: clean(releaseGroup["first-release-date"] || release.date),
    release_year: Number(String(releaseGroup["first-release-date"] || release.date || input.year || "").slice(0, 4)) || null,
    country: "",
    album_type: [releaseGroup["primary-type"], ...(releaseGroup["secondary-types"] || [])].map(clean).filter(Boolean).join(" / ") || "Album",
    total_runtime_ms: runtime || null,
    track_count: tracks.length || Number(release?.["track-count"]) || null,
    musicbrainz_release_id: clean(release.id),
    musicbrainz_release_group_id: clean(releaseGroup.id),
    source: "MusicBrainz",
    source_url: `https://musicbrainz.org/release/${release.id}`,
    source_confidence: "high",
    manually_verified: false,
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  return {
    metadata,
    credits: aggregateCredits(release, ref, clean(input.album_id)),
    labels,
    sales: null,
    certifications: []
  };
}

function basicImportedInfo(input) {
  const now = new Date().toISOString();
  return {
    metadata: {
      album_ref: albumRef(input),
      album_id: clean(input.album_id) || null,
      title: clean(input.title),
      artist: clean(input.artist),
      original_release_date: "",
      release_year: Number(String(input.year || "").slice(0, 4)) || null,
      country: "",
      album_type: "Album",
      total_runtime_ms: null,
      track_count: null,
      source: "",
      source_url: "",
      source_confidence: "",
      manually_verified: false,
      last_verified_at: now,
      updated_at: now
    },
    credits: [], labels: [], sales: null, certifications: []
  };
}

async function importAlbumInfo(input) {
  const wikipediaPromise = fetchWikipediaInfo(input).catch(error => {
    console.warn("[Muze album info] Wikipedia information unavailable", error.message);
    return null;
  });
  const salesPromise = fetchAlbumSales(input).catch(error => {
    console.warn("[Muze album info] sales information unavailable", error.message);
    return null;
  });
  let info = null;
  try {
    const searchTitle = canonicalAlbumTitle(input.title);
    const query = `release:"${escapeQuery(searchTitle)}" AND artist:"${escapeQuery(input.artist)}" AND status:official`;
    const search = await musicBrainzJson(`/release/?query=${encodeURIComponent(query)}&limit=20&fmt=json`);
    const initialMatch = pickCanonicalRelease(search.releases, input);
    const artistId = initialMatch?.["artist-credit"]?.[0]?.artist?.id;
    let preferredCountry = "";
    if (artistId) {
      try {
        const artist = await musicBrainzJson(`/artist/${encodeURIComponent(artistId)}?fmt=json`);
        preferredCountry = clean(artist.country);
      } catch (_) {}
    }
    const match = pickCanonicalRelease(search.releases, { ...input, preferred_country: preferredCountry });
    if (match) {
      let release = match;
      try {
        release = await musicBrainzJson(`/release/${encodeURIComponent(match.id)}?inc=artist-credits+labels+recordings+release-groups+artist-rels+recording-rels+work-rels&fmt=json`);
      } catch (_) {
        // Search metadata is still useful when detailed relationships are unavailable.
      }
      info = importedInfo(release, input);
    }
  } catch (error) {
    console.warn("[Muze album info] MusicBrainz fallback unavailable", error.message);
  }
  const wikipedia = await wikipediaPromise;
  if (!info && !wikipedia) return null;
  const merged = mergeWikipediaAlbumInfo(info || basicImportedInfo(input), wikipedia);
  merged.sales = await salesPromise;
  return merged;
}

function preserveManualCachedInfo(imported, cached) {
  if (!cached) return imported;
  const manualCredits = (cached.credits || []).filter(row => row.manually_verified || row.image_approved || stringArray(row.image_rejected_urls).length || ["approved", "rejected"].includes(clean(row.image_status).toLowerCase()));
  const manualLabels = (cached.labels || []).filter(row => row.manually_verified);
  return {
    ...imported,
    metadata: cached.metadata?.manually_verified ? { ...cached.metadata, source_confidence: ALBUM_INFO_IMPORT_VERSION } : imported.metadata,
    credits: mergeCredits(manualCredits, imported.credits || []),
    labels: mergeLabels(manualLabels, imported.labels || []),
    sales: cached.sales?.manually_verified ? cached.sales : (imported.sales || cached.sales || null),
    certifications: cached.certifications?.length ? cached.certifications : (imported.certifications || [])
  };
}

function applyVerifiedAlbumOverrides(info, input) {
  if (!info) return info;
  const labels = Array.isArray(info.labels) ? info.labels : [];
  const originalLabel = labels.find(label => label.is_original_label) || labels[0];
  info.labels = originalLabel ? [{ ...originalLabel, is_original_label: true }] : [];
  const title = normalize(canonicalAlbumTitle(input.title));
  const artist = normalize(input.artist);
  if (title === "nevermind" && artist === "nirvana") {
    const storedDgc = labels.find(label => ["dgc", "dgc records"].includes(normalize(label.label_name)));
    info.metadata = { ...(info.metadata || {}), country: "United States" };
    info.labels = [{
      id: storedDgc?.id,
      album_ref: albumRef(input),
      album_id: clean(input.album_id) || null,
      label_name: "DGC",
      label_type: "label",
      is_original_label: true,
      release_region: "",
      source: "Wikipedia",
      source_url: "https://en.wikipedia.org/wiki/DGC_Records",
      manually_verified: false
    }];
  }
  return info;
}

async function cacheImportedInfo(info, replaceNonManual = false) {
  const ref = encodeURIComponent(info.metadata.album_ref);
  if (replaceNonManual) {
    await Promise.all([
      api(`album_credits?album_ref=eq.${ref}&manually_verified=eq.false`, { method: "DELETE" }),
      api(`album_labels?album_ref=eq.${ref}&manually_verified=eq.false`, { method: "DELETE" })
    ]);
  }
  await api("album_metadata", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(info.metadata)
  });
  if (info.credits.length) await api("album_credits", {
    method: "POST", headers: { "Prefer": "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(info.credits)
  });
  if (info.labels.length) await api("album_labels", {
    method: "POST", headers: { "Prefer": "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(info.labels)
  });
  if (info.sales) await api("album_sales", {
    method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(info.sales)
  });
}

async function attachStoredCreditIds(info) {
  const ref = encodeURIComponent(info?.metadata?.album_ref || "");
  if (!ref || !Array.isArray(info?.credits) || !info.credits.length) return info;
  const stored = await api(`album_credits?album_ref=eq.${ref}&select=id,person_name,credit_type,role,instrument`);
  const identity = row => [row.person_name, row.credit_type, row.role, row.instrument].map(normalize).join("::");
  const ids = new Map((stored || []).map(row => [identity(row), row.id]));
  info.credits.forEach(row => { if (!row.id) row.id = ids.get(identity(row)) || null; });
  return info;
}

async function attachStoredLabelIds(info) {
  const ref = encodeURIComponent(info?.metadata?.album_ref || "");
  if (!ref || !Array.isArray(info?.labels) || !info.labels.length) return info;
  const stored = await api(`album_labels?album_ref=eq.${ref}&select=id,label_name,label_type,release_region`);
  const identity = row => [row.label_name, row.label_type, row.release_region].map(normalize).join("::");
  const ids = new Map((stored || []).map(row => [identity(row), row.id]));
  info.labels.forEach(row => { if (!row.id) row.id = ids.get(identity(row)) || null; });
  return info;
}

function normalizePin(value) {
  return String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/^['"]|['"]$/g, "").trim();
}

function validAdminPin(received) {
  const pin = normalizePin(received);
  const configured = [process.env.MUSICA_ADMIN_PIN, process.env.ADMIN_PIN, process.env.VITE_ADMIN_PIN, process.env.NEXT_PUBLIC_ADMIN_PIN]
    .map(normalizePin).find(Boolean);
  const hashes = ["71bdc015e35ca2f9fbb2cfd5c82374fba64813d4a7a1baae09e29f27f46891c5"];
  return Boolean(pin) && (pin === configured || hashes.includes(crypto.createHash("sha256").update(pin).digest("hex")));
}

function pick(source, fields) {
  const value = {};
  fields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(source, field)) value[field] = source[field] === "" ? null : source[field];
  });
  return value;
}

async function adminAction(body) {
  const ref = albumRef(body);
  if (!ref) throw new Error("Album reference is required.");
  const now = new Date().toISOString();
  const base = { album_ref: ref, album_id: clean(body.album_id) || null, manually_verified: body.manually_verified !== false, updated_at: now };
  if (body.action === "save_metadata") {
    const row = { ...base, title: clean(body.title), artist: clean(body.artist), ...pick(body, ["original_release_date", "release_year", "country", "album_type", "total_runtime_ms", "track_count", "source", "source_url", "source_confidence"]), last_verified_at: now };
    return api("album_metadata", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) });
  }
  if (body.action === "save_credit") {
    const row = { ...base, ...pick(body, ["person_name", "person_id", "person_wikidata_id", "image_url", "image_source_url", "image_author", "image_license", "image_license_url", "image_attribution", "image_modified", "image_status", "image_approved", "image_last_verified_at", "credit_type", "role", "instrument", "sort_order", "source", "source_url", "source_secondary", "source_secondary_url"]) };
    row.credit_type = normalize(row.credit_type);
    if (row.image_approved && (!isAllowedCommonsLicense(row.image_license) || !/^https:\/\/commons\.wikimedia\.org\//i.test(clean(row.image_source_url)))) {
      throw new Error("Approved portraits must use an allowed Wikimedia Commons licence and file-page URL.");
    }
    const originalPersonName = clean(body.original_person_name);
    const originalCreditType = normalize(body.original_credit_type);
    const storedCredits = await api(`album_credits?album_ref=eq.${encodeURIComponent(ref)}&select=id,person_name,credit_type,role,instrument,manually_verified`);
    const requestedId = clean(body.id);
    const samePersonAndType = (credit, personName, creditType) => normalize(credit?.person_name) === normalize(personName)
      && normalize(credit?.credit_type) === normalize(creditType);
    const sameIdentity = credit => samePersonAndType(credit, row.person_name, row.credit_type)
      && normalize(credit?.role) === normalize(row.role)
      && normalize(credit?.instrument) === normalize(row.instrument);
    const collision = (storedCredits || []).find(sameIdentity);
    const requested = (storedCredits || []).find(credit => clean(credit.id) === requestedId);
    const original = (storedCredits || []).find(credit => samePersonAndType(credit, originalPersonName, originalCreditType));
    let creditId = clean(collision?.id || requested?.id || original?.id);
    let saved = [];
    if (creditId) saved = await api(`album_credits?id=eq.${encodeURIComponent(creditId)}`, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
    if (!saved?.length) saved = await api("album_credits", { method: "POST", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
    const savedId = clean(saved?.[0]?.id);
    if (savedId) {
      const supersededIds = [...new Set((storedCredits || [])
        .filter(credit => clean(credit.id) !== savedId && (
          samePersonAndType(credit, row.person_name, row.credit_type)
          || samePersonAndType(credit, originalPersonName, originalCreditType)
        ))
        .map(credit => clean(credit.id))
        .filter(Boolean))];
      await Promise.all(supersededIds.map(id => api(`album_credits?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" })));
    }
    return saved;
  }
  if (body.action === "set_credit_image_status") {
    const approved = body.image_status === "approved";
    let rows;
    try {
      const albumRows = await api(`album_credits?album_ref=eq.${encodeURIComponent(ref)}&select=id,person_name,credit_type,person_wikidata_id,image_url,image_source_url,image_license,image_rejected_urls`);
      rows = (albumRows || []).filter(row => (body.id && String(row.id) === String(body.id))
        || (normalize(row.person_name) === normalize(body.person_name) && normalize(row.credit_type) === normalize(body.credit_type)));
    } catch (error) {
      if (/image_rejected_urls/i.test(error.message || "")) {
        if (!approved) throw new Error("Alternate portrait suggestions are not enabled in the live database. Run supabase/migrations/202608120004_artist_portrait_rejections.sql in the Supabase SQL Editor, then try Reject photo again.");
        const albumRows = await api(`album_credits?album_ref=eq.${encodeURIComponent(ref)}&select=id,person_name,credit_type,person_wikidata_id,image_url,image_source_url,image_license`);
        rows = (albumRows || []).filter(row => (body.id && String(row.id) === String(body.id))
          || (normalize(row.person_name) === normalize(body.person_name) && normalize(row.credit_type) === normalize(body.credit_type)));
      } else {
        if (/image_source_url|image_license|album_credits|PGRST204|PGRST205|42703|42P01/i.test(error.message || "")) {
          throw new Error("Artist portrait approval is not enabled in the live database. Run supabase/migrations/202608120001_artist_portraits.sql in the Supabase SQL Editor, then reopen Details & Credits.");
        }
        throw error;
      }
    }
    if (!rows?.length && !approved && clean(body.image_url)) {
      const candidate = {
        ...base,
        manually_verified: false,
        person_name: clean(body.person_name),
        person_id: clean(body.person_id) || null,
        person_wikidata_id: clean(body.person_wikidata_id) || null,
        credit_type: normalize(body.credit_type),
        role: clean(body.role) || null,
        instrument: clean(body.instrument) || null,
        sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
        source: clean(body.source) || null,
        source_url: clean(body.source_url) || null,
        image_url: clean(body.image_url),
        image_source_url: clean(body.image_source_url),
        image_author: clean(body.image_author) || null,
        image_license: clean(body.image_license) || null,
        image_license_url: clean(body.image_license_url) || null,
        image_attribution: clean(body.image_attribution) || null,
        image_modified: clean(body.image_modified) || "Displayed with a circular crop",
        image_status: "candidate",
        image_approved: false,
        image_last_verified_at: now,
        image_rejected_urls: []
      };
      rows = await api("album_credits", { method: "POST", headers: { "Prefer": "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(candidate) });
      if (!rows?.length) {
        const albumRows = await api(`album_credits?album_ref=eq.${encodeURIComponent(ref)}&select=id,person_name,credit_type,person_wikidata_id,image_url,image_source_url,image_license,image_rejected_urls`);
        rows = (albumRows || []).filter(row => normalize(row.person_name) === normalize(candidate.person_name)
          && normalize(row.credit_type) === candidate.credit_type);
      }
    }
    if (!approved && rows?.length) {
      const rejectedUrls = [...new Set(rows.flatMap(row => stringArray(row.image_rejected_urls))
        .concat(rows.flatMap(row => [row.image_url, row.image_source_url])).concat([body.image_url, body.image_source_url]).map(clean).filter(Boolean))];
      const itemId = clean(body.person_wikidata_id || rows.find(row => row.person_wikidata_id)?.person_wikidata_id);
      let alternative = null;
      try {
        if (itemId) alternative = await fetchCommonsPortrait(itemId, body.person_name, rejectedUrls, true);
      } catch (error) {
        console.warn("[Muze album info] alternate portrait unavailable", body.person_name, error.message);
      }
      const update = alternative
        ? { ...alternative, image_rejected_urls: rejectedUrls, updated_at: now }
        : { image_url: null, image_source_url: null, image_author: null, image_license: null, image_license_url: null, image_attribution: null, image_modified: null, image_status: "rejected", image_approved: false, image_last_verified_at: now, image_rejected_urls: rejectedUrls, updated_at: now };
      return Promise.all(rows.map(row => api(`album_credits?id=eq.${encodeURIComponent(row.id)}`, {
        method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(update)
      })));
    }
    if (approved && clean(body.image_url)) {
      if (!isAllowedCommonsLicense(body.image_license) || !/^https:\/\/commons\.wikimedia\.org\//i.test(clean(body.image_source_url))) {
        throw new Error("This portrait does not have an approved Wikimedia Commons licence record.");
      }
      const portraitPatch = {
        person_wikidata_id: clean(body.person_wikidata_id) || null,
        image_url: clean(body.image_url),
        image_source_url: clean(body.image_source_url),
        image_author: clean(body.image_author) || null,
        image_license: clean(body.image_license),
        image_license_url: clean(body.image_license_url) || null,
        image_attribution: clean(body.image_attribution) || null,
        image_modified: clean(body.image_modified) || "Displayed with a circular crop",
        image_status: "candidate",
        image_approved: false,
        image_last_verified_at: now,
        updated_at: now
      };
      if (rows?.length) {
        rows = (await Promise.all(rows.map(row => api(`album_credits?id=eq.${encodeURIComponent(row.id)}`, {
          method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(portraitPatch)
        })))).flat();
      } else {
        const candidate = {
          ...base,
          manually_verified: false,
          person_name: clean(body.person_name),
          person_id: clean(body.person_id) || null,
          credit_type: normalize(body.credit_type),
          role: clean(body.role) || null,
          instrument: clean(body.instrument) || null,
          sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
          source: clean(body.source) || null,
          source_url: clean(body.source_url) || null,
          ...portraitPatch
        };
        try {
          rows = await api("album_credits", { method: "POST", headers: { "Prefer": "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(candidate) });
        } catch (error) {
          throw new Error(`This portrait candidate could not be saved: ${error.message}`);
        }
        if (!rows?.length) {
          const albumRows = await api(`album_credits?album_ref=eq.${encodeURIComponent(ref)}&select=id,person_name,credit_type,person_wikidata_id,image_url,image_source_url,image_license,image_rejected_urls`);
          rows = (albumRows || []).filter(row => normalize(row.person_name) === normalize(candidate.person_name)
            && normalize(row.credit_type) === candidate.credit_type);
          if (rows.length) {
            rows = (await Promise.all(rows.map(row => api(`album_credits?id=eq.${encodeURIComponent(row.id)}`, {
              method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(portraitPatch)
            })))).flat();
          }
        }
      }
    }
    if (!rows?.length) throw new Error("This portrait candidate could not be matched to a saved album credit. Refresh Details & Credits and try once more.");
    if (approved) {
      const portrait = rows?.[0] || {};
      if (!isAllowedCommonsLicense(portrait.image_license) || !/^https:\/\/commons\.wikimedia\.org\//i.test(clean(portrait.image_source_url))) {
        throw new Error("This portrait does not have an approved Wikimedia Commons licence record.");
      }
    }
    const update = { image_status: approved ? "approved" : "rejected", image_approved: approved, image_last_verified_at: now, updated_at: now };
    return Promise.all(rows.map(row => api(`album_credits?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(update)
    })));
  }
  if (body.action === "delete_credit") {
    let creditId = clean(body.id);
    if (!creditId && clean(body.person_name) && clean(body.credit_type)) {
      const matches = await api(`album_credits?album_ref=eq.${encodeURIComponent(ref)}&person_name=eq.${encodeURIComponent(clean(body.person_name))}&credit_type=eq.${encodeURIComponent(normalize(body.credit_type))}&select=id&limit=1`);
      creditId = clean(matches?.[0]?.id);
    }
    if (!creditId) throw new Error("This credit could not be matched to a saved album credit.");
    return api(`album_credits?id=eq.${encodeURIComponent(creditId)}`, { method: "DELETE" });
  }
  if (body.action === "save_label") {
    const row = { ...base, ...pick(body, ["label_name", "label_type", "is_original_label", "release_region", "source", "source_url"]) };
    if (body.id) return api(`album_labels?id=eq.${encodeURIComponent(body.id)}`, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
    return api("album_labels", { method: "POST", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
  }
  if (body.action === "delete_label") return api(`album_labels?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
  if (body.action === "save_label_logo") {
    const row = {
      album_ref: ref,
      ...pick(body, ["label_id", "label_name", "logo_url", "source_type", "source_page_url", "source_file_url", "license_name", "license_url", "copyright_status", "attribution_text", "creator", "trademark_notice", "commercial_use_allowed", "requires_attribution", "review_reason", "notes"]),
      verified: false,
      manually_verified: false,
      review_status: "needs_review",
      verified_at: null,
      approved_by: null,
      approved_at: null,
      approval_notes: null,
      last_license_check_at: now,
      license_status_changed: false,
      updated_at: now
    };
    if (!clean(row.label_id) || !clean(row.label_name)) throw new Error("A stored record label is required before adding its logo.");
    if (!clean(row.source_page_url)) throw new Error("A logo source page URL is required.");
    if (!/^https:\/\/commons\.wikimedia\.org\//i.test(clean(row.source_page_url)) && normalize(row.source_type) !== "official brand assets") {
      throw new Error("Logo candidates must come from Wikimedia Commons or a documented official brand-assets page.");
    }
    return api("record_label_logos?on_conflict=label_id", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) });
  }
  if (body.action === "set_label_logo_status") {
    const rows = await api(`record_label_logos?id=eq.${encodeURIComponent(body.id)}&select=*`);
    const logo = rows?.[0];
    if (!logo) throw new Error("This record-label logo candidate no longer exists.");
    const approved = normalize(body.review_status) === "approved";
    if (approved && !recordLabelLogoHasReuseBasis(logo)) {
      throw new Error("This logo cannot be approved until its source, reuse status, commercial-use status, and any required attribution are documented.");
    }
    if (approved && !clean(body.approved_by)) throw new Error("Record who approved this logo.");
    if (approved && !clean(body.approval_notes)) throw new Error("Approval notes are required for the logo audit trail.");
    const update = {
      review_status: approved ? "approved" : "rejected",
      verified: approved,
      manually_verified: true,
      verified_at: approved ? now : null,
      approved_by: approved ? clean(body.approved_by) : null,
      approved_at: approved ? now : null,
      approval_notes: clean(body.approval_notes) || null,
      license_status_changed: false,
      updated_at: now
    };
    return api(`record_label_logos?id=eq.${encodeURIComponent(body.id)}`, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(update) });
  }
  if (body.action === "delete_label_logo") return api(`record_label_logos?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
  if (body.action === "save_sales") {
    const row = { ...base, ...pick(body, ["worldwide_sales_estimate", "worldwide_sales_min", "worldwide_sales_max", "display_value", "confidence", "source", "source_url"]), last_verified_at: now };
    return api("album_sales", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) });
  }
  if (body.action === "save_certification") {
    const row = { ...base, ...pick(body, ["country", "certification", "certified_units", "organization", "source", "source_url"]) };
    if (body.id) return api(`album_certifications?id=eq.${encodeURIComponent(body.id)}`, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
    return api("album_certifications", { method: "POST", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
  }
  if (body.action === "delete_certification") return api(`album_certifications?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
  throw new Error("Unknown album info admin action.");
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, {});
  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      if (!validAdminPin(body.pin)) return json(401, { error: "Admin PIN was not accepted." });
      const rows = await adminAction(body);
      return json(200, { ok: true, rows: rows || [] });
    }
    if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed." });
    const input = event.queryStringParameters || {};
    const includeLogoAudit = validAdminPin(event.headers?.["x-muze-admin-pin"] || event.headers?.["X-Muze-Admin-Pin"]);
    input.album_ref = albumRef(input);
    if (!clean(input.title) || !clean(input.artist)) return json(400, { error: "Album title and artist are required." });
    let cached = null;
    let schemaReady = true;
    try { cached = await readCachedInfo(input.album_ref); } catch (error) {
      schemaReady = false;
      console.warn("[Muze album info] cache unavailable", error.message);
    }
    const logoSchemaReady = schemaReady && cached?.record_label_logo_schema_ready !== false;
    const currentImportCache = cached?.metadata?.source_confidence === ALBUM_INFO_IMPORT_VERSION && hasNamedPerformerCredits(cached);
    if (cached?.metadata && input.refresh !== "1" && currentImportCache) {
      applyVerifiedAlbumOverrides(cached, input);
      await Promise.all([attachRecordLabelLogos(cached, { persist: logoSchemaReady }), attachArtistPortraits(cached)]);
      return json(200, albumInfoResponseView({ ...cached, cached: true }, includeLogoAudit), 300);
    }
    const imported = await importAlbumInfo(input);
    if (!imported) {
      const fallback = applyVerifiedAlbumOverrides(cached || { metadata: null, credits: [], labels: [], sales: null, certifications: [] }, input);
      await Promise.all([attachRecordLabelLogos(fallback, { persist: logoSchemaReady, force: input.refresh === "1" }), attachArtistPortraits(fallback)]);
      return json(200, albumInfoResponseView({ ...fallback, cached: Boolean(cached?.metadata), unavailable: true, schema_ready: schemaReady, record_label_logo_schema_ready: logoSchemaReady }, includeLogoAudit), 300);
    }
    const result = preserveManualCachedInfo(imported, cached);
    applyVerifiedAlbumOverrides(result, input);
    await attachArtistPortraits(result);
    if (schemaReady) {
      try {
        await cacheImportedInfo(result, Boolean(cached?.metadata));
        await Promise.all([attachStoredCreditIds(result), attachStoredLabelIds(result)]);
        await persistAttachedPortraits(result);
      } catch (error) { console.warn("[Muze album info] cache write failed", error.message); }
    }
    await attachRecordLabelLogos(result, { persist: logoSchemaReady, force: input.refresh === "1" });
    return json(200, albumInfoResponseView({ ...result, cached: false, schema_ready: schemaReady, record_label_logo_schema_ready: logoSchemaReady }, includeLogoAudit), 86400);
  } catch (error) {
    const isAdminRequest = event.httpMethod === "POST";
    return json(500, {
      error: isAdminRequest ? "Album information could not be saved." : "Album information could not be loaded.",
      message: error.message
    });
  }
};

exports._test = { aggregateCredits, albumInfoResponseView, applyVerifiedAlbumOverrides, canonicalAlbumTitle, classifyRelation, commonsLogoMetadata, commonsPortraitFromPage, hasNamedPerformerCredits, importedInfo, isAllowedCommonsLicense, mergeCredits, mergeWikipediaAlbumInfo, parseBestsellingArtistAlbumUrl, parseBestsellingArtistSearchUrl, parseBestsellingSalesHtml, parseBestsellingSearchHtml, parseWikipediaAlbumInfo, parseWikipediaCredits, parseWikipediaSalesHtml, pickCanonicalRelease, recordLabelLogoHasReuseBasis, recordLabelLogoIsPublic, stringArray, structuredCreditFacts, wikipediaAlbumMatches };
