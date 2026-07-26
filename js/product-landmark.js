if (typeof document !== "undefined") {
  const productStrip = document.querySelector(".status-product-strip");

  if (productStrip) {
    productStrip.setAttribute("role", "region");
    productStrip.setAttribute("aria-label", "Status product identity");
  }
}
