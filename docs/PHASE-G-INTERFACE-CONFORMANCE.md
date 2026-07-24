# Phase G: Public Interface V2 conformance

## Outcome

Declare the Status browser interface through the accepted
`atlas-control-plane/public-interface-surface/v1` manifest and validate it
against a pinned, merged `atlas-infra` authority.

This is a nonvisual governance adoption. It does not change live status
semantics, evidence freshness, objectives, events, repository-native tests,
deployment, or provider configuration.

## Boundary

The declaration covers `https://status.atlas-systems.uk/`. JSON status, health,
reliability, and evidence endpoints remain machine-facing and outside the
browser contract. Runtime state evidence remains separate from interface
conformance.

## Authority and evidence

- authority commit: `e40d5a5cee6001df17918f69700aebb85d3d1cdd`;
- declaration: `.atlas/public-interface.json`;
- validator: `atlas-infra/scripts/validate_public_interface.py`;
- evidence retention: 14 days.

The conformance job is read-only, validates the exact candidate commit, verifies
the pinned authority SHA, and fails closed if the manifest repository identity
does not match the caller.

## Local validation

```bash
python3 ../atlas-infra/scripts/validate_public_interface.py \
  --root ../atlas-infra \
  --manifest .atlas/public-interface.json
```

## Rollback

Revert the Phase G commit. No runtime or production deployment is changed by
the conformance declaration.
