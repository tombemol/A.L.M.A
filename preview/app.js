const demoProducts = [
  {
    id: "rol-6204",
    sku: "ROL-6204",
    name: "Rolamento 6204 2RS",
    category: "Mecânica / Rolamentos",
    baseUnit: "UN",
    identifier: "789100006204",
    manufacturer: "SKF",
    primaryLocation: "ALM-01 / B / E03 / P02 / 04",
    positions: [
      { path: "ALM-01 / B / E03 / P02 / 04", primary: true, mode: "DEDICATED" },
      { path: "ALM-01 / B / E03 / P04 / 01", primary: false, mode: "SHARED" },
    ],
    conversions: [{ unit: "CX", factor: 10 }],
    status: "Ativo",
  },
  {
    id: "dj32",
    sku: "ELE-DJ32",
    name: "Disjuntor DIN 32A Curva C",
    category: "Elétrica / Proteção",
    baseUnit: "UN",
    identifier: "789200003232",
    manufacturer: "WEG",
    primaryLocation: "ALM-01 / C / E02 / P01 / 03",
    positions: [{ path: "ALM-01 / C / E02 / P01 / 03", primary: true, mode: "SHARED" }],
    conversions: [{ unit: "CX", factor: 12 }],
    status: "Ativo",
  },
  {
    id: "epi-luva",
    sku: "EPI-LUVA-NIT",
    name: "Luva Nitrílica Industrial",
    category: "EPI / Mãos",
    baseUnit: "PAR",
    identifier: "789300001008",
    manufacturer: "Volk",
    primaryLocation: "ALM-02 / A / E01 / P03 / 02",
    positions: [{ path: "ALM-02 / A / E01 / P03 / 02", primary: true, mode: "DEDICATED" }],
    conversions: [{ unit: "CX", factor: 50 }],
    status: "Ativo",
  },
  {
    id: "correia-a42",
    sku: "MEC-COR-A42",
    name: "Correia Industrial A42",
    category: "Mecânica / Transmissão",
    baseUnit: "UN",
    identifier: "789410004242",
    manufacturer: "Gates",
    primaryLocation: "ALM-01 / B / E04 / P01 / 02",
    positions: [{ path: "ALM-01 / B / E04 / P01 / 02", primary: true, mode: "SHARED" }],
    conversions: [],
    status: "Ativo",
  },
  {
    id: "contator-cwm18",
    sku: "ELE-CWM18",
    name: "Contator CWM18 220V",
    category: "Elétrica / Comando",
    baseUnit: "UN",
    identifier: "789520018220",
    manufacturer: "WEG",
    primaryLocation: "ALM-01 / C / E02 / P01 / 03",
    positions: [{ path: "ALM-01 / C / E02 / P01 / 03", primary: true, mode: "SHARED" }],
    conversions: [],
    status: "Ativo",
  },
  {
    id: "oculos-seg",
    sku: "EPI-OCULOS-INC",
    name: "Óculos de Segurança Incolor",
    category: "EPI / Olhos",
    baseUnit: "UN",
    identifier: "789630000110",
    manufacturer: "Kalipso",
    primaryLocation: "ALM-02 / A / E01 / P02 / 01",
    positions: [{ path: "ALM-02 / A / E01 / P02 / 01", primary: true, mode: "SHARED" }],
    conversions: [{ unit: "CX", factor: 12 }],
    status: "Ativo",
  },
];

const demoLocations = [
  { warehouse: "ALM-01", code: "B-E03-P02-04", path: "ALM-01 / Corredor B / Estante E03 / Prateleira P02 / Posição 04", mode: "DEDICATED", products: ["rol-6204"] },
  { warehouse: "ALM-01", code: "B-E03-P04-01", path: "ALM-01 / Corredor B / Estante E03 / Prateleira P04 / Posição 01", mode: "SHARED", products: ["rol-6204", "correia-a42"] },
  { warehouse: "ALM-01", code: "C-E02-P01-03", path: "ALM-01 / Corredor C / Estante E02 / Prateleira P01 / Posição 03", mode: "SHARED", products: ["dj32", "contator-cwm18"] },
  { warehouse: "ALM-01", code: "B-E04-P01-02", path: "ALM-01 / Corredor B / Estante E04 / Prateleira P01 / Posição 02", mode: "SHARED", products: ["correia-a42"] },
  { warehouse: "ALM-02", code: "A-E01-P03-02", path: "ALM-02 / Corredor A / Estante E01 / Prateleira P03 / Posição 02", mode: "DEDICATED", products: ["epi-luva"] },
  { warehouse: "ALM-02", code: "A-E01-P02-01", path: "ALM-02 / Corredor A / Estante E01 / Prateleira P02 / Posição 01", mode: "SHARED", products: ["oculos-seg"] },
];

const demoInventoryBalances = [
  {
    productId: "rol-6204",
    location: "ALM-01 / B / E03 / P02 / 04",
    quantity: 18,
    unit: "UN",
    averageUnitCost: 14.75,
    totalValue: 265.5,
    tracking: "Lote LOTE-2026-09 · validade 30/09/2027",
  },
  {
    productId: "dj32",
    location: "ALM-01 / C / E02 / P01 / 03",
    quantity: 12,
    unit: "UN",
    averageUnitCost: 38.2,
    totalValue: 458.4,
    tracking: "Sem rastreabilidade obrigatória",
  },
  {
    productId: "contator-cwm18",
    location: "ALM-01 / C / E02 / P01 / 03",
    quantity: 1,
    unit: "UN",
    averageUnitCost: 128.9,
    totalValue: 128.9,
    tracking: "Serial SER-ALMA-001",
  },
  {
    productId: "epi-luva",
    location: "ALM-02 / A / E01 / P03 / 02",
    quantity: 24,
    unit: "PAR",
    averageUnitCost: 8.4,
    totalValue: 201.6,
    tracking: "Lote EPI-2609",
  },
];

const demoMovements = [
  { type: "Entrada", productId: "rol-6204", quantity: "+10 UN", detail: "NF-001 · custo R$ 14,75", time: "10:42" },
  { type: "Transferência", productId: "rol-6204", quantity: "4 UN", detail: "B/E03/P02/04 → B/E03/P04/01", time: "10:18" },
  { type: "Ajuste +", productId: "contator-cwm18", quantity: "+1 UN", detail: "Contagem física · SER-ALMA-001", time: "09:53" },
  { type: "Entrada", productId: "epi-luva", quantity: "+24 PAR", detail: "NF-8741 · lote EPI-2609", time: "08:31" },
];

const pageTitles = {
  dashboard: "Visão geral",
  products: "Catálogo de produtos",
  locations: "Localizações físicas",
  inventory: "Estoque e movimentações",
  scanner: "Leitor de materiais",
};

const occupancyLabels = { DEDICATED: "Dedicada", SHARED: "Compartilhada" };
const demoScanSequence = ["789100006204", "ELE-DJ32", "789300001008"];
let activeCategory = "all";
let scanIndex = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function productById(id) {
  return demoProducts.find((product) => product.id === id);
}

function occupancyLabel(mode) {
  return occupancyLabels[mode] ?? mode;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function setActiveView(viewName) {
  $$('[data-view]').forEach((view) => {
    const active = view.dataset.view === viewName;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });
  $$('[data-nav]').forEach((item) => {
    const active = item.dataset.nav === viewName;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-current", active ? "page" : "false");
  });
  $("#page-title").textContent = pageTitles[viewName] ?? "A.L.M.A.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderDashboard() {
  const totalValue = demoInventoryBalances.reduce((sum, item) => sum + item.totalValue, 0);
  const kpis = [
    ["Produtos ativos", demoProducts.length, "▦", "Catálogo de demonstração"],
    ["Posições mapeadas", demoLocations.length, "⌖", "2 almoxarifados"],
    ["Posições com saldo", demoInventoryBalances.length, "▤", "Fase 1C demonstrada"],
    ["Valor demonstrado", formatCurrency(totalValue), "◇", "Custo médio por produto"],
  ];
  $("#kpi-grid").innerHTML = kpis
    .map(([label, value, icon, foot]) => `<article class="kpi-card"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-icon">${icon}</span></div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></article>`)
    .join("");
  $("#recent-products").innerHTML = demoProducts
    .slice(0, 4)
    .map((product) => `<button class="compact-item" type="button" data-product-open="${product.id}"><span class="item-glyph">${escapeHtml(product.name.slice(0, 1))}</span><span><span class="item-title">${escapeHtml(product.name)}</span><span class="item-meta">${escapeHtml(product.sku)} · ${escapeHtml(product.primaryLocation)}</span></span><span class="item-tag">${escapeHtml(product.baseUnit)}</span></button>`)
    .join("");
}

function productMatches(product, query) {
  const haystack = [product.sku, product.name, product.category, product.identifier, product.manufacturer].join(" ").toUpperCase();
  return haystack.includes(query.trim().toUpperCase());
}

function renderProducts(query = "") {
  const filtered = demoProducts.filter(
    (product) =>
      (activeCategory === "all" || product.category.startsWith(activeCategory)) &&
      productMatches(product, query),
  );
  $("#product-results-meta").textContent = `${filtered.length} produto${filtered.length === 1 ? "" : "s"} encontrado${filtered.length === 1 ? "" : "s"}`;
  $("#product-grid").innerHTML = filtered.length
    ? filtered
        .map((product) => `<button class="product-card" type="button" data-product-open="${product.id}"><div class="product-card-header"><span class="sku">${escapeHtml(product.sku)}</span><span class="status-dot-label">● ${escapeHtml(product.status)}</span></div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)} · ${escapeHtml(product.manufacturer)}</p><div class="location-line"><span>⌖</span><span>${escapeHtml(product.primaryLocation)}</span></div></button>`)
        .join("")
    : `<div class="empty-state">Nenhum produto corresponde à busca ou ao filtro selecionado.</div>`;
}

function openProduct(productId) {
  const product = productById(productId);
  if (!product) return;
  $("#dialog-product-name").textContent = product.name;
  $("#product-detail-content").innerHTML = `<div class="detail-list"><div class="detail-row"><span>SKU</span><strong>${escapeHtml(product.sku)}</strong></div><div class="detail-row"><span>Categoria</span><strong>${escapeHtml(product.category)}</strong></div><div class="detail-row"><span>Fabricante</span><strong>${escapeHtml(product.manufacturer)}</strong></div><div class="detail-row"><span>Unidade base</span><strong>${escapeHtml(product.baseUnit)}</strong></div></div><section class="detail-section"><h4>Identificadores</h4><div class="tag-row"><span class="info-tag">SKU · ${escapeHtml(product.sku)}</span><span class="info-tag">EAN · ${escapeHtml(product.identifier)}</span></div></section><section class="detail-section"><h4>Conversões</h4><div class="tag-row">${product.conversions.length ? product.conversions.map((conversion) => `<span class="info-tag">1 ${escapeHtml(conversion.unit)} = ${conversion.factor} ${escapeHtml(product.baseUnit)}</span>`).join("") : `<span class="info-tag">Sem unidade alternativa</span>`}</div></section><section class="detail-section"><h4>Posições associadas</h4><div class="position-list">${product.positions.map((position) => `<div class="position-row ${position.primary ? "primary" : ""}"><strong>${escapeHtml(position.path)}</strong><small>${position.primary ? "★ Localização principal · " : ""}${escapeHtml(occupancyLabel(position.mode))}</small></div>`).join("")}</div></section>`;
  $("#product-dialog").showModal();
}

function renderLocations() {
  const warehouse = $("#warehouse-select").value;
  const locations = demoLocations.filter((location) => location.warehouse === warehouse);
  const shared = locations.filter((location) => location.mode === "SHARED").length;
  const dedicated = locations.filter((location) => location.mode === "DEDICATED").length;
  const associations = locations.reduce((sum, location) => sum + location.products.length, 0);
  $("#location-summary").innerHTML = `<article class="summary-card"><strong>${locations.length}</strong><span>Posições mapeadas</span></article><article class="summary-card"><strong>${dedicated} / ${shared}</strong><span>Dedicadas / Compartilhadas</span></article><article class="summary-card"><strong>${associations}</strong><span>Associações produto-posições</span></article>`;
  $("#location-grid").innerHTML = locations
    .map((location) => `<article class="location-card"><div class="location-card-top"><div><div class="location-code">${escapeHtml(location.code)}</div><div class="breadcrumb">${escapeHtml(location.path)}</div></div><span class="mode-chip ${location.mode}">${escapeHtml(occupancyLabel(location.mode))}</span></div><div class="location-products">${location.products.map((id) => { const product = productById(id); return `<button class="location-product" type="button" data-product-open="${id}"><strong>${escapeHtml(product?.sku ?? id)}</strong><small>${escapeHtml(product?.name ?? "Produto")}</small></button>`; }).join("")}</div></article>`)
    .join("");
}

function renderInventory() {
  const totalQuantity = demoInventoryBalances.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = demoInventoryBalances.reduce((sum, item) => sum + item.totalValue, 0);
  const tracked = demoInventoryBalances.filter((item) => !item.tracking.startsWith("Sem ")).length;
  const focalCost = demoInventoryBalances.find((item) => item.productId === "rol-6204")?.averageUnitCost ?? 0;

  const summary = [
    ["Saldo total", totalQuantity, "Quantidades em unidades base"],
    ["Valor estimado", formatCurrency(totalValue), "Valorização da demonstração"],
    ["Custo médio", formatCurrency(focalCost), "ROL-6204 na demonstração"],
    ["Lotes / seriais", tracked, "Itens com rastreabilidade"],
  ];
  $("#inventory-summary").innerHTML = summary
    .map(([label, value, foot]) => `<article class="summary-card inventory-summary-card"><span>${label}</span><strong>${value}</strong><small>${foot}</small></article>`)
    .join("");

  $("#inventory-balances").innerHTML = demoInventoryBalances
    .map((item) => {
      const product = productById(item.productId);
      return `<article class="inventory-balance"><div><span class="sku">${escapeHtml(product?.sku ?? item.productId)}</span><strong>${escapeHtml(product?.name ?? "Produto")}</strong><small>⌖ ${escapeHtml(item.location)}</small><small class="tracking-note">${escapeHtml(item.tracking)}</small><small>Custo médio ${formatCurrency(item.averageUnitCost)} · Valor ${formatCurrency(item.totalValue)}</small></div><div class="inventory-qty"><strong>${item.quantity}</strong><span>${escapeHtml(item.unit)}</span></div></article>`;
    })
    .join("");

  $("#inventory-movements").innerHTML = demoMovements
    .map((movement) => {
      const product = productById(movement.productId);
      return `<article class="movement-row"><span class="movement-type">${escapeHtml(movement.type)}</span><div><strong>${escapeHtml(product?.sku ?? movement.productId)}</strong><small>${escapeHtml(movement.detail)}</small></div><div class="movement-qty">${escapeHtml(movement.quantity)}<small>${escapeHtml(movement.time)}</small></div></article>`;
    })
    .join("");
}

function resolveDemoIdentifier(value) {
  const normalized = value.trim().toUpperCase();
  return demoProducts.find((product) => [product.sku, product.identifier].some((candidate) => candidate.toUpperCase() === normalized));
}

function renderScanResult(product, rawCode) {
  const container = $("#scan-result");
  if (!product) {
    container.innerHTML = `<div class="empty-result"><span class="result-icon">×</span><strong>Código não encontrado</strong><p>Nenhum produto da demonstração corresponde a <b>${escapeHtml(rawCode)}</b>.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="scan-product"><div class="scan-product-head"><div><span class="eyebrow">Material identificado</span><h3>${escapeHtml(product.name)}</h3></div><span class="status-pill live">OK</span></div><div class="detail-list"><div class="detail-row"><span>SKU</span><strong>${escapeHtml(product.sku)}</strong></div><div class="detail-row"><span>Código lido</span><strong>${escapeHtml(rawCode)}</strong></div><div class="detail-row"><span>Fabricante</span><strong>${escapeHtml(product.manufacturer)}</strong></div><div class="detail-row"><span>Unidade</span><strong>${escapeHtml(product.baseUnit)}</strong></div></div><div class="scan-location"><small>Localização principal</small><strong>${escapeHtml(product.primaryLocation)}</strong></div><button class="secondary-action" type="button" data-product-open="${product.id}">Abrir ficha completa</button></div>`;
}

function simulateScan() {
  const code = demoScanSequence[scanIndex % demoScanSequence.length];
  scanIndex += 1;
  $("#manual-code").value = code;
  renderScanResult(resolveDemoIdentifier(code), code);
}

function updateClock() {
  const now = new Date();
  $("#clock-time").textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  $("#clock-date").textContent = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "").toUpperCase();
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    setActiveView(nav.dataset.nav);
    return;
  }
  const productButton = event.target.closest("[data-product-open]");
  if (productButton) openProduct(productButton.dataset.productOpen);
});

$("#product-search").addEventListener("input", (event) => renderProducts(event.target.value));
$("#clear-search").addEventListener("click", () => {
  $("#product-search").value = "";
  renderProducts("");
  $("#product-search").focus();
});
$$('[data-category]').forEach((button) =>
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    $$('[data-category]').forEach((item) => item.classList.toggle("is-active", item === button));
    renderProducts($("#product-search").value);
  }),
);
$("#warehouse-select").addEventListener("change", renderLocations);
$("#simulate-scan").addEventListener("click", simulateScan);
$("#focus-manual").addEventListener("click", () => $("#manual-code").focus());
$("#manual-scan-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const code = $("#manual-code").value;
  renderScanResult(resolveDemoIdentifier(code), code);
});
$(".close-dialog").addEventListener("click", () => $("#product-dialog").close());
$("#product-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
$("#demo-status").addEventListener("click", () =>
  alert("Demonstração estática: os dados visuais são simulados. A API da Fase 1C já possui ledger, saldos, rastreabilidade e movimentações transacionais."),
);

renderDashboard();
renderProducts();
renderLocations();
renderInventory();
updateClock();
setInterval(updateClock, 30000);
