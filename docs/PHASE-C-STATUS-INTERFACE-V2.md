# Phase C: Status Interface V2 migration

## Goal

Bring `status.atlas-systems.uk` under Public Interface System v2 without changing the operational evidence model or coupling its deployment to another public surface.

## Source authority

- Governance: `AtlasReaper311/atlas-infra` policy `public-interface-system-v2.json`
- Interface bundle: repository-local copy of `atlas-interface-kit` v0.1.1
- Status behaviour: this repository's existing registry probes, reliability evaluator consumer, and activity feed

## Invariants

- The visitor-side service checks still use the public registry with the existing bounded fallback list and 30-second refresh.
- Service-level verdicts still come from `/v1/reliability`; `slo.json` remains the generated row projection.
- Recent activity still comes from `atlas-notify` and preserves last-good data when a later poll fails.
- `Operational`, `Degraded`, `Unavailable`, `Unknown`, and initial `Checking` remain evidence-backed states.
- Missing, malformed, stale, or unreachable evidence never renders as healthy.
- Status remains a static, independently deployed Cloudflare Pages surface.
- No remote runtime stylesheet, new paid service, production write, monitoring rewrite, or endpoint contract change is introduced.

## Interface changes

- Materialize the accepted shell in source HTML: wordmark and aggregate status on the left, Work/Writing/Lab/Systems/About in the centre, and compact estate search on the right.
- Add the repository-local v0.1.1 interface bundle and verify its exact manifest fingerprints.
- Use the accepted mobile bottom navigation while retaining wordmark, status, and search in the top header.
- Keep Status product identity visible directly below the global header.
- Raise body and supporting copy to the accepted type scale, retain operational density for evidence rows, and keep metadata at 11px or above.
- Keep touch targets at least 44px on touch layouts, visible focus, reduced-motion behaviour, one H1, one main landmark, and no horizontal overflow.
- Materialize canonical metadata and browser icon links in source rather than relying on runtime mutation.

## Preview and acceptance

- Static HTML, title, JSON, bundle-fingerprint, link, and module tests pass.
- Chrome and Firefox capture the Status route at 320, 375, 768, 1024, and 1440 pixels.
- Deterministic unavailable fixtures are separate from live-data contract tests.
- Serious or critical accessibility findings, page errors, missing landmarks, wrong navigation, hidden focus, fixed-navigation overlap, or horizontal overflow fail evidence capture.
- Preview evidence is tied to the pull request head commit and retained for 14 days.
- The pull request remains unmerged until manual visual approval.

## Rollback

Revert the Phase C commit in `status`. The prior static page, data consumers, deployment workflow, and public routes remain independently recoverable because this migration does not alter their contracts.
