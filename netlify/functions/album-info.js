"use strict";

const crypto = require("crypto");
const MUSICBRAINZ_ROOT = "https://musicbrainz.org/ws/2";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "Muze/1.0 (album information; https://themuze.app)";
const WIKIPEDIA_IMPORT_VERSION = "wikipedia-personnel-v4";

function json(statusCode, body, cacheSeconds = 0) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
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
    const error = new Error(text || `Supabase request failed (${response.status}).`);
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
  return {
    metadata: metadata?.[0] || null,
    credits: credits || [],
    labels: labels || [],
    sales: sales?.[0] || null,
    certifications: certifications || []
  };
}

async function musicBrainzJson(path) {
  const response = await timedFetch(`${MUSICBRAINZ_ROOT}${path}`, {
    headers: { "Accept": "application/json", "User-Agent": USER_AGENT }
  }, 9000);
  if (!response.ok) throw new Error(`MusicBrainz request failed (${response.status}).`);
  return response.json();
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

function parseWikipediaAlbumInfo(wikitext, context = {}) {
  const released = wikipediaDate(wikipediaInfoboxField(wikitext, "released"));
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
    source_confidence: hasNamedPerformers ? WIKIPEDIA_IMPORT_VERSION : "wikipedia-metadata-only"
  };
  if (released) {
    metadata.original_release_date = released;
    metadata.release_year = Number(String(released).match(/\b(19|20)\d{2}\b/)?.[0]) || null;
  }
  if (albumTypes[type]) metadata.album_type = albumTypes[type];
  if (runtime) metadata.total_runtime_ms = runtime;
  return { metadata, labels, credits };
}

function wikipediaCreditType(section, roles) {
  const text = normalize(`${section} ${roles}`);
  if (/producer|engineer|mix|master|recording|arrang|orchestrat|art direction/.test(text)) return "production";
  if (/songwriter|written by|composer|lyricist/.test(text)) return "songwriting";
  return "performer";
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

function wikipediaCreditRow(personName, roles, subsection, context, sortOrder) {
  const name = clean(personName).replace(/^['"\s]+|['"\s]+$/g, "");
  const role = clean(roles);
  if (!name || !role || name.length > 100 || /^["']|\b(track|song|side|session musicians?|orchestra|section)\b/i.test(name)) return null;
  const creditType = wikipediaCreditType(subsection, role);
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
  sectionText.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    const subheading = /^===+\s*(.*?)\s*===+\s*$/.exec(trimmed);
    if (subheading) { subsection = stripWikiMarkup(subheading[1]); definitionName = ""; return; }
    const boldSubheading = /^'{3}\s*(.*?)\s*'{3}\s*$/.exec(trimmed);
    if (boldSubheading) { subsection = stripWikiMarkup(boldSubheading[1]); definitionName = ""; return; }
    const definition = /^;\s*(.+)$/.exec(trimmed);
    if (definition) { definitionName = stripWikiMarkup(definition[1]); return; }
    const definitionRole = /^:\s*(.+)$/.exec(trimmed);
    if (definitionRole && definitionName) {
      const row = wikipediaCreditRow(definitionName, stripWikiMarkup(definitionRole[1]), subsection, context, rows.length);
      if (row) rows.push(row);
      definitionName = "";
      return;
    }
    const tableRow = /^\|\s*(.*?)\s*\|\|\s*(.+)$/.exec(trimmed);
    if (tableRow) {
      const row = wikipediaCreditRow(stripWikiMarkup(tableRow[1]), stripWikiMarkup(tableRow[2]), subsection, context, rows.length);
      if (row) rows.push(row);
      return;
    }
    if (!/^\s*[*#]+/.test(line)) return;
    const item = stripWikiMarkup(line.replace(/^\s*[*#]+\s*/, ""));
    const parts = item.split(/\s+(?:-|\u2013|\u2014)\s+/);
    if (parts.length < 2) {
      if (/production|technical|engineering/i.test(subsection)) rows.push(...wikipediaProductionRows(item, context, rows.length));
      return;
    }
    const row = wikipediaCreditRow(parts.shift(), parts.join(" - "), subsection, context, rows.length);
    if (row) rows.push(row);
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

function mergeLabels(...lists) {
  const merged = new Map();
  lists.flat().forEach(row => {
    if (!row?.label_name) return;
    const key = normalize(row.label_name);
    if (!merged.has(key)) merged.set(key, { ...row });
  });
  return [...merged.values()].map((row, index) => ({ ...row, is_original_label: index === 0 }));
}

function mergeWikipediaAlbumInfo(fallback, wikipedia) {
  if (!wikipedia) return fallback;
  const wikipediaMetadata = Object.fromEntries(Object.entries(wikipedia.metadata || {}).filter(([, value]) => value !== "" && value !== null && value !== undefined));
  const wikipediaCreditTypes = new Set((wikipedia.credits || []).map(row => row.credit_type).filter(Boolean));
  const credits = mergeCredits(wikipedia.credits || [], fallback?.credits || []).filter(row => {
    if (!wikipediaCreditTypes.has(row.credit_type)) return true;
    return normalize(row.source).includes("wikipedia");
  });
  return {
    ...fallback,
    metadata: { ...(fallback?.metadata || {}), ...wikipediaMetadata },
    credits,
    labels: mergeLabels(wikipedia.labels || [], fallback?.labels || []),
    sales: fallback?.sales || null,
    certifications: fallback?.certifications || []
  };
}

async function wikipediaJson(params) {
  const query = new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  const response = await timedFetch(`${WIKIPEDIA_API}?${query}`, { headers: { "User-Agent": USER_AGENT } }, 7000);
  if (!response.ok) throw new Error(`Wikipedia API request failed (${response.status}).`);
  return response.json();
}

function wikipediaAlbumMatches(wikitext, input) {
  if (!/\{\{\s*Infobox\s+album\b/i.test(String(wikitext || ""))) return false;
  const listedArtist = normalize(stripWikiMarkup(wikipediaInfoboxField(wikitext, "artist")));
  const wantedArtist = normalize(input.artist);
  return !listedArtist || !wantedArtist || listedArtist.includes(wantedArtist) || wantedArtist.includes(listedArtist);
}

async function wikipediaAlbumPageInfo(page, input) {
  if (!page?.pageid) return null;
  const revision = await wikipediaJson({ action: "query", pageids: String(page.pageid), prop: "revisions", rvprop: "content", rvslots: "main" });
  const resolved = revision?.query?.pages?.[0];
  const wikitext = resolved?.revisions?.[0]?.slots?.main?.content || "";
  if (!wikipediaAlbumMatches(wikitext, input)) return null;
  const sourceUrl = page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`;
  return parseWikipediaAlbumInfo(wikitext, { album_ref: albumRef(input), album_id: clean(input.album_id) || null, artist: clean(input.artist), source_url: sourceUrl });
}

async function fetchWikipediaInfo(input) {
  const canonicalTitle = canonicalAlbumTitle(input.title);
  const wanted = normalize(canonicalTitle);
  const exact = await wikipediaJson({ action: "query", titles: canonicalTitle, redirects: "1", prop: "info", inprop: "url" });
  const exactPage = (exact?.query?.pages || []).find(item => !item.missing);
  const exactInfo = await wikipediaAlbumPageInfo(exactPage, input);
  if (exactInfo) return exactInfo;
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
    country: clean(release.country),
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
  return mergeWikipediaAlbumInfo(info || basicImportedInfo(input), wikipedia);
}

function preserveManualCachedInfo(imported, cached) {
  if (!cached) return imported;
  const manualCredits = (cached.credits || []).filter(row => row.manually_verified);
  const manualLabels = (cached.labels || []).filter(row => row.manually_verified);
  return {
    ...imported,
    metadata: cached.metadata?.manually_verified ? cached.metadata : imported.metadata,
    credits: mergeCredits(manualCredits, imported.credits || []),
    labels: mergeLabels(manualLabels, imported.labels || []),
    sales: cached.sales || imported.sales || null,
    certifications: cached.certifications?.length ? cached.certifications : (imported.certifications || [])
  };
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
    const row = { ...base, ...pick(body, ["person_name", "person_id", "image_url", "credit_type", "role", "instrument", "sort_order", "source", "source_url"]) };
    row.credit_type = normalize(row.credit_type);
    if (body.id) return api(`album_credits?id=eq.${encodeURIComponent(body.id)}`, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
    return api("album_credits", { method: "POST", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
  }
  if (body.action === "delete_credit") return api(`album_credits?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
  if (body.action === "save_label") {
    const row = { ...base, ...pick(body, ["label_name", "label_type", "is_original_label", "release_region", "source", "source_url"]) };
    if (body.id) return api(`album_labels?id=eq.${encodeURIComponent(body.id)}`, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
    return api("album_labels", { method: "POST", headers: { "Prefer": "return=representation" }, body: JSON.stringify(row) });
  }
  if (body.action === "delete_label") return api(`album_labels?id=eq.${encodeURIComponent(body.id)}`, { method: "DELETE" });
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
    input.album_ref = albumRef(input);
    if (!clean(input.title) || !clean(input.artist)) return json(400, { error: "Album title and artist are required." });
    let cached = null;
    let schemaReady = true;
    try { cached = await readCachedInfo(input.album_ref); } catch (error) {
      schemaReady = false;
      console.warn("[Muze album info] cache unavailable", error.message);
    }
    const cachedSource = normalize(cached?.metadata?.source);
    const wikipediaLedCache = cachedSource.includes("wikipedia") && cached?.metadata?.source_confidence === WIKIPEDIA_IMPORT_VERSION;
    if (cached?.metadata && input.refresh !== "1" && (cached.metadata.manually_verified || wikipediaLedCache)) return json(200, { ...cached, cached: true }, 300);
    const imported = await importAlbumInfo(input);
    if (!imported) return json(200, { ...(cached || { metadata: null, credits: [], labels: [], sales: null, certifications: [] }), cached: Boolean(cached?.metadata), unavailable: true, schema_ready: schemaReady }, 300);
    if (cached?.metadata && !normalize(imported.metadata?.source).includes("wikipedia")) return json(200, { ...cached, cached: true }, 300);
    const result = preserveManualCachedInfo(imported, cached);
    if (schemaReady) {
      try { await cacheImportedInfo(result, Boolean(cached?.metadata)); } catch (error) { console.warn("[Muze album info] cache write failed", error.message); }
    }
    return json(200, { ...result, cached: false, schema_ready: schemaReady }, 86400);
  } catch (error) {
    return json(500, { error: "Album information could not be loaded.", message: error.message });
  }
};

exports._test = { aggregateCredits, canonicalAlbumTitle, classifyRelation, importedInfo, mergeCredits, mergeWikipediaAlbumInfo, parseWikipediaAlbumInfo, parseWikipediaCredits, pickCanonicalRelease, wikipediaAlbumMatches };
