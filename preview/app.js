const products = [
  {
    id: "rol-6204",
    sku: "ROL-6204",
    name: "Rolamento rígido 6204-2Z",
    description: "Rolamento rígido de esferas 20 × 47 × 14 mm.",
    category: "Mecânica",
    manufacturer: "SKF",
    unit: "UN",
    identifier: "789100006204",
    trackingMode: "LOT_EXPIRY",
    locations: [
      { warehouse: "ALM-01", code: "B-E03-P02-04", path: "Corredor B / Estante 03 / Prateleira 02 / Posição 04", primary: true },
      { warehouse: "ALM-01", code: "B-E03-P02-05", path: "Corredor B / Estante 03 / Prateleira 02 / Posição 05", primary: false },
    ],
  },
  {
    id: "dj32",
    sku: "ELE-DJ32",
    name: "Disjuntor tripolar 32 A",
    description: "Disjuntor termomagnético tripolar para painel industrial.",
    category: "Elétrica",
    manufacturer: "WEG",
    unit: "UN",
    identifier: "789200003232",
    trackingMode: "NONE",
    locations: [{ warehouse: "ALM-01", code: "C-E01-P01-02", path: "Corredor C / Estante 01 / Prateleira 01 / Posição 02", primary: true }],
  },
  {
    id: "epi-luva",
    sku: "EPI-LUVA-NIT",
    name: "Luva nitrílica industrial",
    description: "Luva nitrílica para manutenção e manuseio de componentes.",
    category: "EPI",
    manufacturer: "Volk",
    unit: "PAR",
    identifier: "789300000811",
    trackingMode: "LOT_EXPIRY",
    locations: [{ warehouse: "ALM-02", code: "A-E02-P01-01", path: "Corredor A / Estante 02 / Prateleira 01 / Posição 01", primary: true }],
  },
  {
    id: "correia-a42",
    sku: "MEC-COR-A42",
    name: "Correia em V A42",
    description: "Correia industrial perfil A para transmissão mecânica.",
    category: "Mecânica",
    manufacturer: "Gates",
    unit: "UN",
    identifier: "789400004242",
    trackingMode: "NONE",
    locations: [{ warehouse: "ALM-01", code: "B-E05-P03-01", path: "Corredor B / Estante 05 / Prateleira 03 / Posição 01", primary: true }],
  },
  {
    id: "contator-cwm18",
    sku: "ELE-CWM18",
    name: "Contator CWM18 220 V",
    description: "Contator tripolar para comando de motores.",
    category: "Elétrica",
    manufacturer: "WEG",
    unit: "UN",
    identifier: "789200001818",
    trackingMode: "SERIAL",
    locations: [{ warehouse: "ALM-01", code: "C-E02-P02-03", path: "Corredor C / Estante 02 / Prateleira 02 / Posição 03", primary: true }],
  },
  {
    id: "oculos-seg",
    sku: "EPI-OCULOS-INC",
    name: "Óculos de segurança incolor",
    description: "Óculos de proteção com lente incolor e proteção lateral.",
    category: "EPI",
    manufacturer: "3M",
    unit: "UN",
    identifier: "789300001901",
    trackingMode: "NONE",
    locations: [{ warehouse: "ALM-02", code: "A-E01-P02-02", path: "Corredor A / Estante 01 / Prateleira 02 / Posição 02", primary: true }],
  },
];

const locations = [
  { warehouse: "ALM-01", code: "B-E03-P02-04", path: "Corredor B / Estante 03 / Prateleira 02 / Posição 04", mode: "DEDICATED", products: ["rol-6204"] },
  { warehouse: "ALM-01", code: "B-E03-P02-05", path: "Corredor B / Estante 03 / Prateleira 02 / Posição 05", mode: "SHARED", products: ["rol-6204"] },
  { warehouse: "ALM-01", code: "C-E01-P01-02", path: "Corredor C / Estante 01 / Prateleira 01 / Posição 02", mode: "SHARED", products: ["dj32"] },
  { warehouse: "ALM-01", code: "B-E05-P03-01", path: "Corredor B / Estante 05 / Prateleira 03 / Posição 01", mode: "DEDICATED", products: ["correia-a42"] },
  { warehouse: "ALM-01", code: "C-E02-P02-03", path: "Corredor C / Estante 02 / Prateleira 02 / Posição 03", mode: "SHARED", products: ["contator-cwm18"] },
  { warehouse: "ALM-02", code: "A-E02-P01-01", path: "Corredor A / Estante 02 / Prateleira 01 / Posição 01", mode: "DEDICATED", products: ["epi-luva"] },
  { warehouse: "ALM-02", code: "A-E01-P02-02", path: "Corredor A / Estante 01 / Prateleira 02 / Posição 02", mode: "SHARED", products: ["oculos-seg"] },
];

const inventoryBalances = [
  { productId: "rol-6204", location: "B-E03-P02-04", quantity: 13, averageCost: 14.75, totalValue: 191.75, tracking: "Lote LOTE-2026-09 · validade 30/09/2026" },
  { productId: "rol-6204", location: "B-E03-P02-05", quantity: 5, averageCost: 14.75, totalValue: 73.75, tracking: "Lote LOTE-2026-09 · validade 30/09/2026" },
  { productId: "dj32", location: "C-E01-P01-02", quantity: 12, averageCost: 38.2, totalValue: 458.4, tracking: "Sem rastreabilidade adicional" },
  { productId: "contator-cwm18", location: "C-E02-P02-03", quantity: 1, averageCost: 128.9, totalValue: 128.9, tracking: "Serial SER-ALMA-001" },
  { productId: "epi-luva", location: "A-E02-P01-01", quantity: 24, averageCost: 8.4, totalValue: 201.6, tracking: "Lote EPI-2609 · validade 31/03/2027" },
  { productId: "correia-a42", location: "B-E05-P03-01", quantity: 0, averageCost: 21.3, totalValue: 0, tracking: "Sem rastreabilidade adicional" },
];

const inventoryMovements = [
  { type: "TRANSFER", sku: "ROL-6204", detail: "B-E03-P02-04 → B-E03-P02-05", quantity: "5 UN", time: "12:18" },
  { type: "ENTRY", sku: "EPI-LUVA-NIT", detail: "Entrada em A-E02-P01-01 · NF-10482", quantity: "+24 PAR", time: "11:42" },
  { type: "ADJUSTMENT_IN", sku: "ELE-CWM18", detail: "Contagem física · SER-ALMA-001", quantity: "+1 UN", time: "10:07" },
  { type: "WITHDRAWAL", sku: "ELE-DJ32", detail: "Manutenção elétrica · OS-260916-009", quantity: "-3 UN", time: "09:31" },
];

const withdrawals = [
  { id: "RET-1042", status: "Pendente de aprovação", statusKey: "pending", sku: "EPI-LUVA-NIT", quantity: "2 PAR", department: "Manutenção", destination: "Prensa PR-07 · OS-260916-014", requester: "Carlos Souza", time: "12:31" },
  { id: "RET-1041", status: "Aprovada", statusKey: "approved", sku: "ROL-6204", quantity: "2 UN", department: "Manutenção", destination: "Rebobinadeira RB-02 · OS-260916-012", requester: "João Lima", time: "12:08" },
  { id: "RET-1040", status: "Atendida", statusKey: "fulfilled", sku: "ELE-DJ32", quantity: "3 UN", department: "Elétrica", destination: "Painel QD-03 · OS-260916-009", requester: "Marcos Reis", fulfiller: "Ana Martins", time: "09:31" },
  { id: "RET-1039", status: "Rejeitada", statusKey: "rejected", sku: "EPI-OCULOS-INC", quantity: "8 UN", department: "Produção", destination: "Linha de acabamento", requester: "Paulo Nunes", time: "08:55" },
];

const demoAlerts = [
  { id: "ALT-0081", severity: "critical", severityLabel: "CRÍTICO", type: "Ruptura", sku: "MEC-COR-A42", productName: "Correia em V A42", reading: "Saldo 0 UN · mínimo 4 UN", detectedAt: "12:44", note: "Material indisponível para retirada." },
  { id: "ALT-0082", severity: "warning", severityLabel: "ATENÇÃO", type: "Ponto de reposição", sku: "ELE-DJ32", productName: "Disjuntor tripolar 32 A", reading: "Saldo 12 UN · reposição em 15 UN", detectedAt: "12:44", note: "Saldo atingiu o ponto configurado de reposição." },
  { id: "ALT-0083", severity: "warning", severityLabel: "ATENÇÃO", type: "Validade próxima", sku: "ROL-6204", productName: "Rolamento rígido 6204-2Z", reading: "LOTE-2026-09 · vence em 14 dias", detectedAt: "12:44", note: "18 UN com validade em 30/09/2026." },
  { id: "ALT-0084", severity: "info", severityLabel: "INFO", type: "Fragmentação", sku: "ROL-6204", productName: "Rolamento rígido 6204-2Z", reading: "18 UN distribuídas em 2 posições", detectedAt: "12:44", note: "13 UN na principal e 5 UN em posição secundária." },
];

const demoAuditEvents = [
  { id: "AUDIT-20260916-0007", time: "12:44:09", actor: "Sistema", action: "ALERTS_EVALUATED", entity: "Alert", entityId: "4 condições", summary: "Avaliação operacional concluída", detail: "1 crítico · 2 atenção · 1 informativo" },
  { id: "AUDIT-20260916-0006", time: "12:31:42", actor: "Carlos Souza", action: "WITHDRAWAL_REQUESTED", entity: "WithdrawalRequest", entityId: "RET-1042", summary: "Solicitação criada", detail: "2 PAR · EPI-LUVA-NIT · Manutenção / PR-07" },
  { id: "AUDIT-20260916-0005", time: "12:18:16", actor: "Ana Martins", action: "INVENTORY_TRANSFER", entity: "StockMovement", entityId: "MOV-8821", summary: "Transferência atômica", detail: "ROL-6204 · 5 UN · P02-04 → P02-05" },
  { id: "AUDIT-20260916-0004", time: "12:08:27", actor: "Roberto Alves", action: "WITHDRAWAL_APPROVED", entity: "WithdrawalRequest", entityId: "RET-1041", summary: "Retirada aprovada", detail: "2 UN · ROL-6204 · OS-260916-012" },
  { id: "AUDIT-20260916-0003", time: "11:42:03", actor: "Ana Martins", action: "INVENTORY_ENTRY", entity: "StockMovement", entityId: "MOV-8819", summary: "Entrada registrada", detail: "EPI-LUVA-NIT · +24 PAR · NF-10482" },
  { id: "AUDIT-20260916-0002", time: "10:07:51", actor: "Administrador", action: "INVENTORY_ADJUSTMENT", entity: "StockMovement", entityId: "MOV-8818", summary: "Ajuste com justificativa", detail: "ELE-CWM18 · +1 UN · contagem física" },
  { id: "AUDIT-20260916-0001", time: "09:31:14", actor: "Ana Martins", action: "WITHDRAWAL_FULFILLED", entity: "WithdrawalRequest", entityId: "RET-1040", summary: "Retirada atendida", detail: "ELE-DJ32 · -3 UN · OS-260916-009" },
];

const pageTitles = {
  dashboard: "Visão geral",
  products: "Produtos",
  locations: "Localizações",
  inventory: "Estoque",
  withdrawals: "Retiradas e aprovações",
  alerts: "Alertas operacionais",
  audit: "Auditoria",
  scanner: "Leitor QR e código de barras",
};

const productById = new Map(products.map((product) => [product.id, product]));
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
let activeCategory = "all";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markerClass(kind) {
  return kind ? ` ${kind}` : "";
}

function metricCell(label, value, foot, kind = "") {
  return `<div class="metric-cell"><span class="metric-label"><i class="metric-marker${markerClass(kind)}"></i>${escapeHtml(label)}</span><strong class="metric-value">${escapeHtml(value)}</strong><small class="metric-foot">${escapeHtml(foot)}</small></div>`;
}

function navigate(target) {
  if (!pageTitles[target]) return;
  document.querySelectorAll("[data-view]").forEach((view) => {
    const active = view.dataset.view === target;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });
  document.querySelectorAll("[data-nav]").forEach((button) => button.classList.toggle("is-active", button.dataset.nav === target));
  const title = document.querySelector("#page-title");
  if (title) title.textContent = pageTitles[target];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderDashboard() {
  const totalQuantity = inventoryBalances.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventoryBalances.reduce((sum, item) => sum + item.totalValue, 0);
  const pending = withdrawals.filter((item) => ["pending", "approved"].includes(item.statusKey)).length;
  const critical = demoAlerts.filter((item) => item.severity === "critical").length;

  document.querySelector("#kpi-grid").innerHTML = [
    metricCell("Saldo total", `${number.format(totalQuantity)} itens`, "soma dos saldos por posição", "blue"),
    metricCell("Valor estimado", money.format(totalValue), "custo médio vigente", ""),
    metricCell("Retiradas abertas", String(pending), "aprovação ou atendimento", "amber"),
    metricCell("Alertas ativos", String(demoAlerts.length), `${critical} condição crítica`, critical ? "red" : "green"),
  ].join("");

  document.querySelector("#recent-products").innerHTML = products.slice(0, 5).map((product) => {
    const primary = product.locations.find((location) => location.primary) ?? product.locations[0];
    return `<button class="compact-row" type="button" data-product-id="${escapeHtml(product.id)}"><span><span class="row-code">${escapeHtml(product.sku)}</span><strong class="row-title">${escapeHtml(product.name)}</strong><small class="row-meta">${escapeHtml(primary.warehouse)} / ${escapeHtml(primary.code)}</small></span><span class="product-unit">${escapeHtml(product.unit)}</span></button>`;
  }).join("");

  document.querySelector("#dashboard-alerts").innerHTML = demoAlerts.slice(0, 4).map((alert) => `<button class="operational-row" type="button" data-nav="alerts"><span class="severity-text ${alert.severity}">${escapeHtml(alert.severityLabel)}</span><span><strong class="row-title">${escapeHtml(alert.type)}</strong><small class="row-meta">${escapeHtml(alert.sku)} · ${escapeHtml(alert.reading)}</small></span><span class="row-code">${escapeHtml(alert.detectedAt)}</span></button>`).join("");

  const navCount = document.querySelector("#nav-alert-count");
  if (navCount) navCount.textContent = String(demoAlerts.length);
}

function filteredProducts() {
  const query = (document.querySelector("#product-search")?.value ?? "").trim().toLocaleLowerCase("pt-BR");
  return products.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const haystack = [product.sku, product.name, product.category, product.manufacturer, product.identifier].join(" ").toLocaleLowerCase("pt-BR");
    return matchesCategory && (!query || haystack.includes(query));
  });
}

function renderProducts() {
  const result = filteredProducts();
  const meta = document.querySelector("#product-results-meta");
  if (meta) meta.textContent = `${result.length} de ${products.length} materiais visíveis`;
  const grid = document.querySelector("#product-grid");
  if (!grid) return;
  if (!result.length) {
    grid.innerHTML = '<div class="empty-state">Nenhum material corresponde ao filtro atual.</div>';
    return;
  }
  grid.innerHTML = result.map((product) => {
    const primary = product.locations.find((location) => location.primary) ?? product.locations[0];
    return `<button class="product-row" type="button" data-product-id="${escapeHtml(product.id)}"><span class="product-id"><span class="sku">${escapeHtml(product.sku)}</span><strong>${escapeHtml(product.name)}</strong></span><span class="product-cell">${escapeHtml(product.category)}<br><small>${escapeHtml(product.manufacturer)}</small></span><span class="product-cell"><span class="technical-code">${escapeHtml(primary.warehouse)} / ${escapeHtml(primary.code)}</span><br><small>posição principal</small></span><span class="product-unit">${escapeHtml(product.unit)}</span></button>`;
  }).join("");
}

function openProduct(productId) {
  const product = productById.get(productId);
  const dialog = document.querySelector("#product-dialog");
  if (!product || !(dialog instanceof HTMLDialogElement)) return;
  document.querySelector("#dialog-product-name").textContent = product.name;
  const primary = product.locations.find((location) => location.primary) ?? product.locations[0];
  document.querySelector("#product-detail-content").innerHTML = `
    <div class="scan-product-header"><span class="sku">${escapeHtml(product.sku)}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p></div>
    <div class="detail-grid">
      <div class="detail-cell"><span class="detail-label">FABRICANTE</span><strong class="detail-value">${escapeHtml(product.manufacturer)}</strong></div>
      <div class="detail-cell"><span class="detail-label">CATEGORIA</span><strong class="detail-value">${escapeHtml(product.category)}</strong></div>
      <div class="detail-cell"><span class="detail-label">IDENTIFICADOR</span><strong class="detail-value mono">${escapeHtml(product.identifier)}</strong></div>
      <div class="detail-cell"><span class="detail-label">RASTREABILIDADE</span><strong class="detail-value mono">${escapeHtml(product.trackingMode)}</strong></div>
      <div class="detail-cell"><span class="detail-label">POSIÇÃO PRINCIPAL</span><strong class="detail-value mono">${escapeHtml(primary.warehouse)} / ${escapeHtml(primary.code)}</strong></div>
      <div class="detail-cell"><span class="detail-label">UNIDADE</span><strong class="detail-value mono">${escapeHtml(product.unit)}</strong></div>
    </div>`;
  dialog.showModal();
}

function renderLocations() {
  const warehouse = document.querySelector("#warehouse-select")?.value ?? "ALM-01";
  const filtered = locations.filter((location) => location.warehouse === warehouse);
  const dedicated = filtered.filter((location) => location.mode === "DEDICATED").length;
  document.querySelector("#location-summary").innerHTML = [
    metricCell("Posições mapeadas", String(filtered.length), warehouse, "blue"),
    metricCell("Dedicadas", String(dedicated), "um produto por posição", "amber"),
    metricCell("Compartilhadas", String(filtered.length - dedicated), "ocupação controlada", ""),
  ].join("");
  document.querySelector("#location-grid").innerHTML = filtered.map((location) => {
    const stored = location.products.map((id) => productById.get(id)).filter(Boolean);
    return `<article class="location-card"><div class="location-card-top"><div><span class="location-code">${escapeHtml(location.code)}</span><div class="breadcrumb">${escapeHtml(location.path)}</div></div><span class="mode-label ${location.mode}">${location.mode === "DEDICATED" ? "DEDICADA" : "COMPARTILHADA"}</span></div><div class="location-products">${stored.map((product) => `<div class="location-product"><span><span class="row-code">${escapeHtml(product.sku)}</span><br>${escapeHtml(product.name)}</span><small>${escapeHtml(product.unit)}</small></div>`).join("")}</div></article>`;
  }).join("");
}

function renderInventory() {
  const totalQuantity = inventoryBalances.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventoryBalances.reduce((sum, item) => sum + item.totalValue, 0);
  const positive = inventoryBalances.filter((item) => item.quantity > 0);
  const weighted = positive.reduce((sum, item) => sum + item.averageCost * item.quantity, 0);
  const avg = totalQuantity ? weighted / totalQuantity : 0;
  document.querySelector("#inventory-summary").innerHTML = [
    metricCell("Saldo total", number.format(totalQuantity), "unidades base demonstrativas", "blue"),
    metricCell("Valor estimado", money.format(totalValue), "valorização do saldo", ""),
    metricCell("Custo médio", money.format(avg), "média ponderada demonstrativa", ""),
    metricCell("Posições com saldo", String(positive.length), `${locations.length} posições cadastradas`, "green"),
  ].join("");

  document.querySelector("#inventory-balances").innerHTML = inventoryBalances.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return `<div class="inventory-balance"><div><span class="sku">${escapeHtml(product.sku)}</span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(item.location)} · custo médio ${money.format(item.averageCost)}</small><small class="tracking-note">${escapeHtml(item.tracking)}</small></div><div class="inventory-qty"><strong>${number.format(item.quantity)}</strong><span>${escapeHtml(product.unit)}</span></div></div>`;
  }).join("");

  document.querySelector("#inventory-movements").innerHTML = inventoryMovements.map((item) => `<div class="movement-row"><span class="movement-type">${escapeHtml(item.type)}</span><span><strong>${escapeHtml(item.sku)}</strong><small>${escapeHtml(item.detail)} · ${escapeHtml(item.time)}</small></span><span class="movement-qty">${escapeHtml(item.quantity)}</span></div>`).join("");
}

function renderWithdrawals() {
  const pending = withdrawals.filter((item) => item.statusKey === "pending").length;
  const approved = withdrawals.filter((item) => item.statusKey === "approved").length;
  const fulfilled = withdrawals.filter((item) => item.statusKey === "fulfilled").length;
  const rejected = withdrawals.filter((item) => item.statusKey === "rejected").length;
  document.querySelector("#withdrawal-summary").innerHTML = [
    metricCell("Aguardando aprovação", String(pending), "material controlado", pending ? "amber" : "green"),
    metricCell("Aprovadas", String(approved), "aguardando atendimento", "blue"),
    metricCell("Atendidas hoje", String(fulfilled), "baixa física concluída", "green"),
    metricCell("Rejeitadas", String(rejected), "decisão preservada", rejected ? "red" : ""),
  ].join("");

  const open = withdrawals.filter((item) => ["pending", "approved"].includes(item.statusKey));
  const history = withdrawals.filter((item) => ["fulfilled", "rejected"].includes(item.statusKey));
  const row = (item) => `<div class="movement-row"><span class="movement-type">${escapeHtml(item.status)}</span><span><strong>${escapeHtml(item.id)} · ${escapeHtml(item.sku)}</strong><small>${escapeHtml(item.department)} · ${escapeHtml(item.destination)}</small><small>${escapeHtml(item.requester)}${item.fulfiller ? ` → ${escapeHtml(item.fulfiller)}` : ""} · ${escapeHtml(item.time)}</small></span><span class="movement-qty">${escapeHtml(item.quantity)}</span></div>`;
  document.querySelector("#withdrawal-queue").innerHTML = open.map(row).join("");
  document.querySelector("#withdrawal-history").innerHTML = history.map(row).join("");
}

function renderAlerts() {
  const critical = demoAlerts.filter((alert) => alert.severity === "critical").length;
  const warning = demoAlerts.filter((alert) => alert.severity === "warning").length;
  const info = demoAlerts.filter((alert) => alert.severity === "info").length;
  document.querySelector("#alert-summary").innerHTML = [
    metricCell("Alertas ativos", String(demoAlerts.length), "condições sem duplicação", "amber"),
    metricCell("Críticos", String(critical), "exigem atenção imediata", critical ? "red" : "green"),
    metricCell("Atenção", String(warning), "reposição ou validade", warning ? "amber" : "green"),
    metricCell("Informativos", String(info), "otimização operacional", "blue"),
  ].join("");
  document.querySelector("#alert-list").innerHTML = demoAlerts.map((alert) => `<div class="alert-row ${alert.severity}"><div class="alert-condition"><span class="severity-text ${alert.severity}">${escapeHtml(alert.severityLabel)}</span><strong>${escapeHtml(alert.type)}</strong><small>${escapeHtml(alert.id)}</small></div><div class="alert-material"><span class="sku">${escapeHtml(alert.sku)}</span><strong>${escapeHtml(alert.productName)}</strong></div><div class="alert-reading"><strong>${escapeHtml(alert.reading)}</strong><small>${escapeHtml(alert.note)}</small></div><div class="alert-detected">${escapeHtml(alert.detectedAt)}</div></div>`).join("");
}

function renderAudit() {
  const humanActors = new Set(demoAuditEvents.filter((event) => event.actor !== "Sistema").map((event) => event.actor)).size;
  const stockEvents = demoAuditEvents.filter((event) => event.action.startsWith("INVENTORY_")).length;
  document.querySelector("#audit-summary").innerHTML = [
    metricCell("Eventos exibidos", String(demoAuditEvents.length), "linha do tempo demonstrativa", "blue"),
    metricCell("Atores humanos", String(humanActors), "identidades rastreáveis", ""),
    metricCell("Eventos de estoque", String(stockEvents), "mutações sensíveis", "amber"),
  ].join("");
  document.querySelector("#audit-list").innerHTML = demoAuditEvents.map((event) => `<div class="audit-row"><div class="audit-event"><span class="audit-id">${escapeHtml(event.id)}</span><span class="audit-time">${escapeHtml(event.time)}</span></div><div class="audit-actor"><strong>${escapeHtml(event.actor)}</strong><span class="audit-action">${escapeHtml(event.action)}</span></div><div class="audit-entity"><strong>${escapeHtml(event.entity)}</strong><small>${escapeHtml(event.entityId)}</small></div><div class="audit-change"><strong>${escapeHtml(event.summary)}</strong><small>${escapeHtml(event.detail)}</small></div></div>`).join("");
}

function resolveScan(code) {
  const normalized = code.trim().toLocaleLowerCase("pt-BR");
  const product = products.find((item) => [item.sku, item.identifier].some((candidate) => candidate.toLocaleLowerCase("pt-BR") === normalized));
  const result = document.querySelector("#scan-result");
  if (!result) return;
  if (!product) {
    result.innerHTML = `<div class="empty-result"><span class="result-icon">×</span><strong>Código não localizado</strong><p>Nenhum material da demonstração corresponde a <span class="mono">${escapeHtml(code)}</span>.</p></div>`;
    return;
  }
  const primary = product.locations.find((location) => location.primary) ?? product.locations[0];
  const balances = inventoryBalances.filter((item) => item.productId === product.id);
  const qty = balances.reduce((sum, item) => sum + item.quantity, 0);
  result.innerHTML = `<div class="scan-product-header"><span class="sku">${escapeHtml(product.sku)}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p></div><div class="detail-grid"><div class="detail-cell"><span class="detail-label">SALDO</span><strong class="detail-value mono">${number.format(qty)} ${escapeHtml(product.unit)}</strong></div><div class="detail-cell"><span class="detail-label">POSIÇÃO</span><strong class="detail-value mono">${escapeHtml(primary.code)}</strong></div><div class="detail-cell"><span class="detail-label">FABRICANTE</span><strong class="detail-value">${escapeHtml(product.manufacturer)}</strong></div><div class="detail-cell"><span class="detail-label">RASTREIO</span><strong class="detail-value mono">${escapeHtml(product.trackingMode)}</strong></div></div><button class="secondary-action" style="width:100%;margin-top:12px" type="button" data-open-product="${escapeHtml(product.id)}">Abrir ficha completa</button>`;
}

function updateClock() {
  const now = new Date();
  const time = document.querySelector("#clock-time");
  const date = document.querySelector("#clock-date");
  if (time) time.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (date) date.textContent = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "").toUpperCase();
}

function renderAll() {
  renderDashboard();
  renderProducts();
  renderLocations();
  renderInventory();
  renderWithdrawals();
  renderAlerts();
  renderAudit();
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    navigate(nav.dataset.nav);
    return;
  }
  const productTarget = event.target.closest("[data-product-id], [data-open-product]");
  if (productTarget) openProduct(productTarget.dataset.productId ?? productTarget.dataset.openProduct);
});

document.querySelector("#product-search")?.addEventListener("input", renderProducts);
document.querySelector("#clear-search")?.addEventListener("click", () => {
  const input = document.querySelector("#product-search");
  if (input) input.value = "";
  activeCategory = "all";
  document.querySelectorAll("[data-category]").forEach((button) => button.classList.toggle("is-active", button.dataset.category === "all"));
  renderProducts();
});
document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
  activeCategory = button.dataset.category;
  document.querySelectorAll("[data-category]").forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
  renderProducts();
}));
document.querySelector("#warehouse-select")?.addEventListener("change", renderLocations);
document.querySelector("#simulate-scan")?.addEventListener("click", () => resolveScan("789100006204"));
document.querySelector("#focus-manual")?.addEventListener("click", () => document.querySelector("#manual-code")?.focus());
document.querySelector("#manual-scan-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = document.querySelector("#manual-code")?.value ?? "";
  if (code.trim()) resolveScan(code);
});
document.querySelector(".close-dialog")?.addEventListener("click", () => document.querySelector("#product-dialog")?.close());
document.querySelector("#product-dialog")?.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

renderAll();
updateClock();
setInterval(updateClock, 30000);
