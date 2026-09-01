const fs = require("fs");

function currentValue(name) {
  if (!fs.existsSync("config.js")) return "";
  const text = fs.readFileSync("config.js", "utf8");
  const match = text.match(new RegExp(`${name}\\s*:\\s*["']([^"']*)["']`));
  return match ? match[1] : "";
}

function usableValue(value) {
  const text = String(value || "").trim();
  return text && !/^\*+/.test(text) ? text : "";
}

const url = usableValue(process.env.VITE_SUPABASE_URL) || usableValue(process.env.SUPABASE_URL) || usableValue(currentValue("SUPABASE_URL"));
const anonKey = usableValue(process.env.VITE_SUPABASE_ANON_KEY) || usableValue(process.env.SUPABASE_ANON_KEY) || usableValue(currentValue("SUPABASE_ANON_KEY"));
const adminPin = process.env.NETLIFY === "true"
  ? ""
  : usableValue(process.env.VITE_ADMIN_PIN) || usableValue(process.env.ADMIN_PIN) || usableValue(process.env.MUSICA_ADMIN_PIN) || usableValue(process.env.NEXT_PUBLIC_ADMIN_PIN) || usableValue(currentValue("VITE_ADMIN_PIN")) || usableValue(currentValue("ADMIN_PIN")) || usableValue(currentValue("MUSICA_ADMIN_PIN")) || usableValue(currentValue("NEXT_PUBLIC_ADMIN_PIN"));

if (!url || !anonKey) {
  console.warn("Supabase config was not generated because URL or anon key is missing.");
  process.exit(0);
}

fs.writeFileSync(
  "config.js",
  `window.MUSICA_CONFIG = {\n  SUPABASE_URL: ${JSON.stringify(url)},\n  SUPABASE_ANON_KEY: ${JSON.stringify(anonKey)},\n  VITE_ADMIN_PIN: ${JSON.stringify(adminPin)}\n};\n`
);

console.log("Generated config.js for Supabase Auth.");
