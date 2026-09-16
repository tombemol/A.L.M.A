# A.L.M.A. Phase 1B — Catálogo + Localizações

## Objetivo

Adicionar ao A.L.M.A. um catálogo industrial consistente e um modelo de endereçamento físico flexível, preparando a base para o ledger de estoque da Fase 1C.

A Fase 1B define **o que é o material** e **onde ele pode existir**. Quantidades, entradas, saídas, custos, lotes e saldos permanecem fora deste escopo.

## Decisões de produto

- SKU interno é obrigatório e único por produto.
- Produtos podem possuir múltiplos identificadores adicionais.
- Categorias são hierárquicas, sem profundidade mínima obrigatória.
- Todo produto possui uma unidade base.
- Produtos podem possuir unidades alternativas com fator fixo de conversão para a unidade base.
- O sistema suporta múltiplos almoxarifados.
- O almoxarifado é obrigatório; níveis físicos abaixo dele são opcionais.
- Os níveis físicos permitidos são `AISLE`, `RACK`, `SHELF` e `POSITION`.
- Um nível pode ser omitido. Ex.: uma posição pode existir diretamente no almoxarifado ou abaixo de uma prateleira.
- A hierarquia deve sempre avançar de um nível mais genérico para um mais específico; ciclos são proibidos.
- Posições podem ser `DEDICATED` ou `SHARED`.
- Uma posição dedicada só pode possuir um produto associado.
- Uma posição compartilhada pode possuir vários produtos associados.
- Um produto pode estar associado a várias posições.
- Um produto pode ter no máximo uma localização preferencial por almoxarifado.
- Cadastros são desativados, não apagados, quando já podem participar de histórico futuro.

## Arquitetura

A Fase 1B mantém o monólito modular existente.

Novos módulos da API:

- `catalog/categories`
- `catalog/units`
- `catalog/products`
- `locations/warehouses`
- `locations/storage-locations`
- `locations/product-locations`

As regras de domínio ficam nos services. Rotas HTTP fazem validação Zod, autenticação e RBAC. O Prisma permanece responsável por persistência, chaves, índices e relações.

## Modelo de dados

### Category

- `id`
- `code` único
- `name`
- `parentId` opcional
- `active`
- timestamps

Uma categoria não pode ser seu próprio ancestral. A árvore pode ter qualquer profundidade, mas a API rejeita ciclos.

### UnitOfMeasure

- `id`
- `code` único, normalizado em maiúsculas
- `name`
- `symbol`
- `allowsDecimal`
- `active`
- timestamps

Exemplos: `UN`, `KG`, `M`, `L`, `CX`.

### Product

- `id`
- `sku` obrigatório e único, normalizado em maiúsculas
- `name`
- `description` opcional
- `categoryId`
- `baseUnitId`
- `manufacturer` opcional
- `active`
- timestamps

### ProductIdentifier

- `id`
- `productId`
- `type`: `EAN`, `UPC`, `MANUFACTURER`, `INTERNAL_BARCODE`, `QR`, `OTHER`
- `value`
- `normalizedValue`
- `label` opcional

`normalizedValue` é globalmente único. Isso permite resolver um material por leitura de código sem retornar resultados ambíguos.

O SKU continua sendo identidade primária do produto e não precisa ser duplicado em `ProductIdentifier`.

### ProductUnitConversion

- `id`
- `productId`
- `unitId`
- `factorToBase` decimal positivo

Único por `(productId, unitId)`.

Exemplo: produto base `UN`; conversão `CX -> 100 UN` usa `factorToBase = 100`.

A unidade base não deve ser cadastrada novamente como conversão alternativa.

### Warehouse

- `id`
- `code` único
- `name`
- `description` opcional
- `active`
- timestamps

### StorageLocation

- `id`
- `warehouseId`
- `parentId` opcional
- `kind`: `AISLE`, `RACK`, `SHELF`, `POSITION`
- `code`
- `name` opcional
- `occupancyMode` opcional, obrigatório apenas em `POSITION`: `DEDICATED` ou `SHARED`
- `active`
- timestamps

`code` é único dentro do almoxarifado. O caminho de apresentação é calculado pelos ancestrais, não armazenado como fonte de verdade.

Regras de parentesco:

- `AISLE`: pai deve ser nulo.
- `RACK`: pai pode ser nulo ou `AISLE`.
- `SHELF`: pai pode ser nulo, `AISLE` ou `RACK`.
- `POSITION`: pai pode ser nulo, `AISLE`, `RACK` ou `SHELF`.
- pai e filho devem pertencer ao mesmo almoxarifado.
- a ordem de nível nunca pode retroceder.
- ciclos são rejeitados.

### ProductLocation

- `id`
- `productId`
- `warehouseId`
- `locationId`
- `isPrimary`
- timestamps

Único por `(productId, locationId)`.

`warehouseId` é redundância intencional para permitir integridade e índice parcial de localização principal.

O banco cria índice parcial único garantindo no máximo um `isPrimary = true` por `(productId, warehouseId)`.

O service valida que `locationId` pertence ao mesmo `warehouseId`.

## Regras de ocupação

Ao associar produto a uma localização:

1. apenas `POSITION` recebe produtos;
2. posição inativa é rejeitada;
3. produto inativo é rejeitado;
4. `DEDICATED` sem associação aceita o primeiro produto;
5. `DEDICATED` já associada ao mesmo produto permite idempotência;
6. `DEDICATED` associada a outro produto retorna conflito;
7. `SHARED` aceita múltiplos produtos;
8. marcar uma associação como principal remove a flag principal anterior do mesmo produto no mesmo almoxarifado na mesma transação.

## Identificadores e normalização

- SKU: `trim + uppercase`.
- códigos de categoria, unidade, almoxarifado e localização: `trim + uppercase`.
- identificadores de produto: `trim`; para comparação, `normalizedValue` remove espaços externos e converte letras para maiúsculas.
- nomes preservam capitalização digitada.

## API HTTP

Prefixo: `/api`.

### Categorias

- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`

### Unidades

- `GET /api/units`
- `POST /api/units`
- `PATCH /api/units/:id`

### Produtos

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/resolve/:identifier`
- `POST /api/products`
- `PATCH /api/products/:id`
- `POST /api/products/:id/identifiers`
- `DELETE /api/products/:id/identifiers/:identifierId`
- `PUT /api/products/:id/conversions`

### Almoxarifados e localizações

- `GET /api/warehouses`
- `POST /api/warehouses`
- `PATCH /api/warehouses/:id`
- `GET /api/warehouses/:warehouseId/locations`
- `POST /api/warehouses/:warehouseId/locations`
- `PATCH /api/locations/:id`
- `POST /api/products/:productId/locations`
- `GET /api/products/:productId/locations`
- `DELETE /api/products/:productId/locations/:associationId`

## RBAC

Novas permissões:

- `catalog.read`
- `catalog.manage`
- `locations.read`
- `locations.manage`

Papéis iniciais:

- `ADMIN`: todas.
- `ALMOXARIFE`: todas as quatro.
- `SOLICITANTE`: `catalog.read`, `locations.read`.
- `APROVADOR`: `catalog.read`, `locations.read`.

Todos os endpoints da 1B exigem autenticação.

## Erros de domínio

Contratos mínimos:

- `CATEGORY_CYCLE` -> 409
- `DUPLICATE_CODE` -> 409
- `DUPLICATE_SKU` -> 409
- `DUPLICATE_IDENTIFIER` -> 409
- `INVALID_CONVERSION` -> 400
- `INVALID_LOCATION_PARENT` -> 400
- `LOCATION_CYCLE` -> 409
- `DEDICATED_LOCATION_OCCUPIED` -> 409
- `INVALID_PRIMARY_LOCATION` -> 400
- `NOT_FOUND` -> 404

## Transações

Devem ser transacionais:

- criação de produto com identificadores/conversões iniciais;
- substituição de conversões;
- troca da localização principal;
- validação + associação em posição dedicada.

## Fora do escopo

A Fase 1B não implementa:

- quantidade em estoque;
- saldo por posição;
- entrada/saída;
- lote, série ou validade;
- custos;
- pedido de retirada;
- fornecedores;
- compras;
- visão computacional;
- reconhecimento facial;
- sincronização offline.

## Critérios de aceite

A 1B está concluída quando:

1. categoria hierárquica pode ser criada sem permitir ciclos;
2. unidades base e alternativas podem ser cadastradas;
3. produto exige SKU único e unidade base;
4. identificador adicional resolve um produto sem ambiguidade;
5. múltiplos almoxarifados podem ser cadastrados;
6. hierarquia física pode omitir níveis sem violar a ordem;
7. posição dedicada bloqueia segundo produto diferente;
8. posição compartilhada aceita múltiplos produtos;
9. produto pode possuir várias posições;
10. existe no máximo uma posição principal por produto por almoxarifado;
11. RBAC protege leitura e gestão;
12. migrations, typecheck, testes e build passam no CI.
