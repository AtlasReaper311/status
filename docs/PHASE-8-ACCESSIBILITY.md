# Phase 8 accessibility correction

Status: implementation candidate for exact-head pull-request validation and isolated browser evidence.

Recorded: 30 July 2026.

## Measured finding

The current Phase 6 comparable evidence records repeated P2 target-size findings on the Status global header. The affected controls are the Atlas Systems wordmark, aggregate-status chip, narrow desktop navigation labels, and estate-search button. The governed Phase 6 footer already satisfies the 44-pixel target contract and is not changed here.

## Change

The repository-local Status shell now gives each affected header control a minimum 44 by 44 pixel target while preserving its current visual label, route, semantic role, and responsive layout.

## Protected boundaries

This change does not alter:

- registry discovery or the service grid;
- service-check cadence or polling;
- reliability calculations, SLO projection, or evidence freshness;
- recent activity retrieval or rendering;
- estate-search behaviour;
- aggregate-status parsing, states, endpoint, timeout, or fallback;
- footer structure or destinations;
- deployment workflows, provider settings, or secrets.

## Evidence boundary

Repository-native pull-request checks validate the exact branch head. The existing provider-gated preview must then capture Chrome and Firefox evidence at 320, 375, 768, 1024, 1440, and reporting-only 1920 pixels before merge approval. Production remains unchanged while this pull request is open.

## Rollback

Before merge, close the pull request and delete the branch. After an approved merge, revert the consumer commit and verify the resulting Status deployment separately.
