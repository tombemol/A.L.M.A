# A.L.M.A. — Fase 1 Roadmap de Implementação

**Spec:** `docs/superpowers/specs/2026-09-16-alma-phase-1-design.md`

A Fase 1 é dividida em seis entregas cumulativas. Cada etapa termina com software executável, testes verdes e um conjunto de mudanças revisável.

## Estado

| Etapa | Estado |
| --- | --- |
| 1A — Fundação + Autenticação/RBAC | ✅ Concluída |
| 1B — Catálogo + Localizações | ✅ Concluída |
| 1C — Ledger de Estoque + Custos | ✅ Concluída |
| 1D — Retiradas + Aprovações + Destinos | ✅ Concluída |
| 1E — Alertas + Auditoria | ✅ Concluída |
| 1F — Frontend Operacional + QR/Barcode | 🚧 Próxima |

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

Entrega: mínimo/máximo/ponto de reposição, alertas de reposição, mínimo, ruptura, validade, vencimento e fragmentação, além de `AuditLog` transacional.

Critério de saída: alertas são idempotentes enquanto ativos, recorrências preservam histórico e ações sensíveis são auditáveis dentro da mesma transação dos fluxos críticos.

Resultado: concluído com módulos próprios `alerts` e `audit`, RBAC dedicado, testes de contrato e detector Impeccable no CI do preview.

## 1F — Frontend Operacional + QR/Barcode

Entrega: React/Vite, login, dashboard, cadastros, entradas, retiradas, aprovações, transferências, ajustes, histórico, alertas, auditoria, câmera para QR/barcode e geração de QR, usando o design system `Industrial Control Room` definido em `DESIGN.md`.

Critério de saída: fluxos críticos da Fase 1 operam em navegador/tablet, com fallback manual no scanner e integração real com a API.

## Ordem

```text
1A Foundation/Auth         ✅
      ↓
1B Catalog/Locations       ✅
      ↓
1C Inventory Ledger        ✅
      ↓
1D Withdrawals/Approvals   ✅
      ↓
1E Alerts/Audit            ✅
      ↓
1F Web/QR                  🚧
```
