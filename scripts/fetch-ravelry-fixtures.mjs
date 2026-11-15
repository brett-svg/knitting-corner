// Refreshes lib/__fixtures__/ravelry-*.json from the live Ravelry API.
// The fixtures back the tests and demo mode (no DATABASE_URL), so the
// suggestion UI works offline.
//
//   RAVELRY_USERNAME=… RAVELRY_PASSWORD=… node scripts/fetch-ravelry-fixtures.mjs
//
// Pattern details are trimmed to the fields lib/ravelry.ts reads, so the
// file stays small. The search response is saved untouched.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../lib/__fixtures__/", import.meta.url));
const { RAVELRY_USERNAME: U, RAVELRY_PASSWORD: P } = process.env;
if (!U || !P) throw new Error("Set RAVELRY_USERNAME and RAVELRY_PASSWORD");
const AUTH = "Basic " + Buffer.from(`${U}:${P}`).toString("base64");

async function get(path, params) {
  const qs = new URLSearchParams(params).toString().replace(/%2B/g, "+").replace(/%7C/g, "|");
  const res = await fetch(`https://api.ravelry.com${path}?${qs}`, { headers: { Authorization: AUTH } });
  if (!res.ok) throw new Error(`${path}?${qs} → ${res.status}`);
  return res.json();
}

// Same groups as RAVELRY_WEIGHTS in lib/ravelry.ts.
const WEIGHTS = {
  Lace: "thread|cobweb|lace",
  Fingering: "light-fingering|fingering",
  Sport: "sport",
  DK: "dk",
  Worsted: "worsted",
  Aran: "aran",
  Bulky: "bulky|super-bulky|jumbo",
};

const searches = [];
for (const weight of Object.values(WEIGHTS)) {
  const base = { weight, yardage: "|1600", sort: "popularity", craft: "knitting" };
  searches.push({ ...base, page_size: "24" });
  searches.push({ ...base, availability: "free", page_size: "10" });
}
// "Made with this yarn" for the demo stash (Malabrigo Rios, Brooklyn Tweed Shelter).
searches.push({ yarn: "Malabrigo Rios", sort: "popularity", craft: "knitting", page_size: "24" });
searches.push({ yarn: "Brooklyn Tweed Shelter", sort: "popularity", craft: "knitting", page_size: "24" });

const ids = new Set();
for (const params of searches) {
  const res = await get("/patterns/search.json", params);
  for (const p of res.patterns) ids.add(p.id);
}
// One untouched search response, as Ravelry sends it.
const sampleParams = { weight: "worsted", yardage: "|840", sort: "popularity", craft: "knitting", page_size: "4" };
const sample = { params: sampleParams, response: await get("/patterns/search.json", sampleParams) };

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o?.[k] !== undefined).map((k) => [k, o[k]]));
const trimCategory = (c) => c && { permalink: c.permalink, name: c.name, parent: trimCategory(c.parent) };

const details = {};
const all = [...ids];
for (let i = 0; i < all.length; i += 50) {
  const res = await get("/patterns.json", { ids: all.slice(i, i + 50).join("+") });
  for (const p of Object.values(res.patterns)) {
    details[p.id] = {
      ...pick(p, [
        "id", "name", "permalink", "url", "free", "price", "currency", "currency_symbol",
        "yardage", "yardage_max", "gauge_description", "projects_count",
      ]),
      yarn_weight: p.yarn_weight ? { name: p.yarn_weight.name } : null,
      craft: p.craft ? { name: p.craft.name, permalink: p.craft.permalink } : null,
      pattern_author: p.pattern_author ? { name: p.pattern_author.name, permalink: p.pattern_author.permalink } : null,
      photos: (p.photos ?? []).slice(0, 1).map((ph) => pick(ph, ["small_url", "medium_url"])),
      pattern_needle_sizes: (p.pattern_needle_sizes ?? []).map((n) => pick(n, ["name", "metric", "us", "knitting", "crochet"])),
      pattern_categories: (p.pattern_categories ?? []).map(trimCategory),
      packs: (p.packs ?? []).map((pk) => ({ yarn_id: pk.yarn_id, yarn: pk.yarn ? pick(pk.yarn, ["id", "permalink", "name", "yarn_company_name"]) : null })),
    };
  }
}

const fetchedAt = new Date().toISOString();
writeFileSync(OUT + "ravelry-pattern-search.json", JSON.stringify({ fetchedAt, ...sample }, null, 1) + "\n");
writeFileSync(OUT + "ravelry-patterns.json", JSON.stringify({ fetchedAt, patterns: details }) + "\n");
console.log(`saved ${Object.keys(details).length} patterns from ${searches.length} searches`);
