# A.L.M.A. — Fase 1: Design do Núcleo de Almoxarifado

## Visão geral

A.L.M.A. significa **Armazenamento, Localização, Movimentação e Autenticação**.

Este projeto é um estudo pessoal de um sistema inteligente de almoxarifado industrial. A Fase 1 implementa o núcleo transacional online do almoxarifado, com estoque, localizações físicas, usuários, permissões, movimentações, aprovações, rastreabilidade, custos, alertas e auditoria.

Visão computacional para identificação de itens e reconhecimento facial de usuários ficam fora desta fase, mas a arquitetura deve permitir sua inclusão posterior sem reescrever o domínio central.

## Objetivos

A Fase 1 deve permitir cadastro de produtos industriais, múltiplos almoxarifados, localização hierárquica, saldo por posição, localização principal, entradas, retiradas, devoluções, transferências, ajustes, aprovação condicional, usuários/RBAC, login de operador por matrícula + PIN, login administrativo por usuário + senha, rastreabilidade opcional por lote/serial/validade, QR/código de barras, custo médio, políticas de reposição, alertas e auditoria.

## Fora de escopo

- funcionamento offline;
- reconhecimento facial;
- identificação visual por IA;
- fornecedores, cotações e pedidos de compra;
- integração com ERP;
- automação de compras.

## Arquitetura

Monólito modular no início:

```text
A.L.M.A.
├── Web: React + TypeScript + Vite
├── API: Node.js + Express + TypeScript
├── Database: PostgreSQL + Prisma
└── Futuro: Vision Service em Python
```

Monorepo:

```text
apps/web
apps/api
apps/vision       # futuro
packages/database
packages/shared
packages/validation
docs
```

Domínios iniciais da API: `products`, `locations`, `inventory`, `movements`, `users`, `auth`, `approvals`, `destinations`, `alerts`, `audit`.

## Autenticação e autorização

Operadores usam matrícula/código + PIN. Administradores usam usuário + senha. Senhas e PINs são armazenados somente como hash seguro. O sistema usa RBAC com papéis iniciais `ADMIN`, `ALMOXARIFE`, `SOLICITANTE` e `APROVADOR`.

## Produtos e unidades

Cada produto possui identificador interno, SKU, descrição, categoria, unidade base e status. Pode ter fabricante, part number, descrição técnica, custo, estoque mínimo/máximo, ponto de reposição e políticas de aprovação/rastreabilidade. Um produto pode ter vários identificadores, incluindo QR Code e código de barras.

## Localização física

Suporte a múltiplos almoxarifados, com hierarquia padrão:

```text
Almoxarifado → Corredor → Estante → Prateleira → Posição
```

O mesmo produto pode existir em múltiplas posições, com no máximo uma localização principal por almoxarifado. Entradas e retiradas devem sugerir a posição principal.

## Estoque e movimentações

Saldo por produto + localização, refinado por lote/serial quando aplicável. Estoque negativo é proibido.

Tipos iniciais:

- `ENTRY`
- `WITHDRAWAL`
- `RETURN`
- `TRANSFER`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `INVENTORY_GAIN`
- `INVENTORY_LOSS`

Movimentações concluídas são imutáveis. Correções geram nova movimentação compensatória/ajuste. Operações de saldo são transacionais e devem resistir a concorrência.

## Destino e aprovação

Toda retirada exige destino estruturado por setor, máquina/equipamento e/ou ordem de serviço, com observação opcional. Produtos/categorias podem exigir aprovação. Aprovação não movimenta estoque; somente o atendimento da retirada aprovada o faz.

## Ajustes

`ADMIN` e `ALMOXARIFE` podem ajustar estoque, sempre com justificativa obrigatória e auditoria completa.

## Rastreabilidade

Opcional por produto: nenhum controle adicional, lote, lote + validade, serial, ou serial + validade.

## Custos

Controle de custo unitário de entrada, custo médio móvel e valor total estimado em estoque. Saídas usam o custo médio vigente para valorização histórica.

## Reposição e alertas

Produtos podem ter estoque mínimo, máximo e ponto de reposição. A Fase 1 gera alertas, sem criar compras automaticamente. Alertas iniciais: reposição, abaixo do mínimo, ruptura, validade próxima, vencido e fragmentação.

## Auditoria

Ações sensíveis geram `AuditLog` com usuário, ação, entidade, id, data/hora, valores anteriores/posteriores quando relevante e contexto técnico disponível.

## Modelo inicial

```text
User
Role
Permission
UserRole
Product
Category
UnitOfMeasure
ProductIdentifier
Warehouse
Aisle
Rack
Shelf
Bin
ProductLocation
InventoryBalance
Lot
SerialItem
StockMovement
StockMovementItem
WithdrawalRequest
Approval
Department
Equipment
WorkOrder
ReorderPolicy
Alert
AuditLog
```

## Regras invariáveis

1. Estoque nunca pode ficar negativo.
2. Toda retirada possui destino válido.
3. Produto pode existir em múltiplas posições.
4. Produto pode possuir localização principal.
5. Ajustes exigem justificativa.
6. Produto/categoria pode exigir aprovação.
7. Lote, serial e validade são opcionais.
8. Movimentações concluídas são imutáveis.
9. Correções geram novas movimentações.
10. Toda ação sensível gera auditoria.
11. Saldo total é a soma dos saldos por localização.
12. Usuários não alteram saldo diretamente.
13. Movimentações de saldo são transacionais.
14. Transferência reduz uma posição e aumenta outra na mesma transação.
15. Aprovação não movimenta estoque.

## Segurança

- hash seguro de senha/PIN;
- sessões/tokens com expiração;
- validação de entrada;
- RBAC no backend;
- rate limit em autenticação;
- logs sem segredos;
- segredos fora do repositório;
- auditoria.

Biometria não será armazenada na Fase 1.

## Critérios de sucesso

A Fase 1 deve permitir cadastrar usuários/permissões, almoxarifados/localizações, produtos, entradas, saldos, retiradas com destino, bloqueio de saldo insuficiente, retiradas com aprovação, transferências, ajustes justificados, histórico, custos, alertas, leitura QR/barcode e auditoria.
