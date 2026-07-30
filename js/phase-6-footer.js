"use strict";

const FOOTER_STYLESHEET = "/css/phase-6-footer.css?v=20260730-phase-6-v2";

function ensureStylesheet() {
  if (document.head.querySelector(`link[href="${FOOTER_STYLESHEET}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FOOTER_STYLESHEET;
  link.dataset.atlasPhase6FooterStyles = "";
  document.head.appendChild(link);
}

function createLink(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  return link;
}

function createSlot(className, children) {
  const slot = document.createElement("div");
  slot.className = className;
  slot.append(...children);
  return slot;
}

function buildStatusFooter() {
  const footer = document.createElement("footer");
  footer.className = "atlas-footer atlas-footer--product status-product-footer";
  footer.setAttribute("aria-label", "Status product footer");
  footer.dataset.atlasPhase6Footer = "product";

  const identity = document.createElement("div");
  identity.className = "atlas-footer__identity";
  const name = document.createElement("strong");
  name.textContent = "Atlas Systems Status";
  const detail = document.createElement("span");
  detail.textContent = "Public service state and reliability evidence";
  identity.append(name, detail);

  const context = createSlot("atlas-footer__context", [
    createLink("Systems directory", "https://atlas-systems.uk/systems/"),
  ]);

  const evidence = createSlot("atlas-footer__evidence", [
    createLink("Public API", "https://api.atlas-systems.uk/v1"),
    createLink("Source", "https://github.com/AtlasReaper311/status"),
  ]);

  const escape = createSlot("atlas-footer__escape", [
    createLink("Atlas Systems home", "https://atlas-systems.uk/"),
  ]);

  footer.append(identity, context, evidence, escape);
  return footer;
}

function installStatusFooter() {
  if (typeof document === "undefined") return null;
  ensureStylesheet();

  const current = document.querySelector("footer[data-atlas-phase6-footer]");
  if (current) return current;

  const footer = buildStatusFooter();
  const existing = document.querySelector("body > footer");
  if (existing) {
    existing.replaceWith(footer);
  } else {
    const mobileNavigation = document.querySelector('nav[aria-label="Mobile navigation"]');
    if (mobileNavigation?.parentNode) {
      mobileNavigation.parentNode.insertBefore(footer, mobileNavigation);
    } else {
      document.body.appendChild(footer);
    }
  }
  return footer;
}

export { FOOTER_STYLESHEET, buildStatusFooter, installStatusFooter };
