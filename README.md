<div align="center">
  <img src="https://raw.githubusercontent.com/AtlasReaper311/AtlasReaper311/main/atlas-icon-dark-256.png" width="88" alt="Atlas Systems"/>
</div>

# status


┌─────────────────────────────────────────────┐
│ ATLAS SYSTEMS // status │
│ every public service checked from one │
│ live status surface │
└─────────────────────────────────────────────┘


[![Deploy](https://github.com/AtlasReaper311/status/actions/workflows/deploy.yml/badge.svg)](https://github.com/AtlasReaper311/status/actions)
![Static](https://img.shields.io/badge/static-html%2Fcss%2Fjs-f5a623?style=flat-square&labelColor=0a0a0f)
![Cloudflare Pages](https://img.shields.io/badge/cloudflare-pages-4ade80?style=flat-square&labelColor=0a0a0f)
![Cost](https://img.shields.io/badge/cost-%C2%A30-aaa9a0?style=flat-square&labelColor=0a0a0f)

Public status page for Atlas Systems. It checks the live service surface from the browser and renders the current state without screenshots, stale claims, or manually written incident text.

## Service model

The status page should read from the same registry and public API surface as the Lab system map. Its fallback list exists only so the page can still show a useful degraded state if the registry itself is unavailable.

## Usage

```bash
curl https://status.atlas-systems.uk

The page re-checks services every 30 seconds and reports each endpoint as operational, unreachable, or timed out.

How it fits into Atlas Systems

status sits above atlas-api-public, atlas-api-index, atlas-notify, github-pulse, site-pulse, and deploy-watch. It is the public health view of the same estate that the portfolio and Lab page describe.

A status page earns trust when it reads from the system it claims to observe.

Part of atlas-systems.uk

---
