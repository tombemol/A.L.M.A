# A.L.M.A.

**Armazenamento, Localização, Movimentação e Autenticação**

A.L.M.A. é um estudo pessoal de um sistema inteligente de almoxarifado industrial com foco em rastreabilidade, localização física de materiais, controle de movimentações e autenticação segura.

## Status

Em desenvolvimento. A Fase 1A implementa a fundação técnica, autenticação e RBAC.

## Stack da Fase 1A

- Node.js 22+
- TypeScript
- Express 5
- PostgreSQL 16
- Prisma
- Zod
- Argon2id
- Vitest + Supertest
- pnpm workspaces
- Docker Compose

## Requisitos

- Node.js 22+
- pnpm 10+
- Docker + Docker Compose

## Desenvolvimento local

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

API: `http://localhost:3000`

Health check:

```bash
curl http://localhost:3000/health
```

Nunca faça commit do arquivo `.env`.

## Autenticação

Operador:

```text
POST /api/auth/operator/login
{ employeeCode, pin }
```

Administrador:

```text
POST /api/auth/admin/login
{ username, password }
```

Sessão atual:

```text
GET /api/auth/me
```

Logout:

```text
POST /api/auth/logout
```

Logins bem-sucedidos usam cookie de sessão `HttpOnly`. O token cru não é persistido no banco.

## Bootstrap administrativo

Para criar/atualizar um administrador inicial, configure localmente:

```dotenv
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=uma-senha-local-forte
```

Depois execute:

```bash
pnpm db:seed
```

A senha é segredo de ambiente e não deve ser commitada.

## Documentação

- `docs/superpowers/specs/2026-09-16-alma-phase-1-design.md`
- `docs/superpowers/plans/2026-09-16-alma-phase-1-roadmap.md`
- `docs/superpowers/plans/2026-09-16-alma-phase-1a-foundation-auth.md`
