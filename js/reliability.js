/* .................................................................. */
/* Service levels from the derived reliability API.                   */
/*                                                                    */
/* Calculation authority moved to /v1/reliability: the same evaluator */
/* mathematics runs canonically in atlas-infra and as a vendored port */
/* inside atlas-api-public, pinned to each other by shared vectors.   */
/* This page renders the derived verdicts instead of recomputing them */
/* so there is exactly one budget calculation in the estate.          */
/*                                                                    */
/* slo.json remains the row configuration: which services to show, in */
/* which order, with which labels and notes. It is generated from the */
/* canonical policy in atlas-infra and carries the policy fingerprint */
/* it was rendered from.                                              */
/*                                                                    */
/* Honesty rules, unchanged from the page's founding set:             */
/*   1. partial windows and partial coverage are labelled, never      */
/*      dressed as a full month;                                      */
/*   2. a failed poll keeps the last successful read on screen,       */
/*      marked stale; first-load failure states its reason;           */
/*   3. a blown budget renders as plainly as a healthy one; and       */
/*   4. stale, unavailable, unmeasured, and unknown are first-class   */
/*      display states, never coerced toward healthy.                 */
/* .................................................................. */

const RELIABILITY_API = "https://api.atlas-systems.uk/v1/reliability";
const SLO_CONFIG_URL = "/slo.json";
const SLO_POLL_MS = 300000;

const STATE_PRESENTATION = {
  objective_met: { label: "meeting objective", cls: "ok" },
  budget_at_risk: { label: "budget at risk", cls: "warn" },
  budget_exhausted: { label: "budget exhausted", cls: "blown" },
  insufficient_evidence: { label: "insufficient evidence", cls: "muted" },
  stale_evidence: { label: "stale evidence", cls: "warn" },
  unavailable_source: { label: "source unavailable", cls: "muted" },
  malformed_evidence: { label: "malformed evidence", cls: "muted" },
  unmeasured: { label: "unmeasured", cls: "muted" },
};

/** Class for a remaining-budget fraction; thresholds match the evaluator. */
export function budgetClass(remainingFraction) {
  if (remainingFraction === null || remainingFraction === undefined) return "muted";
  if (remainingFraction <= 0) return "blown";
  if (remainingFraction <= 0.25) return "warn";
  return "ok";
}

/** Safe accessor: the page must render sanely from malformed payloads. */
function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Interpret the /v1/reliability envelope defensively. Anything that is
 * not the documented shape degrades to invalid, which the renderer
 * presents as unavailable rather than crashing or guessing.
 */
export function interpretEnvelope(body) {
  if (!body || typeof body !== "object" || body.ok !== true) {
    return { valid: false };
  }
  const report = body.report;
  if (!report || typeof report !== "object" || !Array.isArray(report.results)) {
    return { valid: false };
  }
  const byService = {};
  for (const entry of report.results) {
    if (entry && typeof entry === "object" && typeof entry.service_id === "string") {
      byService[entry.service_id] = entry;
    }
  }
  const unmeasured = {};
  if (Array.isArray(report.unmeasured)) {
    for (const item of report.unmeasured) {
      if (item && typeof item.service_id === "string") {
        unmeasured[item.service_id] = String(item.reason ?? "unmeasured");
      }
    }
  }
  return {
    valid: true,
    stale: body.stale === true,
    policyState: typeof body.policy_state === "string" ? body.policy_state : "missing",
    evaluatedAt: typeof report.evaluated_at === "string" ? report.evaluated_at : null,
    measuringSince:
      typeof report.source?.measuring_since === "string"
        ? report.source.measuring_since
        : null,
    windowDays: numberOrNull(report.source?.window_days),
    byService,
    unmeasured,
  };
}

/**
 * Build every display string for one service row. Pure: no DOM, no
 * clock beyond the supplied envelope, so the tests can pin each state.
 */
export function rowModel(cfg, envelope) {
  const model = {
    id: String(cfg.id ?? ""),
    sub: String(cfg.sub ?? ""),
    note: cfg.note ? String(cfg.note) : null,
    targetText: `${cfg.target_pct}%`,
    stateLabel: "unavailable",
    stateClass: "muted",
    measuredText: "no data",
    measuredClass: "muted",
    latencyText: null,
    coverageText: null,
    budgetText: "no verdict",
    budgetClass: "muted",
    budgetFillPct: 0,
    burnText: null,
    windowText: null,
    lastMeasuredText: null,
    reasonText: null,
  };
  if (!envelope || envelope.valid !== true) return model;

  const entry = envelope.byService[cfg.id];
  if (!entry) {
    const reason = envelope.unmeasured[cfg.id];
    model.stateLabel = reason ? "unmeasured" : "not in report";
    model.reasonText = reason ?? null;
    return model;
  }

  const presentation = STATE_PRESENTATION[entry.state] ?? {
    label: String(entry.state ?? "unknown"),
    cls: "muted",
  };
  model.stateLabel = presentation.label;
  model.stateClass = presentation.cls;

  const availability = numberOrNull(entry.availability_pct);
  const target = numberOrNull(cfg.target_pct);
  if (availability !== null) {
    model.measuredText = `${availability.toFixed(2)}%`;
    model.measuredClass =
      target !== null && availability >= target ? "ok" : "blown";
  }
  const avgMs = numberOrNull(entry.latency?.avg_ms);
  if (avgMs !== null) model.latencyText = `avg probe ${avgMs}ms`;

  const coverage = entry.coverage ?? {};
  const fraction = numberOrNull(coverage.fraction);
  if (fraction !== null) {
    model.coverageText = `coverage ${Math.round(fraction * 100)}% (${coverage.observed ?? 0} of ${coverage.expected ?? 0} samples)`;
  } else if (typeof coverage.observed === "number") {
    model.coverageText = `${coverage.observed} samples`;
  }

  const remaining = numberOrNull(entry.budget?.remaining_fraction);
  if (remaining !== null) {
    const pct = Math.round(remaining * 100);
    model.budgetText = remaining <= 0 ? `exhausted (${pct}%)` : `${pct}% remaining`;
    model.budgetClass = budgetClass(remaining);
    model.budgetFillPct = Math.max(0, Math.min(100, pct));
  } else {
    model.budgetText = "no verdict";
    model.budgetClass = "muted";
  }

  const fast = numberOrNull(entry.burn?.fast?.rate);
  const slow = numberOrNull(entry.burn?.slow?.rate);
  if (fast !== null || slow !== null) {
    const fastText = fast !== null ? `fast ${fast}x` : "fast n/a";
    const slowText = slow !== null ? `slow ${slow}x` : "slow n/a";
    model.burnText = `burn ${fastText} · ${slowText}`;
  }

  const window = entry.window ?? {};
  const windowDays = envelope.windowDays ?? 30;
  if (typeof window.days_observed === "number" && window.days_observed > 0) {
    model.windowText =
      window.days_observed >= windowDays
        ? `${windowDays} day window`
        : `${window.days_observed} of ${windowDays} days · since ${window.start_day ?? "?"}`;
  }
  if (envelope.evaluatedAt) {
    model.lastMeasuredText = `measured ${envelope.evaluatedAt.slice(0, 16).replace("T", " ")}Z`;
  }
  if (Array.isArray(entry.reasons) && entry.reasons.length > 0) {
    model.reasonText = String(entry.reasons[0]);
  }
  return model;
}

/** The footer note under the grid, honest about freshness and policy. */
export function noteText(envelope) {
  if (!envelope || envelope.valid !== true) {
    return "reliability results unavailable; the derived endpoint did not answer";
  }
  const parts = [];
  if (envelope.stale) {
    parts.push("results are past their freshness bound and shown as stale");
  } else {
    parts.push("derived every 10 minutes at the edge from measured probes");
  }
  if (envelope.policyState !== "fresh") {
    parts.push(`policy ${envelope.policyState}; verdicts no longer refresh`);
  }
  if (envelope.measuringSince) {
    parts.push(`measuring since ${envelope.measuringSince.slice(0, 10)}`);
  }
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ */
/* DOM rendering; everything below needs a document.                   */
/* ------------------------------------------------------------------ */

function labelled(className, labelText) {
  const cell = document.createElement("div");
  cell.className = className;
  const label = document.createElement("span");
  label.className = "slo-cell-label";
  label.textContent = labelText;
  cell.appendChild(label);
  return cell;
}

function valueSpan(cell, text, className) {
  const value = document.createElement("span");
  value.className = className;
  value.textContent = text;
  cell.appendChild(value);
}

function headerRow() {
  const head = document.createElement("div");
  head.className = "slo-row head";
  for (const text of ["service", "target", "measured", "error budget", "state"]) {
    const cell = document.createElement("div");
    cell.textContent = text;
    head.appendChild(cell);
  }
  return head;
}

function renderRow(model) {
  const row = document.createElement("div");
  row.className = "slo-row";

  const nameCell = document.createElement("div");
  valueSpan(nameCell, model.id, "slo-name");
  valueSpan(nameCell, model.sub, "slo-sub");
  if (model.note) valueSpan(nameCell, model.note, "slo-note-line");
  row.appendChild(nameCell);

  const targetCell = labelled("slo-num-cell", "target");
  valueSpan(targetCell, model.targetText, "slo-num");
  row.appendChild(targetCell);

  const measuredCell = labelled("slo-num-cell", "measured");
  valueSpan(measuredCell, model.measuredText, `slo-num ${model.measuredClass}`);
  if (model.latencyText) valueSpan(measuredCell, model.latencyText, "slo-sub");
  if (model.coverageText) valueSpan(measuredCell, model.coverageText, "slo-window");
  row.appendChild(measuredCell);

  const budgetCell = labelled("slo-budget-cell", "error budget");
  const track = document.createElement("div");
  track.className = "slo-track";
  const fill = document.createElement("div");
  fill.className = `slo-fill ${model.budgetClass}`;
  fill.style.width = `${model.budgetFillPct}%`;
  track.appendChild(fill);
  budgetCell.appendChild(track);
  valueSpan(budgetCell, model.budgetText, `slo-num ${model.budgetClass}`);
  if (model.burnText) valueSpan(budgetCell, model.burnText, "slo-window");
  row.appendChild(budgetCell);

  const stateCell = labelled("slo-num-cell", "state");
  valueSpan(stateCell, model.stateLabel, `slo-num slo-state ${model.stateClass}`);
  if (model.windowText) valueSpan(stateCell, model.windowText, "slo-window");
  if (model.lastMeasuredText) valueSpan(stateCell, model.lastMeasuredText, "slo-window");
  if (model.reasonText) valueSpan(stateCell, model.reasonText, "slo-window");
  row.appendChild(stateCell);

  return row;
}

export function mountServiceLevels() {
  const gridEl = document.getElementById("sloGrid");
  const noteEl = document.getElementById("sloNote");
  if (!gridEl || !noteEl) return;

  let config = null;
  let rendered = false;

  function render(envelope) {
    gridEl.innerHTML = "";
    gridEl.appendChild(headerRow());
    for (const cfg of config.services) {
      gridEl.appendChild(renderRow(rowModel(cfg, envelope)));
    }
    rendered = true;
    noteEl.textContent = noteText(envelope);
  }

  async function poll() {
    try {
      if (!config) {
        const cfgRes = await fetch(SLO_CONFIG_URL, { cache: "no-store" });
        if (!cfgRes.ok) throw new Error(`config ${cfgRes.status}`);
        config = await cfgRes.json();
      }
      const res = await fetch(RELIABILITY_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`api ${res.status}`);
      const envelope = interpretEnvelope(await res.json());
      if (!envelope.valid) throw new Error("payload shape");
      render(envelope);
    } catch {
      if (rendered) {
        noteEl.textContent =
          "data stale; last successful read kept on screen";
        return;
      }
      gridEl.innerHTML = "";
      const err = document.createElement("div");
      err.className = "activity-error";
      err.textContent =
        "Service level data unavailable; the derived reliability endpoint did not answer.";
      gridEl.appendChild(err);
      noteEl.textContent = "will retry in 5 minutes";
    }
  }

  poll();
  setInterval(poll, SLO_POLL_MS);
}
