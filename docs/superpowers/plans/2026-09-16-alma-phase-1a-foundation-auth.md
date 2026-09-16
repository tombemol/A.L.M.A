# A.L.M.A. Phase 1A — Foundation + Authentication/RBAC Implementation Plan

> **For agentic workers:** implement task-by-task with TDD and review between tasks.

**Goal:** criar a fundação executável do A.L.M.A. com monorepo, API TypeScript, PostgreSQL/Prisma, autenticação por PIN/senha, sessões revogáveis e RBAC.

**Architecture:** monólito modular. `apps/api` expõe HTTP/Express, `packages/database` encapsula Prisma e `packages/shared` contém contratos/erros. A sessão é opaca: o cliente recebe token aleatório em cookie HttpOnly e apenas SHA-256 do token é persistido.

**Tech Stack:** Node.js 22+, pnpm 10+, TypeScript, Express 5, Prisma, PostgreSQL 16+, Zod, Argon2id, Vitest, Supertest, Docker Compose e GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-16-alma-phase-1-design.md`

## Restrições globais

- Fase 1 online-only.
- Operador: matrícula/código + PIN.
- Administrador: usuário + senha.
- PIN/senha nunca em texto puro.
- RBAC configurável; regras consultam permissões.
- Papéis iniciais: `ADMIN`, `ALMOXARIFE`, `SOLICITANTE`, `APROVADOR`.
- Segredos fora do repositório.
- Logs sem senha, PIN ou token.
- Escritas validam entrada.
- Backend nega acesso por padrão.
- 1A não implementa produto, estoque, frontend, visão ou biometria.

## Task 1 — Bootstrap do monorepo

Criar:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
.env.example
.gitignore
docker-compose.yml
apps/api/package.json
apps/api/tsconfig.json
apps/api/vitest.config.ts
apps/api/src/config/env.ts
apps/api/src/app.ts
apps/api/src/server.ts
packages/database/package.json
packages/database/tsconfig.json
packages/shared/package.json
packages/shared/tsconfig.json
```

Scripts raiz: `dev`, `build`, `typecheck`, `test`, `test:api`, `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:seed`.

O health check `GET /health` deve retornar `{"status":"ok"}`.

Verificação:

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm dev
curl http://localhost:3000/health
```

Commit: `chore: bootstrap ALMA monorepo`.

## Task 2 — Banco e schema de autenticação

Criar modelos Prisma:

```text
User
Role
Permission
UserRole
RolePermission
AuthSession
```

Campos essenciais de `User`: `employeeCode?`, `username?`, `displayName`, `pinHash?`, `passwordHash?`, `active`, timestamps.

`AuthSession`: `userId`, `tokenHash` único, `expiresAt`, `revokedAt?`, `createdAt`.

Criar singleton Prisma e teste de integração que persista um usuário.

Verificação:

```bash
pnpm db:generate
pnpm db:migrate
pnpm test:api -- database.smoke.test.ts
```

Commit: `feat: add authentication database schema`.

## Task 3 — Contratos compartilhados

Criar `DomainError` e permissões iniciais:

```text
users.read
users.manage
roles.read
roles.manage
admin.access
```

TDD: teste de `DomainError` deve falhar antes da implementação e passar depois.

Commit: `feat: add shared permissions and domain errors`.

## Task 4 — Hash e sessões

Implementar:

```ts
hashSecret(secret: string): Promise<string>
verifySecret(hash: string, secret: string): Promise<boolean>
createSession(userId: string): Promise<{token: string; expiresAt: Date}>
resolveSession(token: string): Promise<SessionUser | null>
revokeSession(token: string): Promise<void>
```

Usar Argon2id para senha/PIN e 32 bytes aleatórios para token. Persistir somente SHA-256 do token.

TDD:
- hash valida segredo correto e rejeita diferente;
- sessão ativa resolve usuário;
- sessão revogada deixa de resolver.

Commit: `feat: add secure credential hashing and sessions`.

## Task 5 — Serviço de login

Schemas Zod:

```ts
operator: { employeeCode, pin }
admin: { username, password }
```

Implementar `loginOperator` e `loginAdmin`. Conta inexistente, inativa ou segredo incorreto devem gerar o mesmo `INVALID_CREDENTIALS` 401.

TDD cobre login de operador, login administrativo e erro genérico.

Commit: `feat: add operator and admin login services`.

## Task 6 — HTTP auth

Endpoints:

```text
POST /api/auth/operator/login
POST /api/auth/admin/login
POST /api/auth/logout
GET  /api/auth/me
```

Cookie:

```text
HttpOnly=true
SameSite=Lax
Secure=true em produção
expiração = sessão
```

Adicionar rate limit nos dois logins, middleware que resolve a sessão e handler de erros para `ZodError`/`DomainError`.

TDD deve provar:
- body inválido -> 400;
- login -> `Set-Cookie` HttpOnly;
- `/me` sem sessão -> 401;
- login -> `/me` -> logout -> `/me` 401.

Commit: `feat: expose session authentication API`.

## Task 7 — RBAC e seed

Implementar:

```ts
requireAuth
requirePermission(permission)
```

Seed idempotente:
- permissões iniciais;
- papéis `ADMIN`, `ALMOXARIFE`, `SOLICITANTE`, `APROVADOR`;
- `ADMIN` recebe todas as permissões da fase;
- bootstrap admin opcional por `BOOTSTRAP_ADMIN_USERNAME` + `BOOTSTRAP_ADMIN_PASSWORD`;
- nunca logar senha.

TDD:
- anônimo -> 401;
- autenticado sem permissão -> 403;
- com `admin.access` -> permitido.

Commit: `feat: add RBAC guards and bootstrap roles`.

## Task 8 — Administração de usuários

Endpoints:

```text
GET   /api/users
POST  /api/users
PATCH /api/users/:id/status
PUT   /api/users/:id/roles
```

Leitura requer `users.read`; escritas requerem `users.manage`.

Criação aceita:

```ts
{
  displayName: string,
  employeeCode?: string,
  username?: string,
  pin?: string,
  password?: string,
  roleCodes: string[]
}
```

Regras:
- ao menos `employeeCode` ou `username`;
- `employeeCode` exige PIN;
- `username` exige password;
- papéis desconhecidos rejeitados;
- duplicidade -> `DUPLICATE_IDENTIFIER` 409;
- respostas nunca expõem hashes;
- desativar usuário revoga sessões vivas;
- substituir papéis ocorre transacionalmente.

TDD cobre anonimato, permissão, criação, duplicidade e revogação ao desativar.

Commit: `feat: add RBAC-protected user administration`.

## Task 9 — CI e documentação

Criar `.github/workflows/ci.yml` com PostgreSQL 16 e:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate:deploy
pnpm typecheck
pnpm test
pnpm build
```

README documenta requisitos, bootstrap local, health, endpoints auth e segredo bootstrap.

Verificação final limpa:

```bash
docker compose down -v
docker compose up -d
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm typecheck
pnpm test
pnpm build
```

Commit: `ci: verify ALMA foundation and auth`.

## Critérios de aceite 1A

- PostgreSQL sobe via Compose.
- `/health` 200.
- Migrations funcionam em banco limpo.
- Operador autentica com matrícula + PIN.
- Admin autentica com usuário + senha.
- Credencial incorreta não revela existência da conta.
- Argon2id para senha/PIN.
- Token cru nunca persiste.
- Cookie HttpOnly/SameSite=Lax.
- Logout revoga sessão.
- Desativação revoga sessões.
- RBAC retorna 401/403 corretamente.
- Login tem rate limit.
- Seed é idempotente.
- Administração nunca serializa hashes.
- CI passa typecheck/test/build.
