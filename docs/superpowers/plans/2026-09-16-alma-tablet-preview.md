# A.L.M.A. Tablet Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar e publicar um preview estático tablet-friendly do A.L.M.A. com Dashboard, Produtos, Localizações e Scanner simulado.

**Architecture:** O preview vive em `preview/` e não participa do workspace pnpm. Ele usa HTML, CSS e JavaScript puros para não adicionar dependências nem quebrar o lockfile da fundação. Dados mockados e estado de navegação ficam em memória no navegador. GitHub Pages publica exatamente esse diretório por workflow dedicado.

**Tech Stack:** HTML5, CSS moderno, JavaScript ES2022, Node.js built-in test runner para validação estática, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-16-alma-tablet-preview-design.md`

## Global Constraints

- nenhum framework/dependência nova;
- nenhum backend exigido para abrir o preview;
- sem scroll horizontal em 768 px;
- navegação inferior até 820 px e side rail acima de 820 px;
- alvos interativos com mínimo de 44 px;
- todas as funcionalidades principais precisam funcionar por toque;
- dados são explicitamente demonstrativos;
- scanner é simulado e não acessa câmera real.

---

### Task 1: Static contract test

**Files:**
- Create: `preview/test/preview.test.mjs`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes expected files `preview/index.html`, `preview/styles.css`, `preview/app.js`.
- Produces CI validation for preview structure and JavaScript syntax.

- [ ] **Step 1: Write failing test**

`preview/test/preview.test.mjs`:

```js
import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);

async function text(name) {
  return readFile(new URL(name, root), "utf8");
}

test("preview exposes the four primary tablet views", async () => {
  const html = await text("index.html");

  for (const view of ["dashboard", "products", "locations", "scanner"]) {
    assert.match(html, new RegExp(`data-view=\\"${view}\\"`));
  }
});

test("preview references local CSS and JS assets", async () => {
  const html = await text("index.html");
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
});

test("tablet CSS contains compact navigation breakpoint and touch target", async () => {
  const css = await text("styles.css");
  assert.match(css, /@media\s*\(max-width:\s*820px\)/);
  assert.match(css, /min-height:\s*44px/);
});

test("scanner demo includes multiple identifiers", async () => {
  const js = await text("app.js");
  assert.match(js, /789100006204/);
  assert.match(js, /ROL-6204/);
  assert.match(js, /ELE-DJ32/);
});
```

- [ ] **Step 2: Wire CI and verify RED**

Add before `pnpm build`:

```yaml
      - run: node --test preview/test/*.test.mjs
      - run: node --check preview/app.js
```

Expected on first push: FAIL because production preview files do not exist yet.

- [ ] **Step 3: Commit RED test**

```bash
git add preview/test/preview.test.mjs .github/workflows/ci.yml
git commit -m "test: define tablet preview contract"
```

---

### Task 2: Tablet shell and navigation

**Files:**
- Create: `preview/index.html`
- Create: `preview/styles.css`
- Create: `preview/app.js`

**Interfaces:**
- Produces four views identified by `data-view`.
- Produces navigation elements identified by `data-nav`.
- Produces `setActiveView(viewName)` in `app.js`.

- [ ] **Step 1: Create semantic HTML shell**

The document must include:

```html
<main class="app-shell">
  <aside class="side-rail" aria-label="Navegação principal"></aside>
  <section class="workspace">
    <section class="view is-active" data-view="dashboard"></section>
    <section class="view" data-view="products" hidden></section>
    <section class="view" data-view="locations" hidden></section>
    <section class="view" data-view="scanner" hidden></section>
  </section>
  <nav class="bottom-nav" aria-label="Navegação principal"></nav>
</main>
```

- [ ] **Step 2: Implement tablet-first layout**

CSS requirements:

```css
:root { color-scheme: dark; }

button,
.nav-item,
.touch-target {
  min-height: 44px;
}

@media (max-width: 820px) {
  .side-rail { display: none; }
  .bottom-nav { display: grid; }
  .workspace { padding-bottom: 88px; }
}

@media (min-width: 821px) {
  .side-rail { display: flex; }
  .bottom-nav { display: none; }
}
```

No fixed content width may exceed the viewport at 768 px.

- [ ] **Step 3: Implement navigation state**

```js
function setActiveView(viewName) {
  document.querySelectorAll("[data-view]").forEach((view) => {
    const active = view.dataset.view === viewName;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });

  document.querySelectorAll("[data-nav]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.nav === viewName);
    item.setAttribute("aria-current", item.dataset.nav === viewName ? "page" : "false");
  });
}
```

Bind click listeners to all `[data-nav]` elements.

- [ ] **Step 4: Run static tests**

```bash
node --test preview/test/*.test.mjs
node --check preview/app.js
```

Expected: PASS for structure/assets and syntax once mock identifiers are added in Task 3.

---

### Task 3: Dashboard, products and product detail

**Files:**
- Modify: `preview/index.html`
- Modify: `preview/styles.css`
- Modify: `preview/app.js`

**Interfaces:**
- Produces `demoProducts` array.
- Produces `renderProducts(query = "")`.
- Produces `openProduct(productId)`.

- [ ] **Step 1: Add demo products**

Include at least:

```js
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
];
```

- [ ] **Step 2: Render dashboard KPIs and recent materials**

Dashboard displays four KPI cards and a recent products list derived from `demoProducts`.

- [ ] **Step 3: Implement product search**

Search must match `sku`, `name`, `category`, `identifier`, or `manufacturer`, case-insensitively.

- [ ] **Step 4: Implement product detail drawer**

Touching a product opens a modal/drawer with SKU, manufacturer, category, identifiers, conversions and positions. Escape and close button dismiss it.

---

### Task 4: Locations and scanner simulation

**Files:**
- Modify: `preview/index.html`
- Modify: `preview/styles.css`
- Modify: `preview/app.js`

**Interfaces:**
- Produces `demoLocations`.
- Produces `resolveDemoIdentifier(value)`.
- Produces `simulateScan()`.

- [ ] **Step 1: Add location dataset**

Represent `ALM-01` and `ALM-02` with position cards containing occupancy mode and associated mock products.

- [ ] **Step 2: Render physical hierarchy**

Each position card shows breadcrumb path, `DEDICATED`/`SHARED` chip and associated product count/name.

- [ ] **Step 3: Implement identifier resolution**

```js
function resolveDemoIdentifier(value) {
  const normalized = value.trim().toUpperCase();
  return demoProducts.find((product) =>
    [product.sku, product.identifier].some(
      (candidate) => candidate.toUpperCase() === normalized,
    ),
  );
}
```

- [ ] **Step 4: Implement simulated scanner**

`Simular leitura` cycles through:

```js
const demoScanSequence = ["789100006204", "ELE-DJ32", "789300001008"];
```

The scanner result renders the resolved product and primary location.

- [ ] **Step 5: Run tests**

```bash
node --test preview/test/*.test.mjs
node --check preview/app.js
```

Expected: PASS.

---

### Task 5: GitHub Pages deployment

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Publishes the `preview/` directory to the repository GitHub Pages environment.

- [ ] **Step 1: Create Pages workflow**

```yaml
name: Deploy tablet preview

on:
  push:
    branches:
      - main
      - agent/phase-1b-catalog-locations
    paths:
      - "preview/**"
      - ".github/workflows/pages.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: preview
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Push and inspect Pages workflow**

Expected: workflow succeeds and returns a public `page_url`.

- [ ] **Step 3: Verify deployed page**

Open the returned URL and verify Dashboard, Produtos, Localizações and Scanner load without backend.
