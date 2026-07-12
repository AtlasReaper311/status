<div align="center">
  <img src="https://raw.githubusercontent.com/AtlasReaper311/AtlasReaper311/main/atlas-icon-dark-256.png" width="88" alt="Atlas Systems"/>
</div>

# status

```
┌─────────────────────────────────────────────┐
│  ATLAS SYSTEMS // status                    │
│  live checks, error budgets, and the        │
│  estate event stream on one surface         │
└─────────────────────────────────────────────┘
```

[![Deploy](https://github.com/AtlasReaper311/status/actions/workflows/deploy.yml/badge.svg)](https://github.com/AtlasReaper311/status/actions)
![Static](https://img.shields.io/badge/static-html%2Fcss%2Fjs-f5a623?style=flat-square&labelColor=0a0a0f)
![Cloudflare Pages](https://img.shields.io/badge/cloudflare-pages-4ade80?style=flat-square&labelColor=0a0a0f)
![Cost](https://img.shields.io/badge/cost-%C2%A30-aaa9a0?style=flat-square&labelColor=0a0a0f)

Public status page for Atlas Systems, in three sections: a live signal grid checked from the visitor's browser, formal SLOs with error budget burn-down computed from probe history the edge accrues server-side, and a chronological feed of recent estate activity. Nothing here is a screenshot or a manually written incident line; every number traces to a request that actually happened.

## Service model

The live signal grid reads from the same registry and public API surface as the Lab system map, with a fallback list so the page still shows a useful degraded state if the registry itself is unavailable. Each tile is a real request from the visitor's browser, repeated every 30 seconds, reporting operational, unreachable, or timed out, with the round trip in milliseconds.

## Service levels

SLO targets live in [`slo.json`](slo.json) in this repo, so tuning a target is a one-line commit here and never a Worker change. The counters behind them come from `api.atlas-systems.uk/v1/slo`: [`atlas-api-public`](https://github.com/AtlasReaper311/atlas-api-public) probes ten estate components every 10 minutes on its cron, accrues per-day `ok/total` buckets into a single KV document, records round-trip milliseconds for successful probes, and prunes buckets older than the 30 day rolling window. That store predates this page (it was built for `/v1/stats`); this page adds coverage and a raw read route rather than a second store.

The error budget maths runs client-side because every input arrives labelled: the window, the measurement start date, and every day bucket are in the response. For a target T over N probes, the allowance is `(1 - T) x N` failures; what remains of that allowance is the remaining budget, and a negative number renders as plainly as a healthy one.

Two target tiers, on purpose. Edge Workers carry 99 to 99.5 percent targets because they run 24/7 on Cloudflare. Machine-domain services (`atlas-corpus`, `specular-telemetry`, and `ramone-memory` via the sentinel verdict) carry 75 percent, because the machine that runs them sleeps, and a target the service can never meet by design is theatre, not engineering. `ramone-memory` is LAN-only by design and cannot be probed from the edge at all; it is measured through the `SPECULAR-CORE` sentinel verdict, the same mapping [`specular-sonify`](https://github.com/AtlasReaper311/specular-sonify) already uses, and the page says so on the row.

## Honesty rules

Three rules the page holds itself to, both new sections:

1. A service with fewer observed days than the window says so explicitly (`3 of 30 days · since 2026-07-10`) instead of presenting a misleadingly precise 30 day figure computed from three days of data. A component with no counters yet says `no data yet`, not zero percent.
2. If the probe history endpoint or the event feed is unreachable, the page shows a clear unavailable state on first load, and keeps the last successful read on screen (marked stale) on later failures. A failed poll never silently empties a section.
3. A blown error budget is the entire point of the feature, not an error state to hide. It renders in red, with the negative percentage, as plainly as a healthy budget renders in green.

## Recent activity

The activity feed reads `api.atlas-systems.uk/notify/recent`, the ring buffer [`atlas-notify`](https://github.com/AtlasReaper311/atlas-notify) already persists for the Lab page's Failure feed: one KV key, the last 200 events, each entry carrying the same summary text as its Discord embed. This page requests the endpoint's 50-entry page ceiling and shows everything, newest first; older entries fall off, and Discord remains the archive.

Reusing that buffer was a decision, not a shortcut. A second event store would need its own ingest path, its own auth, and its own pruning, and the two would disagree the first time one write failed. Every event class this page wants (deploy outcomes, CI results, runtime alerts, pushes) already flows through `atlas-notify` by estate convention, so the Failure feed's store is authoritative by construction. The only cost is the shared 200-entry cap, which suits a recent-activity view.

## Usage

```bash
curl https://status.atlas-systems.uk
curl https://api.atlas-systems.uk/v1/slo
curl "https://api.atlas-systems.uk/notify/recent?limit=50"
```

## How it fits into Atlas Systems

`status` sits above [`atlas-api-public`](https://github.com/AtlasReaper311/atlas-api-public) (probe counters and the SLO source document), [`atlas-api-index`](https://github.com/AtlasReaper311/atlas-api-index), [`atlas-notify`](https://github.com/AtlasReaper311/atlas-notify) (the event stream), [`github-pulse`](https://github.com/AtlasReaper311/github-pulse), [`site-pulse`](https://github.com/AtlasReaper311/site-pulse), and [`deploy-watch`](https://github.com/AtlasReaper311/deploy-watch). It is the public health view of the same estate that the portfolio and Lab page describe.

A status page earns trust when it reads from the system it claims to observe, and keeps that trust by labelling exactly how much history sits behind every number it shows.

---

Part of [atlas-systems.uk](https://atlas-systems.uk)
