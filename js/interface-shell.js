import {
  STATUS_ENDPOINT,
  STATUS_LABELS,
  parseEstateStatus,
} from "./estate-status.js";
import { installEstateSearch } from "./estate-search.js";

const TIMEOUT_MS = 6_000;
const ATLAS_HOSTS = new Set([
  "api.atlas-systems.uk",
  "atlas-systems.uk",
  "cv.atlas-systems.uk",
  "ramone.atlas-systems.uk",
  "status.atlas-systems.uk",
]);

function setStatus(chip, checked, result, checkedAt) {
  chip.dataset.state = result.state;
  chip.querySelector("[data-atlas-status-label]").textContent = result.label;
  chip.setAttribute("aria-label", `Atlas Systems status: ${result.label}`);
  chip.title = result.detail;

  if (checkedAt) {
    checked.textContent = `Checked ${new Date(checkedAt).toISOString().slice(11, 16)} UTC`;
    checked.dateTime = checkedAt;
  } else {
    checked.textContent = "Evidence unavailable";
    checked.removeAttribute("datetime");
  }
}

async function refreshAggregate(chip, checked) {
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
    setStatus(chip, checked, parseEstateStatus(data), data.estate?.checked_at);
  } catch {
    setStatus(chip, checked, {
      state: "unknown",
      label: STATUS_LABELS.unknown,
      detail: "Status evidence could not be loaded.",
    }, null);
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeLink(anchor) {
  if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
  const raw = anchor.getAttribute("href") || "";
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;

  let url;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return;
  }
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
        if (!(node instanceof Element)) continue;
        if (node.matches("a[href]")) normalizeLink(node);
        normalizeLinks(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function install() {
  const chip = document.querySelector("[data-atlas-status]");
  const checked = document.getElementById("aggregateCheckedAt");
  normalizeLinks();
  observeLinks();
  installEstateSearch();
  if (chip && checked) void refreshAggregate(chip, checked);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
}

export {
  ATLAS_HOSTS,
  normalizeLink,
  normalizeLinks,
  refreshAggregate,
};
