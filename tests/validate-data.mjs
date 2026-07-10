import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const payload = JSON.parse(await readFile(join(root, "data/summits.json"), "utf8"));
const summits = payload.summits;

const ERAS = new Set(["Founding group", "Established G7", "Post-Cold War transition", "G8 period", "Renewed G7", "Crisis-era G7"]);
const THEMES = new Set(["Macroeconomic coordination", "Trade", "Energy and resources", "Development and global partnerships", "Peace and security", "Global health", "Technology", "Democracy and society", "Environment", "Institutional governance"]);
const FORMATS = new Set(["G6", "G7", "G8", "G7/G8 transition"]);

assert.equal(payload.meta.expected_records, 52, "meta.expected_records must be 52");
assert.equal(summits.length, 52, "collection must contain exactly 52 annual records");

const years = summits.map((item) => item.year).sort((a, b) => a - b);
assert.deepEqual(years, Array.from({ length: 52 }, (_, index) => 1975 + index), "years must be continuous from 1975 through 2026");
assert.equal(new Set(summits.map((item) => item.id)).size, 52, "IDs must be unique");

for (const summit of summits) {
  assert.match(summit.id, /^\d{4}-[a-z0-9-]+$/, `${summit.year}: invalid stable ID`);
  assert.equal(Number(summit.id.slice(0, 4)), summit.year, `${summit.id}: ID year mismatch`);
  assert.ok(typeof summit.name === "string" && summit.name.trim().length > 1, `${summit.year}: missing name`);
  for (const field of ["summit_title", "host_country", "summary", "context", "why_it_matters", "record_status"]) assert.ok(typeof summit[field] === "string" && summit[field].trim().length > 4, `${summit.year}: missing ${field}`);
  assert.ok(FORMATS.has(summit.format), `${summit.year}: invalid format ${summit.format}`);
  assert.ok(ERAS.has(summit.era), `${summit.year}: invalid era ${summit.era}`);
  assert.ok(summit.dates && summit.dates.display, `${summit.year}: date display is required`);
  assert.ok(Array.isArray(summit.themes) && summit.themes.length > 0, `${summit.year}: themes required`);
  summit.themes.forEach((theme) => assert.ok(THEMES.has(theme), `${summit.year}: noncanonical theme ${theme}`));
  assert.ok(Array.isArray(summit.outcomes) && summit.outcomes.length > 0, `${summit.year}: outcomes required`);
  assert.ok(Array.isArray(summit.documents) && summit.documents.length > 0, `${summit.year}: at least one document required`);
  assert.ok(Array.isArray(summit.data_gaps), `${summit.year}: data_gaps must be an array`);
  for (const document of summit.documents) {
    assert.ok(document.title && document.publisher && document.type, `${summit.year}: incomplete document metadata`);
    assert.match(document.url, /^https:\/\//, `${summit.year}: document URL must use HTTPS`);
    assert.ok([1, 2, 3].includes(document.tier), `${summit.year}: document tier must be 1, 2, or 3`);
  }
}

const usYears = summits.filter((item) => item.is_us_host).map((item) => item.year);
assert.deepEqual(usYears, [1976, 1983, 1990, 1997, 2004, 2012, 2020], "historical U.S. host sequence is incorrect");
assert.equal(summits.find((item) => item.year === 1975).format, "G6", "1975 must retain the G6 format");
assert.equal(summits.find((item) => item.year === 2014).status, "replacement", "2014 must identify the Brussels replacement meeting");
assert.ok(["virtual", "planned-not-held"].includes(summits.find((item) => item.year === 2020).status), "2020 must not appear as a normal in-person summit");
assert.equal(summits.find((item) => item.year === 2026).host_country, "France", "2026 host must be France");

const paris1989 = summits.find((item) => item.year === 1989);
assert.match(paris1989.summary, /Financial Action Task Force \(FATF\)/, "1989 summary must identify the creation of FATF");
assert.ok(paris1989.outcomes.some((item) => /Create the Financial Action Task Force \(FATF\)/.test(item)), "1989 outcomes must include FATF's creation");
assert.ok(paris1989.documents.some((item) => item.url === "https://www.fatf-gafi.org/en/the-fatf/history-of-the-fatf.html" && item.tier === 1), "1989 record must link FATF's official history");

const rambouillet1975 = summits.find((item) => item.year === 1975);
assert.ok(rambouillet1975.institutional_origins, "1975 record must include the pre-summit institutional origins note");
assert.match(rambouillet1975.institutional_origins.synthesis, /Library Group/, "1975 origins note must identify the Library Group");
assert.match(rambouillet1975.institutional_origins.citation, /pp\. 147–48/, "1975 origins note must cite Shultz's printed pages 147–48");
assert.match(rambouillet1975.institutional_origins.citation, /p\. 177/, "1975 origins note must cite Shultz's Japan passage on printed page 177");
assert.match(rambouillet1975.institutional_origins.source_note, /finance-minister G5/, "1975 origins note must distinguish the finance-minister and leaders’ tracks");

for (const htmlName of ["index.html", "origins.html", "briefing.html", "sources.html", "404.html"]) {
  const html = await readFile(join(root, htmlName), "utf8");
  const localRefs = [...html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)]
    .map((match) => match[1])
    .filter((ref) => !/^(https?:|mailto:|data:)/.test(ref) && !ref.endsWith("/"));
  for (const ref of localRefs) await access(join(root, ref));
}

console.log(`Validated ${summits.length} annual summit records, ${summits.reduce((total, item) => total + item.documents.length, 0)} document links, and local page assets.`);
