// Trailhead Supply: a tiny fictional shop with two PLANTED bugs for the Repro Offline demo.
const PRODUCTS = [
  ["ridgeline-2p", "Ridgeline 2P", "Tents", 289, true],
  ["ridgeline-3p", "Ridgeline 3P", "Tents", 349, true],
  ["cirrus-ul-1p", "Cirrus UL 1P", "Tents", 399, false],
  ["basecamp-4p", "Basecamp 4P", "Tents", 459, true],
  ["switchback-28l", "Switchback 28L", "Packs", 129, true],
  ["switchback-45l", "Switchback 45L", "Packs", 179, true],
  ["daytrip-18l", "Daytrip 18L", "Packs", 79, false],
  ["summit-headlamp", "Summit Headlamp", "Lighting", 49, true],
  ["lantern-mini", "Lantern Mini", "Lighting", 35, false],
  ["trail-kettle", "Trail Kettle", "Cookware", 42, true],
  ["nesting-pot-set", "Nesting Pot Set", "Cookware", 64, true],
  ["spork-pair", "Spork Pair", "Cookware", 12, true],
].map(([slug, name, category, price, inStock]) => ({ slug, name, category, price, inStock }));
const CATEGORIES = ["All", "Tents", "Packs", "Lighting", "Cookware"];

// Keep the intentionally lost-scroll bug reproducible across browser history restoration.
history.scrollRestoration = "manual";
let activeCategory = "All";
const app = document.getElementById("app");
const inStockOnly = () => sessionStorage.getItem("inStockOnly") === "1";

function renderList() {
  activeCategory = "All"; // BUG(planted): resets filter on every render
  drawList();
}

function drawList() {
  const items = PRODUCTS.filter(
    (p) => (activeCategory === "All" || p.category === activeCategory) && (!inStockOnly() || p.inStock),
  );
  const byCat = CATEGORIES.slice(1)
    .map((c) => [c, items.filter((p) => p.category === c)])
    .filter(([, ps]) => ps.length);
  app.innerHTML = `
    <div class="controls">
      ${CATEGORIES.map((c) => `<button class="cat" data-cat="${c}" aria-pressed="${c === activeCategory}">${c}</button>`).join("")}
      <label class="stock"><input type="checkbox" id="stock" ${inStockOnly() ? "checked" : ""}/> In stock only</label>
    </div>
    <div class="grid">
      ${byCat.map(([c, ps]) => `<h2 class="section-h">${c}</h2>` + ps.map(card).join("")).join("")}
    </div>`;
  app.querySelectorAll(".cat").forEach((b) =>
    b.addEventListener("click", () => {
      activeCategory = b.dataset.cat;
      drawList();
    }),
  );
  app.querySelector("#stock").addEventListener("change", (e) => {
    sessionStorage.setItem("inStockOnly", e.target.checked ? "1" : "0");
    drawList();
  });
}

function card(p) {
  return `<a class="card" href="#/product/${p.slug}"><div class="ph ${p.category}"></div><div class="info"><div class="name">${p.name}</div><div class="meta"><span>$${p.price}</span><span class="${p.inStock ? "" : "out"}">${p.inStock ? "In stock" : "Out of stock"}</span></div></div></a>`;
}

function renderDetail(slug) {
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) return renderList();
  app.innerHTML = `
    <a class="back" href="#/">← Back to products</a>
    <div class="detail"><div class="ph ${p.category}"></div><div>
      <h1>${p.name}</h1><p>${p.category} · $${p.price} · ${p.inStock ? "In stock" : "Out of stock"}</p>
      <p>Trail-tested and built to last. This product is fictional.</p>
      <button class="buy" id="buy">Add to cart</button></div></div>`;
  document.getElementById("buy").addEventListener("click", () => {
    const t = document.getElementById("toast");
    t.textContent = "Added to cart (demo, nothing happens)";
    t.className = "toast on";
    setTimeout(() => (t.className = "toast"), 1600);
  });
}

function route() {
  const m = location.hash.match(/^#\/product\/(.+)$/);
  if (m) renderDetail(m[1]);
  else renderList();
  window.scrollTo(0, 0); // BUG(planted): always scrolls to top
}

window.addEventListener("hashchange", route);
route();
