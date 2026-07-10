(function () {
  "use strict";

  const DATA_URL = "data/summits.json";
  let dataPromise;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value), window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
    } catch (_) {
      return "#";
    }
  }

  function normalizePayload(payload) {
    const summits = Array.isArray(payload) ? payload : (payload.summits || []);
    return { meta: Array.isArray(payload) ? {} : (payload.meta || {}), summits };
  }

  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL, { cache: "no-cache" })
        .then((response) => {
          if (!response.ok) throw new Error(`Summit data: HTTP ${response.status}`);
          return response.json();
        })
        .then(normalizePayload);
    }
    return dataPromise;
  }

  function documentsFor(summit) {
    return summit.documents || summit.official_documents || summit.sources || [];
  }

  function displayDate(summit) {
    if (typeof summit.dates === "string") return summit.dates;
    return summit.date_display || summit.dates?.display || summit.date || String(summit.year);
  }

  function displayLocation(summit) {
    const place = summit.location || summit.city || summit.name;
    const country = summit.host_country_historical || summit.host_country || summit.host || "";
    if (!place) return country;
    if (!country || place.toLowerCase().includes(country.toLowerCase())) return place;
    return `${place}, ${country}`;
  }

  function summitTitle(summit) {
    return summit.summit_title || summit.title || `${summit.name || summit.location} Summit`;
  }

  function isUSHost(summit) {
    return Boolean(summit.is_us_host || summit.us_host || ["United States", "USA", "U.S."].includes(summit.host_country));
  }

  function sourceTierLabel(document) {
    const tier = Number(document.tier || document.source_tier || 0);
    if (tier === 1) return "Official source";
    if (tier === 2) return "Archival copy";
    return document.source_label || document.status || "Supporting source";
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("g7-history-theme", theme);
  }

  function initTheme() {
    const toggle = document.getElementById("themeToggle");
    const stored = localStorage.getItem("g7-history-theme");
    const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(stored || preferred);
    toggle?.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  }

  function initNavigation() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("primaryNav");
    if (!toggle || !nav) return;
    const close = () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    };
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  }

  function init() {
    initTheme();
    initNavigation();
  }

  window.G7Site = Object.freeze({
    DATA_URL,
    escapeHtml,
    safeUrl,
    loadData,
    documentsFor,
    displayDate,
    displayLocation,
    summitTitle,
    isUSHost,
    sourceTierLabel
  });

  init();
})();
