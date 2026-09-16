# A.L.M.A. — Fase 1E: Alertas, Auditoria e Identidade Operacional

## Objetivo

A Fase 1E adiciona políticas de reposição, alertas operacionais idempotentes e trilha de auditoria ampliada. Em paralelo, a demonstração pública passa a usar o design system **Industrial Control Room**, documentado em `PRODUCT.md` e `DESIGN.md`.

## Escopo funcional

### Políticas de reposição

Cada produto pode possuir uma `ReorderPolicy` com:

- estoque mínimo;
- estoque máximo;
- ponto de reposição;
- janela de validade próxima em dias.

Valores são opcionais e não negativos. Quando mínimo e máximo coexistem, o mínimo não pode superar o máximo. O ponto de reposição não pode superar o máximo quando ambos existem.

### Alertas

Tipos iniciais:

- `REORDER` — saldo no ou abaixo do ponto de reposição;
- `BELOW_MINIMUM` — saldo abaixo do mínimo;
- `STOCKOUT` — saldo zerado;
- `EXPIRY_NEAR` — lote/serial com saldo positivo dentro da janela de validade;
- `EXPIRED` — lote/serial com saldo positivo vencido;
- `FRAGMENTATION` — produto com saldo positivo distribuído em múltiplas posições.

Alertas ativos são idempotentes por uma chave canônica. Reavaliar a mesma condição atualiza o instante da última detecção sem duplicar registros. Quando a condição deixa de existir, o alerta é resolvido, sua chave ativa é liberada e uma recorrência futura pode gerar novo registro.

A Fase 1E não cria compras nem pedidos automaticamente.

### Auditoria

`AuditLog` registra:

- ator autenticado quando disponível;
- ação;
- tipo da entidade;
- ID da entidade;
- instante;
- valores anteriores/posteriores quando relevante;
- contexto técnico seguro.

Nunca registrar senha, PIN, cookie, token ou segredo.

Ações auditadas inicialmente:

- alteração de política de reposição;
- avaliação/resolução manual de alertas quando houver mutação explícita;
- entradas, transferências e ajustes de estoque;
- criação, decisão e atendimento de retiradas;
- retirada direta;
- mutações administrativas sensíveis que já passem pelos serviços tocados nesta fase.

A auditoria deve ser persistida na mesma operação lógica sempre que o serviço já estiver dentro de uma transação de banco.

## API

### Alertas

```text
GET  /api/alerts
POST /api/alerts/evaluate
GET  /api/alerts/policies/:productId
PUT  /api/alerts/policies/:productId
```

Filtros de listagem: tipo, severidade, produto, resolvido/ativo e paginação.

### Auditoria

```text
GET /api/audit
```

Filtros: ator, ação, tipo de entidade, ID da entidade, intervalo de datas e paginação.

## RBAC

Novas permissões:

```text
alerts.read
alerts.manage
audit.read
```

`ADMIN` recebe as três. Papéis operacionais recebem apenas o necessário conforme o seed existente.

## Persistência

Novas entidades:

```text
ReorderPolicy
Alert
AuditLog
```

Enums:

```text
AlertType
AlertSeverity
```

Um alerta resolvido mantém seu histórico. A chave usada para idempotência fica `null` após resolução para permitir recorrência.

## Interface de demonstração

O Pages passa de seis para oito áreas:

1. Visão geral;
2. Produtos;
3. Localizações;
4. Estoque;
5. Retiradas;
6. Alertas;
7. Auditoria;
8. Leitor.

A demonstração continua estática e usa dados simulados. Ela deve representar o contrato visual da futura Fase 1F, não fingir que está conectada à API.

## Design system

Fonte de verdade:

- `PRODUCT.md` — contexto de produto/usuário;
- `DESIGN.md` — tokens e regras visuais.

Direção: **Industrial Control Room**.

Regras obrigatórias:

- IBM Plex Sans para interface;
- IBM Plex Mono para códigos/IDs;
- superfícies grafite;
- âmbar como ação/atenção principal;
- vermelho/verde/azul apenas semânticos;
- raios de 2–6 px;
- sem gradientes decorativos;
- sem glow;
- sem glassmorphism;
- hierarquia por tipografia, divisores, superfície e espaço;
- 44 px de alvo mínimo para interação crítica;
- navegação adaptada a tablet;
- contraste mínimo compatível com WCAG AA para texto normal.

## Testes e quality gate

### Backend

Cobrir:

- validação de política;
- idempotência de alertas;
- resolução e recorrência;
- ruptura / mínimo / reposição;
- validade próxima / vencido;
- fragmentação;
- RBAC;
- filtros/paginação;
- persistência de auditoria para mutações críticas.

### Preview

Cobrir por teste estático:

- oito views;
- conteúdo pt-BR;
- tokens de `DESIGN.md` refletidos no CSS;
- ausência de gradientes decorativos;
- navegação tablet;
- dados demonstrativos de alertas e auditoria.

Executar também o detector do Impeccable no quality gate quando a versão fixada estiver estável no CI.

## Critérios de saída

- políticas de reposição persistentes e protegidas por RBAC;
- alertas iniciais gerados sem duplicação;
- condições resolvidas deixam histórico e podem recorrer;
- ações sensíveis cobertas pela Fase 1E geram `AuditLog`;
- API de alertas/auditoria consultável com paginação;
- preview público com Industrial Control Room, Alertas e Auditoria;
- `PRODUCT.md`, `DESIGN.md`, README e Pages sincronizados;
- typecheck, testes, build e detector visual verdes.