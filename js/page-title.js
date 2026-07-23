const TITLE = "Status // Atlas Systems";

if (typeof document !== "undefined") {
  document.title = TITLE;

  for (const selector of [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
  ]) {
    const meta = document.head.querySelector(selector);
    if (meta) meta.content = TITLE;
  }
}

export { TITLE };