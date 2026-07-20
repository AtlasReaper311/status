/**
 * Pure-function tests for the service-levels module: every display state
 * the cockpit can render, pinned without a DOM. The rendering side is
 * covered by html-validate plus the module's defensive interpretation:
 * anything that fails these interpreters renders as unavailable, so the
 * calculation layer is where honesty is proven.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  budgetClass,
  interpretEnvelope,
  noteText,
  rowModel,
} from "../js/reliability.js";

const CFG = {
  id: "atlas-notify",
  component: "notify",
  target_pct: 99.5,
  sub: "event router",
  domain: "edge",
};

function envelopeWith(entry, overrides = {}) {
  return interpretEnvelope({
    ok: true,
    policy_state: "fresh",
    stale: false,
    report: {
      evaluated_at: "2026-07-19T12:00:00Z",
      stale_after: "2026-07-19T12:30:00Z",
      source: {
        provider: "atlas-api-public/v1/slo",
        window_days: 30,
        measuring_since: "2026-07-13T00:00:00Z",
      },
      results: entry ? [entry] : [],
      unmeasured: [
        {
          service_id: "atlas-vault",
          reason: "no approved objective; service remains explicitly unmeasured",
        },
      ],
    },
    ...overrides,
  });
}

function healthyEntry(overrides = {}) {
  return {
    service_id: "atlas-notify",
    objective_id: "atlas-notify-availability-30d",
    indicator: "availability",
    target_pct: 99.5,
    state: "objective_met",
    control_plane_state: "healthy",
    reasons: [],
    window: { start_day: "2026-07-13", end_day: "2026-07-19", days_observed: 7 },
    samples: { ok: 1006, failed: 2, total: 1008 },
    availability_pct: 99.8,
    coverage: { fraction: 1, observed: 1008, expected: 1008 },
    latency: { avg_ms: 184, percentiles_supported: false, percentile_reason: "x" },
    budget: { allowed_failures: 5.04, remaining_fraction: 0.603, consumed_fraction: 0.397 },
    burn: {
      fast: { rate: 0, samples: 216, bucket_days: 2, reason: null },
      slow: { rate: 0.4, samples: 1008, bucket_days: 8, reason: null },
    },
    ...overrides,
  };
}

test("budget classes follow the evaluator thresholds", () => {
  assert.equal(budgetClass(1), "ok");
  assert.equal(budgetClass(0.26), "ok");
  assert.equal(budgetClass(0.25), "warn");
  assert.equal(budgetClass(0), "blown");
  assert.equal(budgetClass(-0.4), "blown");
  assert.equal(budgetClass(null), "muted");
});

test("a healthy service renders measured, budget, burn, and window facts", () => {
  const model = rowModel(CFG, envelopeWith(healthyEntry()));
  assert.equal(model.stateLabel, "meeting objective");
  assert.equal(model.stateClass, "ok");
  assert.equal(model.measuredText, "99.80%");
  assert.equal(model.measuredClass, "ok");
  assert.equal(model.latencyText, "avg probe 184ms");
  assert.equal(model.coverageText, "coverage 100% (1008 of 1008 samples)");
  assert.equal(model.budgetText, "60% remaining");
  assert.equal(model.budgetClass, "ok");
  assert.equal(model.budgetFillPct, 60);
  assert.equal(model.burnText, "burn fast 0x · slow 0.4x");
  assert.equal(model.windowText, "7 of 30 days · since 2026-07-13");
  assert.equal(model.lastMeasuredText, "measured 2026-07-19 12:00Z");
});

test("an exhausted budget renders as plainly as a healthy one", () => {
  const entry = healthyEntry({
    state: "budget_exhausted",
    availability_pct: 98.2,
    budget: { allowed_failures: 5.04, remaining_fraction: -2.6, consumed_fraction: 3.6 },
    reasons: ["the error budget for the window is exhausted"],
  });
  const model = rowModel(CFG, envelopeWith(entry));
  assert.equal(model.stateLabel, "budget exhausted");
  assert.equal(model.stateClass, "blown");
  assert.equal(model.budgetText, "exhausted (-260%)");
  assert.equal(model.budgetClass, "blown");
  assert.equal(model.budgetFillPct, 0);
  assert.equal(model.measuredClass, "blown");
  assert.equal(model.reasonText, "the error budget for the window is exhausted");
});

test("insufficient, stale, and unavailable states never read as healthy", () => {
  for (const [state, label] of [
    ["insufficient_evidence", "insufficient evidence"],
    ["stale_evidence", "stale evidence"],
    ["unavailable_source", "source unavailable"],
    ["malformed_evidence", "malformed evidence"],
  ]) {
    const entry = healthyEntry({
      state,
      availability_pct: null,
      budget: { allowed_failures: null, remaining_fraction: null, consumed_fraction: null },
      reasons: [`fixture reason for ${state}`],
    });
    const model = rowModel(CFG, envelopeWith(entry));
    assert.equal(model.stateLabel, label);
    assert.notEqual(model.stateClass, "ok");
    assert.equal(model.measuredText, "no data");
    assert.equal(model.budgetText, "no verdict");
    assert.equal(model.budgetClass, "muted");
  }
});

test("a service in the unmeasured list says so with its reason", () => {
  const model = rowModel(
    { ...CFG, id: "atlas-vault" },
    envelopeWith(healthyEntry()),
  );
  assert.equal(model.stateLabel, "unmeasured");
  assert.match(model.reasonText, /no approved objective/);
});

test("malformed payloads degrade to invalid envelopes, not crashes", () => {
  for (const payload of [
    null,
    42,
    "nope",
    {},
    { ok: false },
    { ok: true, report: null },
    { ok: true, report: { results: "not-an-array" } },
  ]) {
    const envelope = interpretEnvelope(payload);
    assert.equal(envelope.valid, false);
    const model = rowModel(CFG, envelope);
    assert.equal(model.stateLabel, "unavailable");
    assert.equal(model.measuredText, "no data");
  }
});

test("hostile strings stay data because rendering uses textContent only", () => {
  const entry = healthyEntry({
    reasons: ["<img src=x onerror=alert(1)>"],
  });
  const model = rowModel(CFG, envelopeWith(entry));
  assert.equal(model.reasonText, "<img src=x onerror=alert(1)>");
});

test("the footer note names staleness and policy problems", () => {
  assert.match(noteText(interpretEnvelope(null)), /unavailable/);
  const fresh = envelopeWith(healthyEntry());
  assert.match(noteText(fresh), /derived every 10 minutes/);
  assert.match(noteText(fresh), /measuring since 2026-07-13/);
  const stale = envelopeWith(healthyEntry(), { stale: true });
  assert.match(noteText(stale), /shown as stale/);
  const stalePolicy = envelopeWith(healthyEntry(), { policy_state: "stale" });
  assert.match(noteText(stalePolicy), /policy stale/);
});
