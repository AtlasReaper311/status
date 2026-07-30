import {
  STATUS_ENDPOINT,
  STATUS_LABELS,
  parseEstateStatus,
} from "./estate-status.js";
import { ensurePhase8AccessibilityStylesheet } from "./phase-8-accessibility.js";

const TIMEOUT_MS = 6_000;

function setStatus(chip, result) {
  chip.dataset.state = result.state;
  chip.querySelector("[data-atlas-status-label]").textContent = result.label;
  chip.setAttribute("aria-label", `Atlas Systems status: ${result.label}`);
  chip.title = result.detail;
}

async function refreshStatus(chip) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(STATUS_ENDPOINT, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setStatus(chip, parseEstateStatus(await response.json()));
  } catch {
    setStatus(chip, {
      state: "unknown",
      label: STATUS_LABELS.unknown,
      detail: "Status evidence could not be loaded.",
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function install() {
  ensurePhase8AccessibilityStylesheet();
  const chip = document.querySelector("[data-atlas-status]");
  if (chip) void refreshStatus(chip);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}

export { refreshStatus, setStatus };
