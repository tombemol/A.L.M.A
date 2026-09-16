# A.L.M.A. — Plano da Fase 1D: Retiradas, Aprovações e Destinos

**Branch:** `agent/phase-1d-withdrawals-approvals`  
**Base:** Fase 1C concluída em `main`  
**Design de referência:** `docs/superpowers/specs/2026-09-16-alma-phase-1-design.md`

## Objetivo

Implementar a saída operacional de materiais com destino estruturado, política de aprovação por produto/categoria e atendimento idempotente. A aprovação deve ser apenas uma decisão de negócio: **não altera saldo**. O estoque só muda no atendimento, dentro da mesma fronteira transacional do ledger da Fase 1C.

## Invariantes

1. Toda retirada possui um destino válido.
2. Departamento/setor é obrigatório; equipamento e OS são opcionais, mas quando informados precisam pertencer ao destino informado.
3. Produto ou categoria pode exigir aprovação. A política efetiva é `produto exige || categoria exige`.
4. Produto controlado não pode ser retirado diretamente.
5. Aprovar ou rejeitar não altera `InventoryBalance`, `InventoryValuation` nem cria `StockMovement`.
6. Apenas solicitação `APPROVED` pode ser atendida.
7. Atendimento concluído cria exatamente um `StockMovement` do tipo `WITHDRAWAL`.
8. Repetir o atendimento de uma solicitação já concluída é idempotente e não cria uma segunda saída.
9. O usuário autenticado define autoria de solicitação, decisão e atendimento; IDs de ator vindos do cliente são ignorados/rejeitados.
10. O endpoint genérico de inventário deixa de aceitar `WITHDRAWAL`, impedindo bypass do fluxo da Fase 1D.
11. Estoque negativo continua proibido e a saída utiliza o custo médio vigente.
12. Todo histórico de retirada preserva destino, solicitante, aprovador/decisor, atendente e movimento de estoque associado.

## Modelo de dados

### Novos enums

```text
WithdrawalRequestStatus
  PENDING_APPROVAL
  APPROVED
  REJECTED
  FULFILLING
  FULFILLED
  CANCELLED

ApprovalDecision
  APPROVED
  REJECTED
```

### Novas entidades

`Department`
- `id`, `code`, `name`, `active`, timestamps.

`Equipment`
- `id`, `code`, `name`, `departmentId`, `active`, timestamps.
- Equipamento pertence a um departamento.

`WorkOrder`
- `id`, `code`, `description?`, `departmentId`, `equipmentId?`, `active`, timestamps.
- OS pertence a um departamento e pode apontar para um equipamento do mesmo departamento.

`WithdrawalRequest`
- `id`, `status`, `approvalRequired`.
- `productId`, `quantity`.
- `departmentId`, `equipmentId?`, `workOrderId?`, `note?`.
- `requestedByUserId`.
- `fulfilledByUserId?`, `stockMovementId?` único.
- `createdAt`, `updatedAt`, `fulfilledAt?`.

`Approval`
- `id`, `withdrawalRequestId` único.
- `decision`, `decidedByUserId`, `note?`, `createdAt`.

### Política de aprovação

Adicionar:

```text
Category.requiresWithdrawalApproval Boolean @default(false)
Product.requiresWithdrawalApproval  Boolean @default(false)
```

A política efetiva é OR. Não há override negativo nesta fase; se a categoria for controlada, o produto permanece controlado.

## Permissões

```text
withdrawals.read
withdrawals.request
withdrawals.approve
withdrawals.fulfill
destinations.read
destinations.manage
```

Papéis iniciais:
- `ADMIN`: todas.
- `ALMOXARIFE`: leitura de retiradas, solicitação, atendimento e gestão de destinos.
- `SOLICITANTE`: leitura e solicitação.
- `APROVADOR`: leitura e aprovação.

## Fluxos

### Solicitação

`POST /api/withdrawal-requests`

Entrada: produto, quantidade e destino.
- valida produto/destino;
- resolve política de aprovação;
- se controlado: `PENDING_APPROVAL`;
- se não controlado: `APPROVED` automaticamente, permitindo atendimento posterior sem decisão humana.

Nenhum saldo é alterado.

### Aprovação/rejeição

```text
POST /api/withdrawal-requests/:id/approve
POST /api/withdrawal-requests/:id/reject
```

Somente `PENDING_APPROVAL` aceita decisão. Cria `Approval` e muda status. Saldo continua intacto.

### Atendimento

`POST /api/withdrawal-requests/:id/fulfill`

Entrada operacional: posição de origem e, quando necessário, lote/serial.

Dentro de **uma transação serializável**:
1. reivindica a solicitação `APPROVED` mudando-a para `FULFILLING`;
2. executa o ledger `WITHDRAWAL` usando a mesma `TransactionClient`;
3. grava `stockMovementId`, atendente e `FULFILLED`;
4. rollback restaura tudo se qualquer etapa falhar.

Se a solicitação já estiver `FULFILLED`, retorna o movimento existente sem nova saída.

### Retirada direta

`POST /api/withdrawals/direct`

Permitida apenas quando a política efetiva não exige aprovação. Cria o registro histórico da retirada e o movimento de estoque na mesma transação.

### Consultas

```text
GET /api/withdrawal-requests
GET /api/withdrawal-requests/:id
GET /api/destinations/departments
GET /api/destinations/equipment
GET /api/destinations/work-orders
```

Filtros de retirada: status, produto, departamento, solicitante e período/paginação quando necessário.

## Refatoração do ledger

Extrair do serviço atual uma função transacional reutilizável, por exemplo:

```ts
postInventoryMovementInTx(tx, actorUserId, input)
```

`postInventoryMovement()` continua como wrapper público que abre a transação. O módulo de retiradas usa a função `InTx` para manter request + movimento + saldo + custo na mesma transação.

## Plano TDD

### Tarefa 1 — Persistência, política e permissões

Primeiro teste RED:
- entidades de destino e retirada existem;
- constraints básicas e relações são `RESTRICT` onde histórico não pode desaparecer;
- quantidade de solicitação > 0;
- política de aprovação existe em produto/categoria;
- permissões e seed estão atribuídos aos papéis corretos.

Depois migration/schema/seed até GREEN.

### Tarefa 2 — Destinos estruturados

Testes:
- departamento/equipamento/OS válidos;
- equipamento de outro setor é rejeitado;
- OS de outro setor é rejeitada;
- OS ligada a equipamento incompatível é rejeitada;
- destinos inativos não podem receber nova retirada.

Implementar serviços + API/RBAC.

### Tarefa 3 — Solicitação e política de aprovação

Testes:
- produto comum cria request `APPROVED` sem alterar saldo;
- produto controlado cria `PENDING_APPROVAL` sem alterar saldo;
- categoria controlada também exige aprovação;
- destino é obrigatório;
- ator é sempre o usuário autenticado.

### Tarefa 4 — Aprovação e rejeição

Testes:
- aprovador autorizado decide request pendente;
- decisão não altera saldo nem cria movement;
- rejeitada não pode ser atendida;
- decisão duplicada/conflitante é bloqueada;
- RBAC separa solicitante de aprovador.

### Tarefa 5 — Atendimento idempotente e atômico

Testes:
- request aprovada atendida reduz saldo e valorização uma vez;
- movimento recebe custo médio;
- segunda chamada retorna o mesmo movement sem nova saída;
- saldo insuficiente faz rollback do status;
- tentativa concorrente não duplica saída;
- request sem aprovação válida não é atendida.

Refatorar ledger para `TransactionClient` compartilhável.

### Tarefa 6 — Retirada direta e bloqueio de bypass

Testes:
- produto sem aprovação pode sair diretamente;
- produto controlado retorna conflito/erro de política;
- `POST /api/inventory/movements` rejeita `WITHDRAWAL` externo;
- retirada direta preserva destino e autoria no histórico.

### Tarefa 7 — Histórico e consultas

Testes:
- filtros por status/produto/departamento;
- detalhe inclui destino, decisão, atores e movimento;
- paginação estável;
- leitura protegida por `withdrawals.read`.

### Tarefa 8 — Fechamento visual

- adicionar área/fluxo de **Retiradas** ao preview tablet sem fingir integração live;
- demonstrar pendentes, aprovadas/rejeitadas e histórico de atendimento;
- atualizar README para 1D concluída / 1E próxima;
- suíte completa;
- PR, squash merge na `main`;
- confirmar CI da `main` e Pages publicado.

## Fora do escopo da 1D

- estoque mínimo/máximo e alertas automáticos (1E);
- `AuditLog` geral (1E), embora o próprio modelo de retirada preserve atores e decisões;
- frontend React conectado à API (1F);
- reserva de estoque na aprovação;
- múltiplos itens em uma única solicitação. Nesta fase, **uma solicitação representa um produto e uma quantidade**, mantendo o fluxo e a atomicidade explícitos.

## Critério de saída

A Fase 1D termina quando:
- destino é obrigatório e validado;
- política de aprovação é respeitada sem alterar saldo na decisão;
- atendimento aprovado gera exatamente uma saída;
- retirada direta não burla produto controlado;
- histórico identifica solicitante, decisão, atendente e destino;
- CI completo está verde;
- README e Pages representam a 1D após merge na `main`.
