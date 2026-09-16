# A.L.M.A. Phase 1C — Ledger de Estoque + Custos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar estoque transacional por posição com ledger imutável, rastreabilidade opcional por lote/serial, transferências atômicas, bloqueio de saldo negativo e custo médio móvel.

**Architecture:** A Fase 1C mantém o monólito modular. `StockMovement`/`StockMovementItem` são a fonte histórica; `InventoryBalance` e `InventoryValuation` são projeções atualizadas na mesma transação serializável. Nenhuma rota altera saldo diretamente. Entradas, transferências e ajustes passam pelo mesmo núcleo de posting para que as invariantes sejam únicas e testáveis.

**Tech Stack:** Node.js 22+, TypeScript, Express 5, Prisma 6, PostgreSQL 16+, Zod, Vitest, Supertest, pnpm, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-16-alma-phase-1-design.md`

## Global Constraints

- Toda interface e documentação voltada ao usuário permanece em pt-BR.
- Quantidade usa `Decimal(18,6)` e deve ser estritamente positiva em uma movimentação.
- Custo unitário usa `Decimal(18,6)` e nunca pode ser negativo.
- Estoque negativo é proibido.
- `InventoryBalance` nunca é editado por rota administrativa; somente o núcleo de posting altera a projeção.
- Toda movimentação concluída é imutável. Correções futuras geram nova movimentação compensatória.
- Transferência reduz origem e aumenta destino dentro da mesma transação.
- Operações de escrita usam isolamento `Serializable`; conflito de serialização retorna `CONCURRENT_STOCK_UPDATE` 409.
- Uma posição de estoque deve estar ativa, ser `POSITION` e possuir associação `ProductLocation` para o produto movimentado.
- O saldo persistido deve ser reproduzível pela soma dos deltas do ledger.
- `trackingMode=NONE` rejeita lote/serial; `LOT` exige lote; `LOT_EXPIRY` exige lote + validade; `SERIAL` exige serial; `SERIAL_EXPIRY` exige serial + validade.
- Produto serializado movimenta quantidade exatamente `1` por item/serial.
- Custo médio é global por produto na Fase 1C; transferências não alteram quantidade/custo total global.
- Retiradas com destino/aprovação pertencem à Fase 1D e não serão expostas como fluxo operacional nesta fase.

---

### Task 1: Persistência, rastreabilidade e permissões

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260916160000_inventory_ledger/migration.sql`
- Modify: `packages/shared/src/permissions.ts`
- Modify: `packages/database/prisma/seed.ts`
- Modify: `apps/api/src/modules/catalog/catalog.schemas.ts`
- Modify: `apps/api/src/modules/catalog/products.service.ts`
- Test: `apps/api/test/inventory.schema.test.ts`

**Interfaces:**
- Produces enum `InventoryTrackingMode`: `NONE | LOT | LOT_EXPIRY | SERIAL | SERIAL_EXPIRY`.
- Produces enum `StockMovementType`: `ENTRY | WITHDRAWAL | RETURN | TRANSFER | ADJUSTMENT_IN | ADJUSTMENT_OUT | INVENTORY_GAIN | INVENTORY_LOSS`.
- Produces models `InventoryLot`, `SerialItem`, `InventoryBalance`, `InventoryValuation`, `StockMovement`, `StockMovementItem`.
- Produces permissions `inventory.read` and `inventory.move`.

- [ ] **Step 1: escrever teste vermelho de persistência** que cria produto/localização e tenta usar os modelos de inventário ainda inexistentes; incluir unicidade de lote e serial.
- [ ] **Step 2: executar o CI da branch e confirmar falha por tipos/modelos Prisma ausentes.**
- [ ] **Step 3: adicionar `trackingMode` ao produto**, com default `NONE`, e relações para lote, serial, saldo, valorização e itens de movimentação.
- [ ] **Step 4: adicionar modelos** com as seguintes chaves:

```text
InventoryLot      unique(productId, lotCode)
SerialItem        unique(productId, serialNumber)
InventoryBalance  unique(productId, locationId, stockKey)
InventoryValuation productId primary key
StockMovement     id + type + reason/reference + performedByUserId + createdAt
StockMovementItem movementId + productId + from/to + lot/serial + qty + unitCost + totalCost
```

`stockKey` é determinístico: `NONE`, `LOT:<lotId>` ou `SERIAL:<serialItemId>`. Isso evita depender da semântica de `NULL` em índices compostos.

- [ ] **Step 5: criar migration SQL** com FKs `RESTRICT` para entidades que já podem participar de histórico. `StockMovementItem` deve usar `ON DELETE RESTRICT` para produto/local/lote/serial e `CASCADE` apenas entre movimento e seus itens antes de qualquer uso histórico externo.
- [ ] **Step 6: ampliar permissões**:

```ts
INVENTORY_READ: "inventory.read",
INVENTORY_MOVE: "inventory.move",
```

`ADMIN` e `ALMOXARIFE` recebem ambas; `SOLICITANTE` e `APROVADOR` recebem somente leitura.

- [ ] **Step 7: ampliar schemas de produto** para aceitar `trackingMode` em criação/edição e persistir o campo nos services.
- [ ] **Step 8: executar generate, migrate, seed duas vezes, testes e typecheck.**
- [ ] **Step 9: commit `feat: add inventory ledger data model`.**

---

### Task 2: Núcleo de posting e projeção de saldo

**Files:**
- Create: `apps/api/src/modules/inventory/inventory.schemas.ts`
- Create: `apps/api/src/modules/inventory/tracking.service.ts`
- Create: `apps/api/src/modules/inventory/inventory-ledger.service.ts`
- Test: `apps/api/test/inventory.ledger.test.ts`

**Interfaces:**
- `postInventoryMovement(actorUserId, input)` é a única função pública de escrita de saldo.
- `resolveTracking(tx, product, input, direction)` valida/cria lote/serial e retorna `{ lotId, serialItemId, stockKey }`.
- `applyBalanceDelta(tx, key, delta)` atualiza a projeção e rejeita resultado negativo.

- [ ] **Step 1: escrever testes vermelhos** para entrada criar saldo, segundo movimento acumular saldo, saída insuficiente retornar `INSUFFICIENT_STOCK` 409 e ledger permanecer append-only.
- [ ] **Step 2: schemas Zod** validam quantidade positiva, IDs obrigatórios por tipo e justificativa em ajustes/inventário.
- [ ] **Step 3: validar contexto**: produto ativo, localização ativa `POSITION`, almoxarifado ativo e associação `ProductLocation` existente.
- [ ] **Step 4: implementar `applyBalanceDelta`** dentro de transação serializável. Para delta negativo, carregar o saldo atual e rejeitar antes de gravar quando `current + delta < 0`.
- [ ] **Step 5: implementar criação do `StockMovement` e itens** somente depois de todas as validações da operação, ainda dentro da mesma transação.
- [ ] **Step 6: mapear Prisma `P2034`** para `CONCURRENT_STOCK_UPDATE` 409.
- [ ] **Step 7: testes + typecheck.**
- [ ] **Step 8: commit `feat: add transactional inventory ledger`.**

---

### Task 3: Entradas e custo médio móvel

**Files:**
- Extend: `apps/api/src/modules/inventory/inventory.schemas.ts`
- Extend: `apps/api/src/modules/inventory/inventory-ledger.service.ts`
- Test: `apps/api/test/inventory.costing.test.ts`

**Interfaces:**
- Entrada usa `type=ENTRY`, `toLocationId`, `quantity`, `unitCost` e rastreabilidade opcional.
- `updateWeightedAverageCost(tx, productId, quantity, unitCost)` atualiza `InventoryValuation`.

- [ ] **Step 1: teste vermelho**: 10 unidades a R$ 10 + 10 unidades a R$ 20 resultam em quantidade 20, custo médio R$ 15 e valor R$ 300.
- [ ] **Step 2: teste vermelho** para custo negativo rejeitado e custo zero aceito.
- [ ] **Step 3: implementar média ponderada** usando Decimal no banco, nunca `number` para persistência financeira:

```text
newQuantity = oldQuantity + incomingQuantity
newTotalValue = oldTotalValue + incomingQuantity * unitCost
newAverage = newQuantity == 0 ? 0 : newTotalValue / newQuantity
```

- [ ] **Step 4: registrar `unitCost` e `totalCost` no item do ledger.**
- [ ] **Step 5: testes + typecheck.**
- [ ] **Step 6: commit `feat: add moving average inventory costing`.**

---

### Task 4: Transferências, ajustes e inventário

**Files:**
- Extend: `apps/api/src/modules/inventory/inventory.schemas.ts`
- Extend: `apps/api/src/modules/inventory/inventory-ledger.service.ts`
- Test: `apps/api/test/inventory.movements.test.ts`

**Interfaces:**
- Transferência: `type=TRANSFER`, mesma dimensão de rastreabilidade, origem e destino diferentes.
- Ajustes: `ADJUSTMENT_IN | ADJUSTMENT_OUT` com justificativa obrigatória.
- Inventário: `INVENTORY_GAIN | INVENTORY_LOSS` com justificativa obrigatória.

- [ ] **Step 1: testes vermelhos** para transferência atômica, origem=destino inválido e saldo insuficiente sem crédito parcial no destino.
- [ ] **Step 2: implementar transferência** aplicando delta negativo na origem e positivo no destino na mesma transação; custo global não muda.
- [ ] **Step 3: testes vermelhos** para ajustes sem justificativa e inventário sem justificativa.
- [ ] **Step 4: implementar ajustes/ganhos/perdas**. Entradas de ajuste usam custo informado ou custo médio vigente; saídas capturam custo médio vigente.
- [ ] **Step 5: confirmar que falha em qualquer etapa reverte `InventoryBalance`, `InventoryValuation` e `StockMovement` juntos.**
- [ ] **Step 6: testes + typecheck.**
- [ ] **Step 7: commit `feat: add inventory transfers and adjustments`.**

---

### Task 5: Lote, validade e serial

**Files:**
- Extend: `apps/api/src/modules/inventory/tracking.service.ts`
- Extend: `apps/api/src/modules/inventory/inventory-ledger.service.ts`
- Test: `apps/api/test/inventory.tracking.test.ts`

**Interfaces:**
- Entrada rastreada aceita `tracking: { lotCode?, serialNumber?, expiresAt? }`.
- Saída/transferência deve resolver registro já existente, sem criar identidade nova.

- [ ] **Step 1: testes vermelhos** para cada `InventoryTrackingMode` e combinação inválida.
- [ ] **Step 2: `LOT` cria/reutiliza lote normalizado** (`trim().toUpperCase()`); `LOT_EXPIRY` exige validade e mantém validade consistente para o mesmo lote.
- [ ] **Step 3: `SERIAL`/`SERIAL_EXPIRY` exige quantidade exatamente `1`**, serial único por produto e, quando aplicável, validade.
- [ ] **Step 4: impedir serial com saldo positivo em duas posições simultaneamente**; transferência move a mesma identidade entre posições.
- [ ] **Step 5: expiração é metadado nesta fase; bloqueios/alertas por validade pertencem à Fase 1E.**
- [ ] **Step 6: testes + typecheck.**
- [ ] **Step 7: commit `feat: add lot and serial traceability`.**

---

### Task 6: API de inventário e consultas reproduzíveis

**Files:**
- Create: `apps/api/src/modules/inventory/inventory.routes.ts`
- Create: `apps/api/src/modules/inventory/inventory-query.service.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/inventory.http.test.ts`

**Interfaces:**
- `GET /api/inventory/balances`
- `GET /api/inventory/products/:productId/summary`
- `GET /api/inventory/movements`
- `POST /api/inventory/entries`
- `POST /api/inventory/transfers`
- `POST /api/inventory/adjustments`

- [ ] **Step 1: testes HTTP vermelhos** para autenticação, `inventory.read`, `inventory.move` e payload inválido.
- [ ] **Step 2: consultas de saldo** suportam filtros `productId`, `warehouseId`, `locationId`, lote e serial, retornando Decimal serializado como string.
- [ ] **Step 3: summary por produto** retorna quantidade total, custo médio, valor estimado e breakdown por posição.
- [ ] **Step 4: histórico de movimentações** retorna paginação simples e itens do movimento, em ordem decrescente de `createdAt`.
- [ ] **Step 5: rotas de escrita** recebem `req.authUser!.id` como ator e nunca aceitam `performedByUserId` do cliente.
- [ ] **Step 6: montar router em `/api/inventory`.**
- [ ] **Step 7: testes + typecheck + build.**
- [ ] **Step 8: commit `feat: expose phase 1C inventory API`.**

---

### Task 7: Fechamento visual da Fase 1C

**Files:**
- Modify: `preview/index.html`
- Modify: `preview/app.js`
- Modify: `preview/styles.css`
- Modify: `preview/test/preview.test.mjs`
- Modify: `README.md`
- Modify: `.github/workflows/pages.yml` only if deployment behavior itself needs correction

**Interfaces:**
- Preview passa a exibir saldo total, valor estimado, estoque por posição e movimentações simuladas da 1C.
- README marca 1C concluída e 1D como próxima.

- [ ] **Step 1: teste vermelho do preview** exige uma área de estoque/movimentações e os rótulos pt-BR da 1C.
- [ ] **Step 2: atualizar demonstração tablet-friendly** sem transformar o preview estático em frontend de produção; dados permanecem claramente identificados como demonstração.
- [ ] **Step 3: atualizar README** com modelos, endpoints e invariantes da 1C, além do roadmap `1C ✅ / 1D 🚧`.
- [ ] **Step 4: executar suíte completa:**

```bash
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:seed
pnpm typecheck
pnpm test
node --test preview/test/*.test.mjs
node --check preview/app.js
pnpm build
```

- [ ] **Step 5: criar PR da 1C somente com CI verde.**
- [ ] **Step 6: após integração na `main`, verificar o workflow `Deploy tablet preview` e confirmar o Pages publicado.**
- [ ] **Step 7: commit `docs: close phase 1C inventory ledger`.**

## Self-review

Cobertura da spec: saldo por posição, movimentações imutáveis, entrada, devolução como tipo suportado pelo núcleo, transferências, ajustes, ganhos/perdas de inventário, estoque negativo proibido, concorrência serializável, lote, serial, validade, custo médio e valor estimado. `WITHDRAWAL` existe no enum/histórico do domínio, mas o fluxo de retirada com destino/aprovação continua reservado à Fase 1D. Alertas de validade e auditoria global continuam reservados à Fase 1E. O plano não cria compras, ERP, offline ou visão computacional.
