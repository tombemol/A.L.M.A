import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);

async function text(name) {
  return readFile(new URL(name, root), "utf8");
}

test("a demonstração expõe as seis áreas principais do tablet", async () => {
  const html = await text("index.html");

  for (const view of ["dashboard", "products", "locations", "inventory", "withdrawals", "scanner"]) {
    assert.match(html, new RegExp(`data-view=\\"${view}\\"`));
  }
});

test("a área de estoque apresenta os conceitos concluídos na Fase 1C", async () => {
  const html = await text("index.html");
  const js = await text("app.js");

  assert.match(html, />Estoque</);
  assert.match(html, /data-view="inventory"/);
  assert.match(html, /Movimentações recentes/);
  assert.match(js, /Saldo total/);
  assert.match(js, /Valor estimado/);
  assert.match(js, /Custo médio/);
  assert.match(js, /LOTE-2026-09/);
  assert.match(js, /SER-ALMA-001/);
});

test("a área de retiradas demonstra aprovação, atendimento e histórico da Fase 1D", async () => {
  const html = await text("index.html");
  const js = await text("app.js");

  assert.match(html, /data-view="withdrawals"/);
  assert.match(html, />Retiradas</);
  assert.match(html, /Solicitações e atendimento/);
  assert.match(js, /Pendente de aprovação/);
  assert.match(js, /Aprovada/);
  assert.match(js, /Atendida/);
  assert.match(js, /Manutenção/);
  assert.match(js, /OS-260916-014/);
});

test("a demonstração referencia os arquivos locais de estilo e comportamento", async () => {
  const html = await text("index.html");
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
});

test("o CSS do tablet mantém navegação compacta e alvos de toque adequados", async () => {
  const css = await text("styles.css");
  assert.match(css, /@media\s*\(max-width:\s*820px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,1fr\)/);
});

test("o leitor de demonstração inclui identificadores diferentes", async () => {
  const js = await text("app.js");
  assert.match(js, /789100006204/);
  assert.match(js, /ROL-6204/);
  assert.match(js, /ELE-DJ32/);
});

test("toda a cópia principal da demonstração está apresentada em pt-BR", async () => {
  const html = await text("index.html");
  const js = await text("app.js");

  assert.match(html, /Demonstração para tablet/);
  assert.match(html, />Visão geral</);
  assert.match(html, />Retiradas</);
  assert.match(html, /Administrador de demonstração/);
  assert.doesNotMatch(html, />Dashboard</);
  assert.doesNotMatch(html, />Scanner</);
  assert.doesNotMatch(html, /Admin Demo/);
  assert.doesNotMatch(html, /Tablet Preview/);

  assert.match(js, /Visão geral/);
  assert.match(js, /Retiradas e aprovações/);
});

test("o README fecha a Fase 1D e aponta a Fase 1E como próxima", async () => {
  const readme = await text("../README.md");

  assert.match(readme, /## 🧭 Visão geral/);
  assert.match(readme, /## 🏗️ Arquitetura/);
  assert.match(readme, /```mermaid/);
  assert.match(readme, /## 🗺️ Roadmap/);
  assert.match(readme, /Fase 1A.*Concluída/);
  assert.match(readme, /Fase 1B.*Concluída/);
  assert.match(readme, /Fase 1C.*Concluída/);
  assert.match(readme, /Fase 1D.*Concluída/);
  assert.match(readme, /Fase 1E.*Próxima/);
  assert.match(readme, /POST \/api\/withdrawal-requests/);
  assert.match(readme, /POST \/api\/withdrawals\/direct/);
  assert.match(readme, /GET  \/api\/destinations\/departments/);
  assert.match(readme, /https:\/\/tombemol\.github\.io\/A\.L\.M\.A\//);
  assert.match(readme, /Demonstração para tablet/);
});
