(function () {
  "use strict";

  const S = window.G7Site;
  const $ = (id) => document.getElementById(id);
  const state = { summits: [], filtered: [], selected: new Set(), view: "cards" };

  const ERA_ORDER = [
    "Founding group",
    "Established G7",
    "Post-Cold War transition",
    "G8 period",
    "Renewed G7",
    "Crisis-era G7"
  ];

  const THEME_ORDER = [
    "Macroeconomic coordination",
    "Trade",
    "Energy and resources",
    "Development and global partnerships",
    "Peace and security",
    "Global health",
    "Technology",
    "Democracy and society",
    "Environment",
    "Institutional governance"
  ];

  function unique(values, preferred) {
    const items = [...new Set(values.filter(Boolean))];
    return preferred ? preferred.filter((item) => items.includes(item)).concat(items.filter((item) => !preferred.includes(item)).sort()) : items.sort();
  }

  function fillSelect(element, values) {
    const current = element.value;
    values.forEach((value) => element.insertAdjacentHTML("beforeend", `<option value="${S.escapeHtml(value)}">${S.escapeHtml(value)}</option>`));
    element.value = current;
  }

  function formatLabel(summit) {
    const format = summit.format || summit.group || "G7";
    return summit.status === "virtual" || summit.status === "planned-not-held" ? `${format} · virtual year` : format;
  }

  function summitSummary(summit) {
    return summit.summary || summit.context || summit.overview || "Summary pending source review.";
  }

  function summitOutcomes(summit) {
    return summit.outcomes || summit.key_outcomes || summit.results || [];
  }

  function summitThemes(summit) {
    return summit.themes || summit.policy_themes || [];
  }

  function renderStats(meta) {
    const usHosts = state.summits.filter(S.isUSHost).length;
    const docCount = state.summits.reduce((total, summit) => total + S.documentsFor(summit).length, 0);
    $("statSummits").textContent = String(state.summits.length);
    $("statYears").textContent = `${Math.min(...state.summits.map((item) => item.year))}–${Math.max(...state.summits.map((item) => item.year))}`;
    $("statUSHosts").textContent = String(usHosts);
    $("statDocuments").textContent = String(docCount);
    $("coverageValue").textContent = `${state.summits.length}/${meta.expected_records || 52}`;
  }

  function hydrateFilters() {
    fillSelect($("hostFilter"), unique(state.summits.map((item) => item.host_country)));
    fillSelect($("eraFilter"), unique(state.summits.map((item) => item.era), ERA_ORDER));
    fillSelect($("formatFilter"), unique(state.summits.map((item) => item.format || item.group)));
    fillSelect($("themeFilter"), unique(state.summits.flatMap(summitThemes), THEME_ORDER));
  }

  function readUrl() {
    const params = new URLSearchParams(location.search);
    $("searchInput").value = params.get("q") || "";
    $("hostFilter").value = params.get("host") || "";
    $("eraFilter").value = params.get("era") || "";
    $("formatFilter").value = params.get("format") || "";
    $("themeFilter").value = params.get("theme") || "";
    $("sortSelect").value = params.get("sort") || "desc";
    state.view = params.get("view") === "table" ? "table" : "cards";
    setView(state.view, false);
    return params.get("summit");
  }

  function searchable(summit) {
    return [
      summit.year, S.summitTitle(summit), summit.name, summit.location, summit.city,
      summit.venue, summit.host_country, summit.host_leader, summit.era, summit.format,
      summitSummary(summit), summit.significance, summit.why_it_matters,
      summit.institutional_origins?.synthesis, summit.institutional_origins?.citation,
      ...summitThemes(summit), ...summitOutcomes(summit),
      ...S.documentsFor(summit).flatMap((item) => [item.title, item.publisher, item.type])
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function applyFilters() {
    const query = $("searchInput").value.trim().toLowerCase();
    const host = $("hostFilter").value;
    const era = $("eraFilter").value;
    const format = $("formatFilter").value;
    const theme = $("themeFilter").value;
    const direction = $("sortSelect").value;

    state.filtered = state.summits.filter((summit) => {
      if (query && !searchable(summit).includes(query)) return false;
      if (host && summit.host_country !== host) return false;
      if (era && summit.era !== era) return false;
      if (format && (summit.format || summit.group) !== format) return false;
      if (theme && !summitThemes(summit).includes(theme)) return false;
      return true;
    }).sort((a, b) => direction === "asc" ? a.year - b.year : b.year - a.year);

    renderResults();
    updateUrl();
  }

  function updateUrl() {
    const params = new URLSearchParams();
    const pairs = [
      ["q", $("searchInput").value.trim()], ["host", $("hostFilter").value],
      ["era", $("eraFilter").value], ["format", $("formatFilter").value],
      ["theme", $("themeFilter").value]
    ];
    pairs.forEach(([key, value]) => { if (value) params.set(key, value); });
    if ($("sortSelect").value !== "desc") params.set("sort", $("sortSelect").value);
    if (state.view !== "cards") params.set("view", state.view);
    const currentSummit = new URLSearchParams(location.search).get("summit");
    if (currentSummit && $("summitDialog").open) params.set("summit", currentSummit);
    const query = params.toString();
    history.replaceState({}, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function tags(themes, limit = 3) {
    const visible = themes.slice(0, limit);
    const rest = themes.length - visible.length;
    return visible.map((theme) => `<span class="tag">${S.escapeHtml(theme)}</span>`).join("") + (rest > 0 ? `<span class="tag">+${rest}</span>` : "");
  }

  function renderCard(summit) {
    const documents = S.documentsFor(summit);
    const selected = state.selected.has(summit.id);
    const classes = ["summit-card", S.isUSHost(summit) ? "is-us-host" : "", ["planned-not-held", "virtual"].includes(summit.status) ? "is-anomaly" : ""].filter(Boolean).join(" ");
    return `<article class="${classes}" data-summit-card="${S.escapeHtml(summit.id)}">
      <div class="card-topline">
        <div class="year-lockup"><strong>${S.escapeHtml(summit.year)}</strong><span>${S.escapeHtml(formatLabel(summit))}</span></div>
        <label class="compare-check"><input type="checkbox" data-compare="${S.escapeHtml(summit.id)}" ${selected ? "checked" : ""}><span>Compare</span></label>
      </div>
      <h3>${S.escapeHtml(S.summitTitle(summit))}</h3>
      <p class="card-place">${S.escapeHtml(S.displayDate(summit))}<br>${S.escapeHtml(S.displayLocation(summit))}</p>
      <p class="card-summary">${S.escapeHtml(summitSummary(summit))}</p>
      <div class="tag-row">${tags(summitThemes(summit))}</div>
      <div class="card-actions"><button type="button" data-open-summit="${S.escapeHtml(summit.id)}">Open evidence card <span aria-hidden="true">→</span></button><span class="source-count">${documents.length} source${documents.length === 1 ? "" : "s"}</span></div>
    </article>`;
  }

  function renderTable(summits) {
    const rows = summits.map((summit) => `<tr>
      <td><button type="button" data-open-summit="${S.escapeHtml(summit.id)}">${S.escapeHtml(summit.year)}</button></td>
      <td><strong>${S.escapeHtml(S.summitTitle(summit))}</strong><br><span class="source-count">${S.escapeHtml(S.displayLocation(summit))}</span></td>
      <td>${S.escapeHtml(summit.host_country)}</td>
      <td>${S.escapeHtml(formatLabel(summit))}</td>
      <td>${S.escapeHtml(summitThemes(summit).join(" · "))}</td>
      <td>${S.documentsFor(summit).length}</td>
      <td><label class="compare-check"><input type="checkbox" data-compare="${S.escapeHtml(summit.id)}" ${state.selected.has(summit.id) ? "checked" : ""}><span>Select</span></label></td>
    </tr>`).join("");
    $("summitTableShell").innerHTML = `<table class="summit-table"><caption class="visually-hidden">Filtered G7 annual summit records</caption><thead><tr><th>Year</th><th>Meeting</th><th>Host</th><th>Format</th><th>Policy threads</th><th>Sources</th><th>Compare</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderResults() {
    $("resultSummary").innerHTML = `<strong>${state.filtered.length}</strong> of ${state.summits.length} annual records shown`;
    $("summitGrid").innerHTML = state.filtered.map(renderCard).join("");
    renderTable(state.filtered);
    const empty = state.filtered.length === 0;
    $("emptyState").classList.toggle("is-hidden", !empty);
    $("summitGrid").classList.toggle("is-hidden", empty || state.view !== "cards");
    $("summitTableShell").classList.toggle("is-hidden", empty || state.view !== "table");
    updateCompareTray();
  }

  function resetFilters() {
    $("filterForm").reset();
    $("sortSelect").value = "desc";
    applyFilters();
  }

  function setView(view, update = true) {
    state.view = view;
    document.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("summitGrid")?.classList.toggle("is-hidden", view !== "cards" || state.filtered.length === 0);
    $("summitTableShell")?.classList.toggle("is-hidden", view !== "table" || state.filtered.length === 0);
    if (update) updateUrl();
  }

  function updateCompare(id, checked) {
    if (checked && state.selected.size >= 3) {
      document.querySelectorAll(`[data-compare="${CSS.escape(id)}"]`).forEach((input) => { input.checked = false; });
      announce("Choose no more than three meetings for comparison.");
      return;
    }
    if (checked) state.selected.add(id); else state.selected.delete(id);
    document.querySelectorAll(`[data-compare="${CSS.escape(id)}"]`).forEach((input) => { input.checked = checked; });
    updateCompareTray();
  }

  function updateCompareTray() {
    const selected = [...state.selected].map((id) => state.summits.find((item) => item.id === id)).filter(Boolean);
    $("compareTray").classList.toggle("is-hidden", selected.length === 0);
    $("compareSelection").textContent = selected.length ? selected.map((item) => `${item.year} ${item.name || S.summitTitle(item)}`).join(" · ") : "Select up to three records.";
    $("openCompare").disabled = selected.length < 2;
  }

  function announce(message) {
    $("resultSummary").textContent = message;
    setTimeout(() => { $("resultSummary").innerHTML = `<strong>${state.filtered.length}</strong> of ${state.summits.length} annual records shown`; }, 2200);
  }

  function documentRecord(document) {
    const badgeClass = Number(document.tier || document.source_tier) === 1 ? "badge-source" : "badge-archive";
    return `<article class="source-record"><span class="badge ${badgeClass}">${S.escapeHtml(S.sourceTierLabel(document))}</span><h4>${S.escapeHtml(document.title || document.label || "Document")}</h4><p>${S.escapeHtml(document.publisher || document.issuer || document.type || "")}</p><a href="${S.escapeHtml(S.safeUrl(document.url))}" target="_blank" rel="noopener">Open record <span aria-hidden="true">↗</span></a></article>`;
  }

  function openSummit(id, push = true) {
    const summit = state.summits.find((item) => item.id === id);
    if (!summit) return;
    const documents = S.documentsFor(summit);
    const outcomes = summitOutcomes(summit);
    const gaps = summit.data_gaps || summit.known_gaps || [];
    const origins = summit.institutional_origins;
    $("summitDetail").innerHTML = `<header class="detail-head">
      <p class="eyebrow">${S.escapeHtml(summit.era || "Annual leaders’ meeting")} · ${S.escapeHtml(formatLabel(summit))}</p>
      <h2 id="dialogTitle">${S.escapeHtml(summit.year)} · ${S.escapeHtml(S.summitTitle(summit))}</h2>
      <p>${S.escapeHtml(summitSummary(summit))}</p>
      <div>${summitThemes(summit).map((theme) => `<span class="badge badge-current">${S.escapeHtml(theme)}</span>`).join("")}</div>
    </header>
    <div class="detail-body">
      <div>
        <section class="detail-section"><h3>Historical setting</h3><p>${S.escapeHtml(summit.context || summit.historical_context || summitSummary(summit))}</p></section>
        ${origins ? `<section class="detail-section origin-source-note"><h3>Origins before the first summit</h3><p>${S.escapeHtml(origins.synthesis)}</p><p class="citation-line"><span class="badge badge-archive">${S.escapeHtml(origins.source_type)}</span>${S.escapeHtml(origins.citation)}</p><p>${S.escapeHtml(origins.source_note)}</p><a class="text-link" href="origins.html">Read the annotated origins narrative <span aria-hidden="true">→</span></a></section>` : ""}
        <section class="detail-section"><h3>Recorded outcomes</h3>${outcomes.length ? `<ul>${outcomes.map((item) => `<li>${S.escapeHtml(item)}</li>`).join("")}</ul>` : '<p class="empty-note">Outcome summary pending document-level review.</p>'}</section>
        <section class="detail-section"><h3>Why this meeting matters for comparison</h3><p>${S.escapeHtml(summit.why_it_matters || summit.significance || "Use the linked record to compare how this presidency framed its agenda and documented consensus.")}</p></section>
        <section class="detail-section"><h3>Summit record and sources</h3>${documents.length ? documents.map(documentRecord).join("") : '<p class="empty-note">No source link is presently registered.</p>'}</section>
        ${gaps.length ? `<section class="detail-section"><h3>Known gaps</h3><ul>${gaps.map((gap) => `<li>${S.escapeHtml(gap)}</li>`).join("")}</ul></section>` : ""}
      </div>
      <aside><dl class="detail-meta">
        <div><dt>Date</dt><dd>${S.escapeHtml(S.displayDate(summit))}</dd></div>
        <div><dt>Location</dt><dd>${S.escapeHtml(S.displayLocation(summit))}</dd></div>
        ${summit.venue ? `<div><dt>Venue</dt><dd>${S.escapeHtml(summit.venue)}</dd></div>` : ""}
        <div><dt>Presidency</dt><dd>${S.escapeHtml(summit.host_country || "Not documented")}</dd></div>
        ${summit.host_leader ? `<div><dt>Host leader</dt><dd>${S.escapeHtml(summit.host_leader)}</dd></div>` : ""}
        <div><dt>Institutional format</dt><dd>${S.escapeHtml(formatLabel(summit))}</dd></div>
        <div><dt>Record status</dt><dd>${S.escapeHtml(summit.record_status || "Reviewed")}</dd></div>
      </dl></aside>
    </div>`;
    $("summitDialog").showModal();
    if (push) {
      const params = new URLSearchParams(location.search);
      params.set("summit", id);
      history.pushState({ summit: id }, "", `${location.pathname}?${params.toString()}${location.hash}`);
    }
  }

  function closeSummit(update = true) {
    if ($("summitDialog").open) $("summitDialog").close();
    if (update) {
      const params = new URLSearchParams(location.search);
      params.delete("summit");
      const query = params.toString();
      history.replaceState({}, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
    }
  }

  function renderCompare() {
    const selected = [...state.selected].map((id) => state.summits.find((item) => item.id === id)).filter(Boolean);
    if (selected.length < 2) return;
    const cells = (render) => selected.map((summit) => `<td>${render(summit)}</td>`).join("");
    $("compareContent").innerHTML = `<header class="compare-head"><p class="eyebrow">Side-by-side evidence</p><h2 id="compareTitle">Compare ${selected.length} annual meetings</h2><p>Tags and summaries orient the comparison; open the linked summit texts before relying on a substantive claim.</p></header><div class="compare-scroll"><table class="compare-table"><thead><tr><th>Field</th>${selected.map((summit) => `<th>${summit.year}<br>${S.escapeHtml(S.summitTitle(summit))}</th>`).join("")}</tr></thead><tbody>
      <tr><th>Host / setting</th>${cells((item) => `${S.escapeHtml(item.host_country)}<br>${S.escapeHtml(S.displayLocation(item))}<br>${S.escapeHtml(S.displayDate(item))}`)}</tr>
      <tr><th>Format</th>${cells((item) => S.escapeHtml(formatLabel(item)))}</tr>
      <tr><th>Historical setting</th>${cells((item) => S.escapeHtml(item.context || item.historical_context || summitSummary(item)))}</tr>
      ${selected.some((item) => item.institutional_origins) ? `<tr><th>Institutional origins</th>${cells((item) => item.institutional_origins ? `${S.escapeHtml(item.institutional_origins.synthesis)}<br><small>${S.escapeHtml(item.institutional_origins.citation)}</small>` : "—")}</tr>` : ""}
      <tr><th>Policy threads</th>${cells((item) => tags(summitThemes(item), 20))}</tr>
      <tr><th>Recorded outcomes</th>${cells((item) => `<ul>${summitOutcomes(item).map((outcome) => `<li>${S.escapeHtml(outcome)}</li>`).join("")}</ul>`)}</tr>
      <tr><th>Comparison value</th>${cells((item) => S.escapeHtml(item.why_it_matters || item.significance || "See summit record."))}</tr>
      <tr><th>Documents</th>${cells((item) => S.documentsFor(item).map((document) => `<a href="${S.escapeHtml(S.safeUrl(document.url))}" target="_blank" rel="noopener">${S.escapeHtml(document.title || "Open record")} ↗</a>`).join("<br>"))}</tr>
    </tbody></table></div>`;
    $("compareDialog").showModal();
  }

  function renderMatrix() {
    const eras = unique(state.summits.map((item) => item.era), ERA_ORDER);
    const themes = unique(state.summits.flatMap(summitThemes), THEME_ORDER);
    const counts = themes.flatMap((theme) => eras.map((era) => state.summits.filter((summit) => summit.era === era && summitThemes(summit).includes(theme)).length));
    const max = Math.max(...counts, 1);
    const heat = (count) => count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
    $("themeMatrix").innerHTML = `<table class="theme-matrix"><caption class="visually-hidden">Count of annual meetings tagged to each policy thread by institutional era</caption><thead><tr><th>Policy thread</th>${eras.map((era) => `<th>${S.escapeHtml(era)}</th>`).join("")}</tr></thead><tbody>${themes.map((theme) => `<tr><th>${S.escapeHtml(theme)}</th>${eras.map((era) => { const count = state.summits.filter((summit) => summit.era === era && summitThemes(summit).includes(theme)).length; return `<td class="heat-${heat(count)}"><a href="#explorer" data-matrix-theme="${S.escapeHtml(theme)}" data-matrix-era="${S.escapeHtml(era)}" aria-label="Show ${count} ${theme} meetings in ${era}">${count}</a></td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function renderUSHosts() {
    const hosts = state.summits.filter(S.isUSHost).sort((a, b) => a.year - b.year);
    $("usHostTimeline").innerHTML = hosts.map((summit) => `<article class="us-stop"><button type="button" data-open-summit="${S.escapeHtml(summit.id)}"><strong>${summit.year}</strong><span>${S.escapeHtml(summit.name || S.summitTitle(summit))}</span><em>Open record</em></button></article>`).join("");
  }

  function downloadCsv() {
    const fields = ["year", "title", "dates", "location", "host_country", "format", "era", "themes", "summary", "document_urls"];
    const quote = (value) => `"${String(value == null ? "" : value).replaceAll('"', '""')}"`;
    const lines = [fields.join(","), ...state.filtered.map((summit) => [
      summit.year, S.summitTitle(summit), S.displayDate(summit), S.displayLocation(summit), summit.host_country,
      summit.format, summit.era, summitThemes(summit).join(" | "), summitSummary(summit), S.documentsFor(summit).map((item) => item.url).join(" | ")
    ].map(quote).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "g7-summits-filtered.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function bindEvents() {
    $("filterForm").addEventListener("input", applyFilters);
    $("filterForm").addEventListener("change", applyFilters);
    $("resetFilters").addEventListener("click", resetFilters);
    document.querySelectorAll("[data-reset]").forEach((button) => button.addEventListener("click", resetFilters));
    document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
    $("downloadCsvButton").addEventListener("click", downloadCsv);
    $("copyLinkButton").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(location.href); announce("Filtered link copied."); }
      catch (_) { announce("Copy unavailable; use the address bar link."); }
    });
    $("clearCompare").addEventListener("click", () => { state.selected.clear(); renderResults(); });
    $("openCompare").addEventListener("click", renderCompare);
    document.addEventListener("change", (event) => {
      const input = event.target.closest("[data-compare]");
      if (input) updateCompare(input.dataset.compare, input.checked);
    });
    document.addEventListener("click", (event) => {
      const opener = event.target.closest("[data-open-summit]");
      if (opener) openSummit(opener.dataset.openSummit);
      const eraLink = event.target.closest("[data-era-link]");
      if (eraLink) { $("eraFilter").value = eraLink.dataset.eraLink; applyFilters(); }
      const matrix = event.target.closest("[data-matrix-theme]");
      if (matrix) { $("themeFilter").value = matrix.dataset.matrixTheme; $("eraFilter").value = matrix.dataset.matrixEra; applyFilters(); }
      if (event.target.closest("[data-close-dialog]")) closeSummit();
      if (event.target.closest("[data-close-compare]")) $("compareDialog").close();
    });
    $("summitDialog").addEventListener("click", (event) => { if (event.target === $("summitDialog")) closeSummit(); });
    $("summitDialog").addEventListener("close", () => {
      if (new URLSearchParams(location.search).has("summit")) closeSummit(true);
    });
    $("compareDialog").addEventListener("click", (event) => { if (event.target === $("compareDialog")) $("compareDialog").close(); });
    window.addEventListener("popstate", () => {
      const id = new URLSearchParams(location.search).get("summit");
      if (id) openSummit(id, false); else closeSummit(false);
    });
  }

  async function init() {
    try {
      const payload = await S.loadData();
      state.summits = payload.summits;
      if (!state.summits.length) throw new Error("No summit records found.");
      hydrateFilters();
      const initialSummit = readUrl();
      renderStats(payload.meta);
      renderMatrix();
      renderUSHosts();
      bindEvents();
      applyFilters();
      if (initialSummit) openSummit(initialSummit, false);
    } catch (error) {
      $("resultSummary").textContent = "Summit data unavailable.";
      $("summitGrid").innerHTML = `<div class="empty-state"><h3>Unable to load the summit record.</h3><p>${S.escapeHtml(error.message)}</p></div>`;
    }
  }

  init();
})();
