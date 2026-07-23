import {
  STATUS_ENDPOINT,
  parseEstateStatus,
} from "./estate-status.js";
import { installEstateSearch } from "./estate-search.js";

const STATUS_PAGE = "https://status.atlas-systems.uk/";
const STYLESHEET = "/css/interface-shell.css?v=20260723-interface-v1";
const TIMEOUT_MS = 6_000;
const ATLAS_HOSTS = new Set([
  "api.atlas-systems.uk",
  "atlas-systems.uk",
  "cv.atlas-systems.uk",
  "ramone.atlas-systems.uk",
  "status.atlas-systems.uk",
]);

function ensureStylesheet() {
  if (document.head.querySelector(`link[href="${STYLESHEET}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = STYLESHEET;
  document.head.appendChild(link);
}

function ensureLink(rel, href, attributes = {}) {
  if (document.head.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
  document.head.appendChild(link);
}

function ensureIcons() {
  document.head.querySelectorAll('link[rel="icon"]').forEach((node) => node.remove());
  ensureLink("icon", "/favicon.ico", { sizes: "any" });
  ensureLink("icon", "/favicon-16x16.png", { sizes: "16x16", type: "image/png" });
  ensureLink("icon", "/favicon-32x32.png", { sizes: "32x32", type: "image/png" });
  ensureLink("apple-touch-icon", "/apple-touch-icon.png", { sizes: "180x180" });
  ensureLink("manifest", "/site.webmanifest");
}

function ensureMeta(name, content, property = false) {
  const attribute = property ? "property" : "name";
  let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function ensureMetadata() {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = STATUS_PAGE;

  const title = "Atlas Systems // Status";
  const description = "Live public service state, reliability objectives, evidence freshness, and recent Atlas Systems operational activity.";
  document.title = title;
  ensureMeta("description", description);
  ensureMeta("theme-color", "#0a0a0f");
  ensureMeta("og:type", "website", true);
  ensureMeta("og:title", title, true);
  ensureMeta("og:description", description, true);
  ensureMeta("og:url", STATUS_PAGE, true);
  ensureMeta("og:site_name", "Atlas Systems", true);
  ensureMeta("og:image", "https://atlas-systems.uk/og-default.png", true);
  ensureMeta("og:image:width", "1200", true);
  ensureMeta("og:image:height", "630", true);
  ensureMeta("og:image:alt", "Atlas Systems public status and reliability interface", true);
  ensureMeta("twitter:card", "summary_large_image");
  ensureMeta("twitter:title", title);
  ensureMeta("twitter:description", description);
  ensureMeta("twitter:image", "https://atlas-systems.uk/og-default.png");
}

function globalLink(label, href) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  item.appendChild(link);
  return item;
}

function searchButton() {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "status-search-button";
  button.dataset.estateSearchOpen = "";
  button.setAttribute("aria-label", "Search the estate");
  button.setAttribute("aria-haspopup", "dialog");

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "11");
  circle.setAttribute("cy", "11");
  circle.setAttribute("r", "7");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", "21");
  line.setAttribute("y1", "21");
  line.setAttribute("x2", "16.2");
  line.setAttribute("y2", "16.2");
  icon.append(circle, line);

  const label = document.createElement("span");
  label.textContent = "Search";
  const key = document.createElement("kbd");
  key.textContent = "ctrl k";
  button.append(icon, label, key);
  item.appendChild(button);
  return item;
}

function createStatusChip() {
  const chip = document.createElement("a");
  chip.className = "atlas-estate-status";
  chip.href = STATUS_PAGE;
  chip.dataset.state = "checking";
  chip.setAttribute("aria-current", "page");
  chip.setAttribute("aria-label", "Atlas Systems status: checking");

  const dot = document.createElement("span");
  dot.className = "atlas-estate-status-dot";
  dot.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "atlas-estate-status-label";
  label.textContent = "checking";
  chip.append(dot, label);
  return chip;
}

function installNavigation() {
  const nav = document.querySelector("body > nav") || document.createElement("nav");
  nav.setAttribute("aria-label", "Primary navigation");
  nav.replaceChildren();

  const cluster = document.createElement("div");
  cluster.className = "atlas-brand-cluster";
  const wordmark = document.createElement("a");
  wordmark.href = "https://atlas-systems.uk/";
  wordmark.className = "nav-wordmark";
  wordmark.append("Atlas");
  const underscore = document.createElement("span");
  underscore.textContent = "_";
  wordmark.append(underscore, "Systems");
  const chip = createStatusChip();
  cluster.append(wordmark, chip);

  const links = document.createElement("ul");
  links.className = "nav-links";
  links.append(
    globalLink("Work", "https://atlas-systems.uk/work/"),
    globalLink("Writing", "https://atlas-systems.uk/writing/"),
    globalLink("Lab", "https://atlas-systems.uk/lab/"),
    globalLink("About", "https://atlas-systems.uk/about/"),
    searchButton(),
  );

  nav.append(cluster, links);
  if (!nav.isConnected) document.body.prepend(nav);
  return chip;
}

function installProductStrip() {
  if (document.querySelector(".atlas-product-strip")) return document.querySelector(".atlas-product-strip");
  const strip = document.createElement("div");
  strip.className = "atlas-product-strip";
  const identity = document.createElement("strong");
  identity.textContent = "Status";
  const purpose = document.createElement("span");
  purpose.textContent = "public service state and reliability evidence";
  const checked = document.createElement("time");
  checked.textContent = "checking evidence";
  strip.append(identity, purpose, checked);
  document.querySelector("body > nav")?.insertAdjacentElement("afterend", strip);
  return strip;
}

function setStatus(chip, strip, result, checkedAt) {
  chip.dataset.state = result.state;
  chip.querySelector(".atlas-estate-status-label").textContent = result.state;
  chip.setAttribute("aria-label", `Atlas Systems status: ${result.state}`);
  chip.title = result.detail;
  const time = strip.querySelector("time");
  time.textContent = checkedAt ? `checked ${new Date(checkedAt).toISOString().slice(11, 16)} UTC` : "evidence unavailable";
  time.dateTime = checkedAt || "";
}

async function refreshAggregate(chip, strip) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(STATUS_ENDPOINT, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    setStatus(chip, strip, parseEstateStatus(data), data.estate && data.estate.checked_at);
  } catch {
    setStatus(chip, strip, { state: "unknown", detail: "Status evidence could not be loaded." }, null);
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeLink(anchor) {
  if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
  const raw = anchor.getAttribute("href") || "";
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;
  let url;
  try { url = new URL(anchor.href, window.location.href); } catch { return; }
  if (!/^https?:$/.test(url.protocol)) return;
  if (ATLAS_HOSTS.has(url.hostname)) {
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  } else {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
}

function normalizeLinks(root = document) {
  root.querySelectorAll("a[href]").forEach(normalizeLink);
}

function observeLinks() {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) {
          if (node.matches("a[href]")) normalizeLink(node);
          normalizeLinks(node);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function install() {
  ensureStylesheet();
  ensureIcons();
  ensureMetadata();
  const chip = installNavigation();
  const strip = installProductStrip();
  normalizeLinks();
  observeLinks();
  installEstateSearch();
  void refreshAggregate(chip, strip);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}
