"use strict";

const fs = require("fs");

const required = [
  "index.html",
  "styles.css",
  "styles-mobile-20260830-1822.css",
  "tracks-cohesion.css",
  "app-final-spotify.js",
  "netlify.toml",
  "netlify/functions/editorial-review.js",
  "netlify/functions/prompts/muze-editorial-prompt.js",
  "supabase/migrations/202607290001_muze_editorial_engine.sql"
];
const missing = required.filter(file => !fs.existsSync(file));
if (missing.length) {
  console.error(`Build input missing: ${missing.join(", ")}`);
  process.exit(1);
}
const html = fs.readFileSync("index.html", "utf8");
const referencedAssets = [
  "app-final-spotify.js",
  "styles.css",
  "styles-mobile-20260830-1822.css",
  "tracks-cohesion.css"
];
const unreferenced = referencedAssets.filter(file => !html.includes(file));
if (unreferenced.length) {
  console.error(`index.html does not reference production assets: ${unreferenced.join(", ")}`);
  process.exit(1);
}
console.log("Static production inputs are present.");
