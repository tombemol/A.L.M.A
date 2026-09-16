# A.L.M.A. Phase 1E Alerts + Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** adicionar políticas de reposição, alertas idempotentes, auditoria ampliada e repaginar o preview público com o design system Industrial Control Room.

**Architecture:** manter o monólito modular. `alerts` concentra política, avaliação e consulta; `audit` concentra gravação e consulta de eventos. O preview permanece estático, mas passa a representar o contrato visual da futura Fase 1F.

**Tech Stack:** Node.js 22+, TypeScript 5, Express 5, PostgreSQL 16, Prisma 6, Zod, Vitest/Supertest, HTML/CSS/JavaScript estático, GitHub Actions e GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-16-alma-phase-1e-alerts-audit-design.md`

## Global Constraints

- Não criar compras automaticamente.
- Estoque negativo continua proibido.
- Alertas ativos são idempotentes e alertas resolvidos permanecem históricos.
- Segredos nunca entram em `AuditLog`.
- RBAC é aplicado no backend.
- Preview permanece pt-BR e tablet-first.
- `PRODUCT.md` e `DESIGN.md` são fontes de verdade visuais.

---

### Task 1: Fechar contrato visual do preview

**Files:**
- Create: `PRODUCT.md`
- Create: `DESIGN.md`
- Modify: `preview/test/preview.test.mjs`
- Modify: `preview/index.html`
- Modify: `preview/styles.css`
- Modify: `preview/app.js`
- Modify: `README.md`

**Interfaces:**
- Produces oito views: `dashboard`, `products`, `locations`, `inventory`, `withdrawals`, `alerts`, `audit`, `scanner`.
- Produces tokens CSS `--signal-amber` e `--radius-sm`.

- [x] **Step 1: escrever testes RED do preview** com exigência das oito views, IBM Plex, ausência de gradientes e documentação visual.
- [x] **Step 2: executar CI e confirmar RED**. Esperado: backend verde; preview falha por views/tokens/docs ausentes.
- [ ] **Step 3: implementar HTML das áreas Alertas/Auditoria e navegação responsiva.**
- [ ] **Step 4: substituir CSS pelo Industrial Control Room.** Sem `linear-gradient(` ou `radial-gradient(`; usar superfícies planas, raios 2–6 px, IBM Plex e âmbar semântico.
- [ ] **Step 5: adicionar dados/renderizadores demonstrativos** com `Ruptura`, `Ponto de reposição`, `Validade próxima`, `Fragmentação` e IDs `AUDIT-*`.
- [ ] **Step 6: atualizar README para Fase 1E em andamento e registrar Impeccable/design system.**
- [ ] **Step 7: executar CI e confirmar GREEN.**

### Task 2: Persistência e RBAC da Fase 1E

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260916200000_alerts_audit/migration.sql`
- Modify: `packages/shared/src/permissions.ts`
- Modify: `packages/database/prisma/seed.ts`
- Create: `apps/api/test/phase1e.schema.test.ts`

**Interfaces:**
- Produces `ReorderPolicy`, `Alert`, `AuditLog`, `AlertType`, `AlertSeverity`.
- Produces permissões `alerts.read`, `alerts.manage`, `audit.read`.

- [ ] **Step 1: escrever teste RED** criando uma política, alerta ativo e audit log pelo Prisma e verificando novas permissões.
- [ ] **Step 2: executar CI e confirmar falha por modelos inexistentes.**
- [ ] **Step 3: implementar schema e migration.** `ReorderPolicy.productId` único; `Alert.activeKey` único e anulável; `AuditLog` com `before`, `after`, `context` JSON opcionais.
- [ ] **Step 4: atualizar seed idempotente** para registrar permissões e atribuí-las ao `ADMIN`.
- [ ] **Step 5: executar migrations/typecheck/testes até GREEN.**

### Task 3: Políticas e motor de alertas

**Files:**
- Create: `apps/api/src/modules/alerts/alerts.schemas.ts`
- Create: `apps/api/src/modules/alerts/alerts.service.ts`
- Create: `apps/api/src/modules/alerts/alerts.routes.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/test/alerts.service.test.ts`
- Create: `apps/api/test/alerts.http.test.ts`

**Interfaces:**
- `upsertReorderPolicy(productId, input, actorUserId)`
- `getReorderPolicy(productId)`
- `evaluateAlerts({ now, actorUserId })`
- `listAlerts(query)`

- [ ] **Step 1: RED para política** validando números não negativos, mínimo <= máximo e ponto de reposição <= máximo.
- [ ] **Step 2: GREEN mínimo para CRUD da política.**
- [ ] **Step 3: RED para idempotência.** Avaliar a mesma condição duas vezes deve resultar em um único alerta ativo com `lastDetectedAt` atualizado.
- [ ] **Step 4: GREEN para saldo.** Gerar `STOCKOUT`, `BELOW_MINIMUM` e `REORDER` conforme política/saldo.
- [ ] **Step 5: RED/GREEN para validade.** Considerar apenas saldos positivos ligados a lote/serial; distinguir `EXPIRY_NEAR` de `EXPIRED`.
- [ ] **Step 6: RED/GREEN para fragmentação.** Gerar alerta quando um produto possui saldo positivo em mais de uma posição física.
- [ ] **Step 7: RED/GREEN para resolução e recorrência.** Condição ausente define `resolvedAt` e `activeKey=null`; retorno posterior cria novo registro.
- [ ] **Step 8: adicionar HTTP/RBAC** em `/api/alerts`, `/api/alerts/evaluate`, `/api/alerts/policies/:productId`.
- [ ] **Step 9: executar suíte completa até GREEN.**

### Task 4: Serviço e consulta de auditoria

**Files:**
- Create: `apps/api/src/modules/audit/audit.service.ts`
- Create: `apps/api/src/modules/audit/audit.schemas.ts`
- Create: `apps/api/src/modules/audit/audit.routes.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/test/audit.service.test.ts`
- Create: `apps/api/test/audit.http.test.ts`

**Interfaces:**
- `writeAuditLog(client, event)` aceita Prisma ou transaction client.
- `listAuditLogs(query)` retorna eventos + paginação.

- [ ] **Step 1: RED para gravação segura** verificando ator, ação, entidade, before/after/context e timestamp.
- [ ] **Step 2: GREEN do serviço de gravação.** Não aceitar campos de segredo na interface do evento.
- [ ] **Step 3: RED para filtros/paginação** por ator, ação, entidade, entityId e datas.
- [ ] **Step 4: GREEN da consulta e endpoint `/api/audit` com `audit.read`.**
- [ ] **Step 5: executar suíte completa até GREEN.**

### Task 5: Instrumentar ações sensíveis

**Files:**
- Modify: `apps/api/src/modules/inventory/inventory-ledger.service.ts`
- Modify: `apps/api/src/modules/withdrawals/withdrawals.service.ts`
- Modify: `apps/api/src/modules/alerts/alerts.service.ts`
- Test: `apps/api/test/audit.integration.test.ts`

**Interfaces:**
- Eventos mínimos: `INVENTORY_ENTRY`, `INVENTORY_TRANSFER`, `INVENTORY_ADJUSTMENT`, `WITHDRAWAL_REQUESTED`, `WITHDRAWAL_APPROVED`, `WITHDRAWAL_REJECTED`, `WITHDRAWAL_FULFILLED`, `WITHDRAWAL_DIRECT`, `REORDER_POLICY_UPDATED`, `ALERTS_EVALUATED`.

- [ ] **Step 1: RED para estoque** exigindo um AuditLog depois de entrada/transferência/ajuste com o ator autenticado.
- [ ] **Step 2: GREEN dentro da mesma transação lógica.**
- [ ] **Step 3: RED para retiradas** cobrindo solicitação, decisão, atendimento e direta.
- [ ] **Step 4: GREEN preservando idempotência existente.** Repetir atendimento não pode duplicar movimento nem auditoria da conclusão.
- [ ] **Step 5: RED/GREEN para política e avaliação de alertas.**
- [ ] **Step 6: executar toda a suíte até GREEN.**

### Task 6: Quality gate, README e fechamento

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-09-16-alma-phase-1-roadmap.md`

- [ ] **Step 1: fixar execução do detector Impeccable no CI** depois dos testes do preview, usando versão explícita e flags não interativas.
- [ ] **Step 2: corrigir findings de severidade erro sem enfraquecer `DESIGN.md`.**
- [ ] **Step 3: atualizar README para Fase 1E concluída**, listar endpoints/permissões/alertas/auditoria e as oito áreas do Pages.
- [ ] **Step 4: atualizar roadmap marcando 1E concluída e 1F como próxima.**
- [ ] **Step 5: verificação final:** `pnpm typecheck`, `pnpm test`, testes do preview, `node --check preview/app.js`, Impeccable e `pnpm build`.
- [ ] **Step 6: revisar PR, remover draft e integrar somente com checks verdes.**