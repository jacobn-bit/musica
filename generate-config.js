const fs = require("fs");

function currentValue(name) {
  if (!fs.existsSync("config.js")) return "";
  const text = fs.readFileSync("config.js", "utf8");
  const match = text.match(new RegExp(`${name}\\s*:\\s*["']([^"']*)["']`));
  return match ? match[1] : "";
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || currentValue("SUPABASE_URL");
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || currentValue("SUPABASE_ANON_KEY");
const adminPin = process.env.NETLIFY === "true"
  ? ""
  : process.env.VITE_ADMIN_PIN || process.env.ADMIN_PIN || process.env.MUSICA_ADMIN_PIN || process.env.NEXT_PUBLIC_ADMIN_PIN || currentValue("VITE_ADMIN_PIN") || currentValue("ADMIN_PIN") || currentValue("MUSICA_ADMIN_PIN") || currentValue("NEXT_PUBLIC_ADMIN_PIN");

if (!url || !anonKey) {
  console.warn("Supabase config was not generated because URL or anon key is missing.");
  process.exit(0);
}

fs.writeFileSync(
  "config.js",
  `window.MUSICA_CONFIG = {\n  SUPABASE_URL: ${JSON.stringify(url)},\n  SUPABASE_ANON_KEY: ${JSON.stringify(anonKey)},\n  VITE_ADMIN_PIN: ${JSON.stringify(adminPin)}\n};\n`
);

console.log("Generated config.js for Supabase Auth.");
