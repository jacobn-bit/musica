const fs = require("fs");
const path = require("path");

function readEnv(file) {
  return Object.fromEntries(
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#") && line.includes("="))
      .map(line => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")];
      })
  );
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalKey(row) {
  const title = normalize(row.title);
  const artist = normalize(row.artist);
  return artist && title ? `${artist} ${title}` : title || artist;
}

function hasValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function timestamp(row) {
  return Date.parse(row.updated_at || row.generated_at || 0) || 0;
}

function mergeRows(rows) {
  const merged = {};
  [...rows].sort((left, right) => timestamp(left) - timestamp(right)).forEach(row => {
    Object.entries(row).forEach(([field, value]) => {
      if (field === "manual_override") return;
      if (hasValue(value) || !Object.prototype.hasOwnProperty.call(merged, field)) merged[field] = value;
    });
    if (row.manual_override) merged.manual_override = true;
    else if (!Object.prototype.hasOwnProperty.call(merged, "manual_override")) merged.manual_override = false;
  });
  merged.album_key = canonicalKey(merged);
  return merged;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const env = readEnv(path.join(__dirname, "..", ".env"));
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env");
  const headers = { "Content-Type": "application/json", apikey: key, "User-Agent": "muze-server-maintenance/1.0" };
  if (key.split(".").length === 3) headers.Authorization = `Bearer ${key}`;
  const request = async (route, options = {}) => {
    const response = await fetch(`${url}/rest/v1/${route}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `Supabase request failed (${response.status})`);
    return text ? JSON.parse(text) : null;
  };

  const rows = await request("album_overviews?select=*");
  const groups = new Map();
  rows.forEach(row => {
    const identity = `${normalize(row.artist)}::${normalize(row.title)}`;
    if (!normalize(row.title)) return;
    if (!groups.has(identity)) groups.set(identity, []);
    groups.get(identity).push(row);
  });

  const repairs = [];
  for (const groupRows of groups.values()) {
    const expectedKey = canonicalKey(groupRows[0]);
    const canonical = groupRows.find(row => row.album_key === expectedKey);
    const merged = mergeRows(groupRows);
    const missingFields = Object.keys(merged).filter(field =>
      field === "manual_override"
        ? merged.manual_override === true && canonical?.manual_override !== true
        : hasValue(merged[field]) && !hasValue(canonical?.[field])
    );
    if (groupRows.length > 1 && missingFields.length) repairs.push({ expectedKey, canonical, merged, rows: groupRows, missingFields });
  }

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    duplicateGroups: repairs.length,
    repairs: repairs.map(item => ({
      album_key: item.expectedKey,
      title: item.merged.title,
      artist: item.merged.artist,
      source_keys: item.rows.map(row => row.album_key),
      restored_fields: item.missingFields
    }))
  }, null, 2));

  if (!apply) return;
  for (const repair of repairs) {
    const payload = {};
    repair.missingFields.forEach(field => { payload[field] = repair.merged[field]; });
    payload.album_key = repair.expectedKey;
    payload.title = repair.merged.title;
    payload.artist = repair.merged.artist;
    payload.updated_at = new Date().toISOString();
    await request("album_overviews", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
    const verified = await request(`album_overviews?album_key=eq.${encodeURIComponent(repair.expectedKey)}&select=*&limit=1`);
    const saved = verified?.[0];
    const failed = repair.missingFields.filter(field => hasValue(repair.merged[field]) && !hasValue(saved?.[field]));
    if (failed.length) throw new Error(`${repair.expectedKey} failed verification for: ${failed.join(", ")}`);
  }
  console.log(`Verified ${repairs.length} canonical overview repair${repairs.length === 1 ? "" : "s"}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
