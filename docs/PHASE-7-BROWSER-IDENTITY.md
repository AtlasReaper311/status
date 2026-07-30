# Phase 7 browser identity

## Finding

The Status root already satisfies the accepted browser-identity contract:

- page-first title and description;
- exact canonical and Open Graph URL;
- route-specific 1200 by 630 social card;
- matching Open Graph and Twitter image alt text;
- complete local icon package and web manifest;
- Atlas theme colour;
- independent deployment and repository-local interface assets.

The measured gap was error identity. The repository had no owned `404.html`, so unknown paths depended on provider fallback behaviour rather than the Status product contract.

## Change

`404.html` provides a bounded Status error surface with:

- `404 // Status // Atlas Systems` title;
- explanatory description;
- `noindex, follow`;
- no canonical URL because the requested path is arbitrary;
- no Open Graph or Twitter card because errors are outside the social graph;
- repository-local icons, manifest, fonts, interface styles, and footer styles;
- Status product identity, route recovery, source evidence, and Atlas estate escape;
- no live service checks, reliability requests, activity polling, or mutation.

## Protected boundaries

This change does not modify:

- root-page metadata or presentation;
- service checks or their 30-second cadence;
- API-derived reliability verdicts;
- `slo.json` or policy projection;
- activity-feed ownership;
- deployment configuration;
- provider settings or secrets.

## Validation

The repository-native suite must validate both root and error identities, local assets, HTML, existing module tests, interface conformance, and the existing provider-gated preview workflow.

## Rollout boundary

This branch stops at a draft pull request. A later merge will trigger the normal Status Pages deployment and requires separate rollout approval and live verification.
