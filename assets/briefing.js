(function () {
  "use strict";

  const S = window.G7Site;
  const $ = (id) => document.getElementById(id);
  let summits = [];

  const THREAD_COPY = {
    "Macroeconomic coordination": "Growth, inflation, employment, fiscal and monetary policy, exchange rates, and external imbalances form the original core of summit diplomacy and repeatedly return after shocks.",
    "Trade": "The record moves from anti-protectionism and GATT negotiations through WTO concerns, market distortions, overcapacity, tariffs, and economic coercion.",
    "Energy and resources": "Oil shocks and conservation precede later work on energy security, climate transitions, resilient supply chains, and critical minerals.",
    "Development and global partnerships": "North–South relations, debt, food security, Africa, infrastructure, and development finance show how the G7’s relationship to non-members changed.",
    "Peace and security": "Cold War alliance questions expand into nonproliferation, terrorism, regional conflict, sanctions, Ukraine, and the defense of international order.",
    "Global health": "Infectious disease, HIV/AIDS, maternal and child health, pandemics, cancer, and Ebola became sustained leaders’ issues rather than episodic technical concerns.",
    "Technology": "Advanced technology, cybercrime, the digital economy, artificial intelligence, quantum readiness, and online safety show a widening governance agenda.",
    "Democracy and society": "Human rights, democratic resilience, gender equality, foreign interference, and transnational repression link domestic institutions to collective security.",
    "Environment": "Early resource and pollution language develops into climate, biodiversity, oceans, nature, and disaster resilience commitments.",
    "Institutional governance": "Tasking to the IMF, OECD, IEA, World Bank, WHO, UN, and ministerial tracks reveals how a group without a permanent secretariat tries to secure follow-through."
  };

  function themes(summit) { return summit.themes || summit.policy_themes || []; }
  function outcomes(summit) { return summit.outcomes || summit.key_outcomes || []; }

  function renderEvian() {
    const evian = summits.find((item) => item.year === 2026);
    if (!evian) return;
    const docs = S.documentsFor(evian);
    $("evianDocuments").innerHTML = `<h3>Évian leaders’ record</h3><ul class="document-list">${docs.map((document) => `<li><a href="${S.escapeHtml(S.safeUrl(document.url))}" target="_blank" rel="noopener">${S.escapeHtml(document.title || "Official summit record")} <span aria-hidden="true">↗</span></a><br><span class="source-count">${S.escapeHtml(S.sourceTierLabel(document))}</span></li>`).join("")}</ul>`;
  }

  function renderUSRecord() {
    const us = summits.filter(S.isUSHost).sort((a, b) => a.year - b.year);
    $("usRecordList").innerHTML = us.map((summit) => `<article class="us-record-row"><strong class="record-year">${summit.year}</strong><div><h3>${S.escapeHtml(S.summitTitle(summit))}</h3><p>${S.escapeHtml(S.displayLocation(summit))}</p></div><p>${S.escapeHtml(summit.why_it_matters || summit.significance || summit.summary || "Open the summit record for comparison.")}</p><a class="text-link" href="index.html?summit=${encodeURIComponent(summit.id)}">Open <span aria-hidden="true">→</span></a></article>`).join("");
  }

  function renderThread(theme) {
    const records = summits.filter((summit) => themes(summit).includes(theme)).sort((a, b) => a.year - b.year);
    document.querySelectorAll("[data-thread]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.thread === theme)));
    $("threadPanel").innerHTML = `<h3>${S.escapeHtml(theme)}</h3><p>${S.escapeHtml(THREAD_COPY[theme] || "Use the linked annual records to trace this policy thread across presidencies.")}</p><p><strong>${records.length}</strong> annual meetings are tagged to this thread.</p><div class="thread-records">${records.map((summit) => `<a href="index.html?summit=${encodeURIComponent(summit.id)}">${summit.year} · ${S.escapeHtml(summit.name || S.summitTitle(summit))}</a>`).join("")}</div>`;
  }

  function renderThreads() {
    const known = Object.keys(THREAD_COPY);
    const available = [...new Set(summits.flatMap(themes))];
    const ordered = known.filter((item) => available.includes(item)).concat(available.filter((item) => !known.includes(item)).sort());
    $("threadTabs").innerHTML = ordered.map((theme, index) => `<button type="button" role="tab" data-thread="${S.escapeHtml(theme)}" aria-selected="${index === 0}">${S.escapeHtml(theme)}</button>`).join("");
    $("packetTheme").innerHTML = `<option value="">Choose a policy thread</option>${ordered.map((theme) => `<option value="${S.escapeHtml(theme)}">${S.escapeHtml(theme)}</option>`).join("")}`;
    if (ordered[0]) renderThread(ordered[0]);
  }

  function packetMatches(summit, range) {
    if (range === "recent") return summit.year >= 2014;
    if (range === "g8") return summit.year >= 1998 && summit.year <= 2013;
    if (range === "coldwar") return summit.year <= 1990;
    if (range === "us") return S.isUSHost(summit);
    return true;
  }

  function renderPacket(event) {
    event?.preventDefault();
    const theme = $("packetTheme").value;
    const range = $("packetRange").value;
    if (!theme) {
      $("packetOutput").innerHTML = '<p class="empty-note">Select a policy thread to assemble a source path.</p>';
      return;
    }
    const records = summits.filter((summit) => themes(summit).includes(theme) && packetMatches(summit, range)).sort((a, b) => b.year - a.year);
    if (!records.length) {
      $("packetOutput").innerHTML = `<p class="empty-note">No annual records match ${S.escapeHtml(theme)} in this time horizon.</p>`;
      return;
    }
    $("packetOutput").innerHTML = `<h3>${S.escapeHtml(theme)} · ${records.length} meeting${records.length === 1 ? "" : "s"}</h3><p class="empty-note">Start with the newest record, then follow the thread backward to its earlier formulations.</p>${records.map((summit) => {
      const first = S.documentsFor(summit)[0];
      return `<article class="packet-record"><strong>${summit.year}</strong><div><a href="index.html?summit=${encodeURIComponent(summit.id)}"><b>${S.escapeHtml(S.summitTitle(summit))}</b></a><p>${S.escapeHtml(outcomes(summit)[0] || summit.summary || "See summit record.")}</p></div>${first ? `<a class="text-link" href="${S.escapeHtml(S.safeUrl(first.url))}" target="_blank" rel="noopener">Source ↗</a>` : ""}</article>`;
    }).join("")}`;
  }

  function bindEvents() {
    $("threadTabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-thread]");
      if (button) renderThread(button.dataset.thread);
    });
    $("packetForm").addEventListener("submit", renderPacket);
    $("packetTheme").addEventListener("change", renderPacket);
    $("packetRange").addEventListener("change", renderPacket);
  }

  async function init() {
    try {
      const payload = await S.loadData();
      summits = payload.summits;
      renderEvian();
      renderUSRecord();
      renderThreads();
      bindEvents();
      renderPacket();
    } catch (error) {
      $("evianDocuments").innerHTML = `<p class="empty-note">Unable to load summit data: ${S.escapeHtml(error.message)}</p>`;
    }
  }

  init();
})();
