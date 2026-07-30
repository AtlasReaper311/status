"use strict";

const ACCESSIBILITY_STYLESHEET = "/css/phase-8-accessibility.css?v=20260730-phase-8-v1";

function ensurePhase8AccessibilityStylesheet() {
  if (typeof document === "undefined") return null;
  const selector = `link[href="${ACCESSIBILITY_STYLESHEET}"]`;
  const existing = document.head.querySelector(selector);
  if (existing) return existing;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = ACCESSIBILITY_STYLESHEET;
  link.dataset.atlasPhase8AccessibilityStyles = "";
  document.head.appendChild(link);
  return link;
}

export { ACCESSIBILITY_STYLESHEET, ensurePhase8AccessibilityStylesheet };
