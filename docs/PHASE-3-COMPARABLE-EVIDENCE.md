# Phase 3 comparable interface evidence

Status keeps its existing product-specific deterministic browser assertions and adds a separate cross-product evidence record using `atlas-public-interface/evidence/v1`.

The comparable record covers Chrome and Firefox at 320, 375, 768, 1024, 1440, and reporting-only 1920 pixel widths. It records semantic structure, accessibility findings through WCAG 2.2 AA tags, keyboard focus, console and page errors, failed requests, HTTP errors, request counts, transfer sizes, and CSS and JavaScript resource counts.

Product findings are reporting-only during Phase 3. Existing Status contract failures remain blocking. The runner uses the established deterministic unavailable-data fixture and does not call mutation endpoints, require browser secrets, or change production deployment behaviour.
