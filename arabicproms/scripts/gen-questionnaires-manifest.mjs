import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "public", "questionnaires");
const OUT = path.join(DIR, "manifest.json");

if (!fs.existsSync(DIR)) {
  console.error("Missing folder:", DIR);
  process.exit(1);
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.toLowerCase().endsWith(".csv"))
  .sort((a, b) => a.localeCompare(b, "en"));

const manifest = { files };

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2), "utf8");
console.log(`✅ Wrote ${OUT} with ${files.length} CSV file(s).`);