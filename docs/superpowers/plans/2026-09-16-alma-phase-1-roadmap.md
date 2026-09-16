# A.L.M.A. — Fase 1 Roadmap de Implementação

**Spec:** `docs/superpowers/specs/2026-09-16-alma-phase-1-design.md`

A Fase 1 será implementada como seis entregas cumulativas. Cada etapa termina com software executável, testes verdes e um conjunto de mudanças revisável.

## 1A — Fundação + Autenticação/RBAC

Entrega: monorepo; API Express/TypeScript; PostgreSQL + Prisma; validação de ambiente; usuários; papéis; permissões; login por matrícula + PIN; login administrativo por usuário + senha; sessões revogáveis; middleware de autenticação/autorização; rate limit; bootstrap admin; testes e CI.

Critério de saída: administrador e operador autenticam; endpoints protegidos rejeitam anônimos; permissões são aplicadas; logout invalida sessão.

## 1B — Catálogo + Localizações

Entrega: categorias, unidades, produtos, identificadores SKU/QR/barcode, múltiplos almoxarifados, corredor/estante/prateleira/posição, produto-localização, posição principal.

Critério de saída: produto pode ocupar várias posições, com no máximo uma principal por almoxarifado.

## 1C — Ledger de Estoque + Custos

Entrega: saldos por posição, lotes, serialização, validade, entradas, devoluções, transferências, ajustes, inventário ganho/perda, imutabilidade, bloqueio de negativo, custo médio e concorrência.

Critério de saída: saldo é reproduzível pelo histórico; saídas concorrentes não duplicam consumo; transferências são atômicas.

## 1D — Retiradas + Aprovações + Destinos

Entrega: setores, equipamentos, OS, destino obrigatório, retirada direta, política de aprovação, solicitação, aprovação/rejeição e atendimento.

Critério de saída: material controlado não sai sem aprovação; aprovação não altera saldo; atendimento aprovado movimenta uma única vez.

## 1E — Alertas + Auditoria

Entrega: mínimo/máximo/ponto de reposição, alertas de reposição/ruptura/validade/fragmentação e `AuditLog`.

Critério de saída: alertas são idempotentes e ações sensíveis são auditáveis.

## 1F — Frontend Operacional + QR/Barcode

Entrega: React/Vite, login, dashboard, cadastros, entradas, retiradas, aprovações, transferências, ajustes, histórico, alertas, câmera para QR/barcode e geração de QR.

Critério de saída: fluxos críticos da Fase 1 operam em navegador/tablet, com fallback manual no scanner.

## Ordem

```text
1A Foundation/Auth
      ↓
1B Catalog/Locations
      ↓
1C Inventory Ledger
      ↓
1D Withdrawals/Approvals
      ↓
1E Alerts/Audit
      ↓
1F Web/QR
```
