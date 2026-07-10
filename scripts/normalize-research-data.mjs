import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve(process.argv[2] || "../g7-history-research/summits.json");
const output = resolve(process.argv[3] || "data/summits.json");
const raw = JSON.parse(await readFile(input, "utf8"));

const themeRules = [
  ["Macroeconomic coordination", /econom|growth|inflation|unemployment|\bjobs?\b|fiscal|monetary|interest rate|finance|recovery|exchange-rate|deficit|employment/i],
  ["Trade", /trade|protection|\bmarket|GATT|WTO|investment|supply.chain|tariff|commerce|globalization/i],
  ["Energy and resources", /energy|\boil\b|\bcoal\b|nuclear power|critical.?mineral|resource|commodit|natural gas/i],
  ["Development and global partnerships", /develop|\bdebt\b|Africa|food|poverty|\baid\b|HIPC|global partnership|infrastructure|North.South|Millennium Development|Sustainable Development Goal|nutrition/i],
  ["Peace and security", /security|terror|arms|conflict|\bwar\b|Ukraine|Russia|Soviet|Iran|North Korea|Syria|Libya|non.?proliferation|proliferation|sanction|hijack|hostage|\bcrime\b|\bdrugs?\b|migration|refugee|Afghanistan|Bosnia|Kosovo|Gaza|Middle East/i],
  ["Global health", /health|disease|AIDS|HIV|pandemic|COVID|Ebola|cancer|polio|maternal|antimicrobial|infectious|vaccine/i],
  ["Technology", /technology|digital|artificial intelligence|\bAI\b|cyber|internet|information society|quantum|innovation/i],
  ["Democracy and society", /democra|human rights?|gender|women|girls|social|freedom|inequal|inclusi|foreign interference|transnational repression|education/i],
  ["Environment", /environment|climate|biodiversity|ocean|pollution|emission|warming|decarbon|wildfire|ozone/i],
  ["Institutional governance", /\bIMF\b|World Bank|OECD|\bGATT\b|\bWTO\b|United Nations|\bUN\b|multilateral|surveillance|financial architecture|accountability|governance|international institutions/i]
];

const gerunds = new Map(Object.entries({
  coordinate: "coordinating", improve: "improving", reduce: "reducing", keep: "keeping",
  sustain: "sustaining", avoid: "avoiding", complete: "completing", adopt: "adopting",
  set: "setting", finish: "finishing", condemn: "condemning", make: "making",
  implement: "implementing", address: "addressing", restore: "restoring", limit: "limiting",
  strengthen: "strengthening", recognize: "recognizing", seek: "seeking", maintain: "maintaining",
  pursue: "pursuing", launch: "launching", respond: "responding", promote: "promoting",
  create: "creating", offer: "offering", increase: "increasing", support: "supporting",
  forge: "forging", build: "building", advance: "advancing", scale: "scaling",
  endorse: "endorsing", protect: "protecting", back: "backing", issue: "issuing",
  manage: "managing", mobilize: "mobilizing", deepen: "deepening", use: "using",
  reaffirm: "reaffirming", expand: "expanding", fight: "fighting", defend: "defending",
  accelerate: "accelerating", secure: "securing", diversify: "diversifying", act: "acting",
  continue: "continuing", deliver: "delivering", enhance: "enhancing", agree: "agreeing",
  integrate: "integrating", combat: "combating", counter: "countering", commit: "committing",
  establish: "establishing", prevent: "preventing", end: "ending",
  impose: "imposing", invest: "investing", resist: "resisting", consolidate: "consolidating",
  lower: "lowering", conclude: "concluding", revive: "reviving"
}));

function gerundPhrase(value) {
  const text = String(value || "").replace(/[. ]+$/, "");
  const match = text.match(/^([A-Za-z-]+)(.*)$/);
  if (!match) return text.toLowerCase();
  const replacement = gerunds.get(match[1].toLowerCase());
  let phrase = replacement ? replacement + match[2] : text[0].toLowerCase() + text.slice(1);
  phrase = phrase.replace(/\band ([A-Za-z-]+)/g, (whole, verb) => gerunds.has(verb.toLowerCase()) ? `and ${gerunds.get(verb.toLowerCase())}` : whole);
  return phrase;
}

function joinNatural(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join("; ")}; and ${items.at(-1)}`;
}

function eraFor(year) {
  if (year === 1975) return "Founding group";
  if (year <= 1990) return "Established G7";
  if (year <= 1997) return "Post-Cold War transition";
  if (year <= 2013) return "G8 period";
  if (year <= 2019) return "Renewed G7";
  return "Crisis-era G7";
}

function formatFor(row) {
  if (row.year === 1975) return "G6";
  if (row.year >= 1994 && row.year <= 1997) return "G7/G8 transition";
  if (row.year >= 1998 && row.year <= 2013) return "G8";
  return "G7";
}

function nameFor(row) {
  const overrides = { 2003: "Évian", 2020: "United States Virtual", 2021: "Carbis Bay", 2022: "Elmau", 2024: "Apulia", 2026: "Évian" };
  if (overrides[row.year]) return overrides[row.year];
  return (row.summit_label || row.summit_title)
    .replace(/G7 Leaders' Meeting on COVID-19/i, "")
    .replace(/G7 Summit|G8 Summit|Summit of the Eight|Summit/gi, "")
    .replace(/^\s*of the Arch\s*\/\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*\/.*$/, "");
}

function tierFor(document) {
  if (typeof document.tier === "number") return document.tier;
  if (document.tier === "authoritative_archive") return 2;
  return document.provenance === "archived_official_text" ? 2 : 1;
}

function publisherFor(document) {
  if (document.publisher) return document.publisher;
  if (document.provenance === "archived_official_text") return "G7 Research Group, University of Toronto";
  const url = document.url || "";
  if (url.includes("elysee.fr")) return "Élysée, Government of France";
  if (url.includes("g7.canada.ca") || url.includes("international.gc.ca")) return "Government of Canada";
  if (url.includes("whitehouse.archives.gov")) return "White House historical archive";
  if (url.includes("consilium.europa.eu")) return "Council of the European Union";
  return document.provenance === "official_host_institution" ? "Official host institution" : "Official host government";
}

function typeFor(title) {
  if (/chair.?s summary/i.test(title)) return "Chair’s summary";
  if (/communiqu/i.test(title)) return "Communiqué";
  if (/declaration/i.test(title)) return "Leaders’ declaration";
  if (/statement/i.test(title)) return "Leaders’ statement";
  if (/action plan|charter|initiative/i.test(title)) return "Action instrument";
  if (/dossier|archive|summit documents/i.test(title)) return "Document collection";
  return "Summit record";
}

function countryFor(row) {
  if (row.host_country === "West Germany") return "Germany";
  if (row.year === 2014) return "European Union";
  return row.host_country;
}

function statusFor(row) {
  if (row.year === 2014) return "replacement";
  if (row.year === 2020) return "virtual";
  return "held";
}

const evian2026Documents = [
  ["Official Évian Summit Dossier", "https://www.elysee.fr/en/emmanuel-macron/2026-g7-summit-in-evian", "Document collection"],
  ["G7 Leaders’ Declaration on Securing Critical Minerals Supply Chains", "https://www.elysee.fr/en/G7evian/2026/06/17/g7-leaders-declaration-on-securing-supply-chains-for-critical-minerals", "Leaders’ declaration"],
  ["Leaders’ Statement for More Balanced, Durable and Resilient Growth", "https://www.elysee.fr/en/G7evian/2026/06/17/leaders-statement-for-a-more-balanced-durable-resilient-growth", "Leaders’ statement"],
  ["G7 Leaders’ Statement on Geopolitical Issues", "https://www.elysee.fr/en/G7evian/2026/06/17/g7-leaders-statement-on-geopolitical-issues", "Leaders’ statement"],
  ["Leaders’ Declaration on Mutually Beneficial International Partnerships", "https://www.elysee.fr/en/G7evian/2026/06/16/leaders-declaration-on-mutually-beneficial-international-partnerships", "Leaders’ declaration"],
  ["Leaders’ Call on a Safer Digital Space for Minors", "https://www.elysee.fr/en/G7evian/2026/06/17/leaders-call-on-a-safer-digital-space-for-minors", "Leaders’ call"],
  ["Leaders’ Call on the Fight Against Cancer", "https://www.elysee.fr/en/G7evian/2026/06/16/leaders-call-on-the-fight-against-cancer", "Leaders’ call"],
  ["Leaders’ Call for a Coordinated Response to the Bundibugyo Ebola Outbreak", "https://www.elysee.fr/en/G7evian/2026/06/16/leaders-call-for-a-coordinated-response-to-the-bundibugyo-ebola-outbreak", "Leaders’ call"],
  ["Leaders’ Declaration on Tackling Migrant Smuggling", "https://www.elysee.fr/en/G7evian/2026/06/17/leaders-declaration-on-tackling-migrant-smuggling", "Leaders’ declaration"],
  ["Leaders’ Declaration on the Fight Against Drug Trafficking", "https://www.elysee.fr/en/G7evian/2026/06/17/leaders-declaration-on-the-fight-against-drug-trafficking", "Leaders’ declaration"]
].map(([title, url, type]) => ({ title, url, publisher: "Élysée, Government of France", tier: 1, type }));

const summits = raw.summits.map((row) => {
  const detailed = row.outcomes || row.themes || [];
  const searchText = [...detailed, ...(row.notes || []), row.summit_label].join(" ");
  const suppliedThemes = row.outcomes && row.themes?.every((theme) => themeRules.some(([label]) => label === theme)) ? row.themes : null;
  const policyThemes = suppliedThemes || themeRules.filter(([, pattern]) => pattern.test(searchText)).map(([label]) => label);
  let documents = (row.outcome_documents || row.documents).map((document) => ({
    title: document.title,
    url: document.url.replace(/^http:/, "https:"),
    publisher: publisherFor(document),
    tier: tierFor(document),
    type: document.type ? String(document.type).replaceAll("_", " ") : typeFor(document.title)
  }));
  if (row.year === 2026) documents = evian2026Documents;
  const note = (row.notes || []).join(" ").trim()
    .replace("Elysee", "Élysée")
    .replace("nine leaders' declarations", "nine leaders’ texts")
    .replace("omnibus communique", "omnibus communiqué");
  const summaryItems = detailed.slice(0, 3).map(gerundPhrase);
  const summary = `The leaders’ agenda centered on ${joinNatural(summaryItems)}.`;
  const context = note || `This ${eraFor(row.year).toLowerCase()} meeting paired ${gerundPhrase(detailed[0])} with ${gerundPhrase(detailed[1] || detailed[0])}.`;
  const whyOverrides = {
    2020: row.why_it_matters,
    2026: "The final summit before the 2027 U.S. presidency created a nine-text implementation record spanning security, global imbalances, critical minerals, AI and digital safety, partnerships, health, and transnational crime."
  };
  const why = whyOverrides[row.year] || note || row.why_it_matters || `The ${nameFor(row)} record is useful for tracing how ${policyThemes.slice(0, 2).join(" and ").toLowerCase()} moved across adjacent presidencies.`;
  const archivalOnly = documents.every((document) => document.tier > 1);
  const gaps = [];
  if (!row.venue && row.year !== 2020) gaps.push("A precise leaders’ meeting venue is not registered in this release.");
  if (row.year === 2020) gaps.push("There was no single in-person annual summit; this record uses the March 16 emergency leaders’ videoconference and documents the cancelled Camp David plan.");
  if (archivalOnly) gaps.push("The original host-government page is not registered; the linked official summit text is accessed through the University of Toronto documentary archive.");

  return {
    id: row.id,
    number: row.ordinal || row.number,
    year: row.year,
    name: nameFor(row),
    summit_title: row.summit_label || row.summit_title,
    format: formatFor(row),
    status: statusFor(row),
    host_country: countryFor(row),
    ...(countryFor(row) !== row.host_country ? { host_country_historical: row.host_country } : {}),
    city: row.year === 2003 || row.year === 2026 ? "Évian-les-Bains" : row.city,
    location: row.year === 2003 || row.year === 2026 ? "Évian-les-Bains" : row.city,
    venue: row.year === 1975 ? "Château de Rambouillet" : row.venue,
    dates: { start: row.date_start || row.dates?.start, end: row.date_end || row.dates?.end, display: (row.date_display || row.dates?.display).replace(/(\d)-(\d)/g, "$1–$2") },
    host_leader: row.year === 1975 ? "Valéry Giscard d’Estaing" : row.presidency_leader,
    host_leader_title: row.presidency_leader_title,
    era: eraFor(row.year),
    summary,
    context,
    themes: policyThemes.length ? policyThemes : ["Institutional governance"],
    outcomes: detailed,
    why_it_matters: why,
    documents,
    record_status: archivalOnly ? "Reviewed · archived official text" : "Reviewed · official source linked",
    data_gaps: gaps,
    is_us_host: row.host_country === "United States"
  };
});

const payload = {
  meta: {
    title: "G7 Presidency History: Annual Leaders’ Meetings, 1975–2026",
    purpose: raw.metadata.purpose,
    scope: raw.metadata.coverage,
    updated: raw.metadata.last_verified,
    expected_records: 52,
    latest_completed_summit: raw.metadata.latest_completed_summit,
    source_note: raw.metadata.provenance_note,
    uncertainty_note: raw.metadata.uncertainty_note
  },
  summits
};

await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${summits.length} normalized records to ${output}`);
