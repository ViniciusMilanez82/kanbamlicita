# C2-A — Autenticação (Auth) Design Spec

## Contexto

O KanbanLicita é um sistema multi-tenant onde cada empresa vê apenas seus próprios dados. Antes de implementar a separação de dados por empresa (C2-B), é necessário ter autenticação funcionando: login, sessão e proteção de rotas.

Tenants são criados manualmente por um administrador — não há auto-cadastro. O primeiro admin é criado via script de terminal.

---

## Escopo

Este spec cobre **somente a autenticação (C2-A)**. Multi-tenancy (empresaId em todos os modelos, query scoping) é C2-B e depende deste spec.

---

## Stack

- **Next.js 16.2.1** App Router (Turbopack)
- **NextAuth.js v5** (`next-auth@beta`) com Credentials provider
- **@auth/prisma-adapter** para compatibilidade de interface com o PrismaClient
- **bcryptjs** para hash de senha
- **Prisma 7** com driver adapter `@prisma/adapter-pg` (já em uso via `@/lib/db`)

**Estratégia de sessão:** JWT (`strategy: 'jwt'`). Obrigatório para o Credentials provider. Com JWT, as sessões **não são gravadas no banco** — os modelos `Session` e `VerificationToken` existem apenas para satisfazer a interface do adapter e para compatibilidade futura com OAuth (C2-B).

**Nota sobre `@auth/prisma-adapter` + driver adapter mode:** O `lib/db.ts` usa `new PrismaClient({ adapter: new PrismaPg(...) })` (driver adapter mode do Prisma 7). O `@auth/prisma-adapter` chama `db.user`, `db.account` etc. que são métodos padrão do `PrismaClient` — o driver adapter apenas muda o mecanismo de conexão, não a API do cliente. A compatibilidade deve funcionar. Se houver erro ao instanciar `PrismaAdapter(db)`, verificar a versão instalada do `@auth/prisma-adapter` e consultar as release notes.

---

## Instalação de dependências

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

---

## Variáveis de ambiente

Adicionar ao `.env` e `.env.example`:

```env
AUTH_SECRET=gere_uma_string_aleatoria_longa_aqui
```

Gerar com: `openssl rand -base64 32`

O NextAuth v5 requer `AUTH_SECRET` para assinar o JWT. Sem ela, a aplicação lança erro em qualquer ambiente.

---

## Schema — Novos modelos

Adicionar ao `prisma/schema.prisma`.

**Importante:** o `@auth/prisma-adapter` acessa os modelos pelos nomes exatos `user`, `account`, `session`, `verificationToken` via `db.*`. Por isso os modelos Prisma devem usar os nomes em inglês (`User`, `Account`, `Session`, `VerificationToken`), mas as tabelas no banco são mapeadas para nomes em português via `@@map`.

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique @db.VarChar(255)
  emailVerified DateTime? @map("email_verified")
  senha        String?  @db.VarChar(255)
  name         String?  @db.VarChar(100)
  image        String?
  role         String   @default("user") @db.VarChar(20)
  ativo        Boolean  @default(true)
  criadoEm     DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  accounts Account[]
  sessions Session[]

  @@map("usuarios")
}

// Usado apenas com OAuth (C2-B). Com Credentials provider, não é populado.
model Account {
  id                String  @id @default(uuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("contas_auth")
}

// Não utilizado com strategy: 'jwt'. Existe para satisfazer a interface do adapter.
model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessoes_auth")
}

// Não utilizado com strategy: 'jwt'. Existe para satisfazer a interface do adapter.
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verificacao_tokens")
}
```

**Valores canônicos de `role`:** `"user"` | `"admin"`

**Regras:**
- `senha` é nullable para compatibilidade futura com OAuth (C2-B)
- `ativo: false` bloqueia login mesmo com credenciais corretas
- Email é normalizado para lowercase antes de qualquer comparação

---

## Arquivos a criar/modificar

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `prisma/schema.prisma` | Modificar | Adicionar 4 modelos acima |
| `auth.ts` | Criar | Configuração central do NextAuth |
| `proxy.ts` | Criar | Proteção automática de rotas (Next.js 16) |
| `app/api/auth/[...nextauth]/route.ts` | Criar | Handler HTTP do NextAuth |
| `app/login/page.tsx` | Criar | Tela de login (Server Component wrapper) |
| `app/login/LoginForm.tsx` | Criar | Formulário de login (Client Component) |
| `types/next-auth.d.ts` | Criar | Extensão de tipos da sessão |
| `scripts/seed-admin.ts` | Criar | Script de criação do primeiro admin |
| `app/page.tsx` | Modificar | Verificar sessão antes de redirecionar |

---

## `auth.ts` — Configuração NextAuth

```ts
// auth.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.toLowerCase().trim()
        const senha = credentials?.senha as string
        if (!email || !senha) return null

        const usuario = await db.user.findUnique({ where: { email } })
        if (!usuario?.senha || !usuario.ativo) return null

        const ok = await bcrypt.compare(senha, usuario.senha)
        if (!ok) return null

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.name,
          role: usuario.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
```

**Nota:** `db.user` (não `db.usuario`) porque o modelo Prisma se chama `User`.

---

## `proxy.ts` — Proteção de rotas

**Importante:** No Next.js 16, o arquivo `middleware.ts` foi depreciado e renomeado para `proxy.ts`. O export deve se chamar `proxy` (não `middleware`). Ver: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

O NextAuth v5 exporta `auth as middleware`, que não pode ser re-exportado diretamente. Criar um wrapper explícito:

```ts
// proxy.ts
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const session = await auth()

  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/kanban', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
}
```

**Nota sobre compatibilidade:** `auth()` lê o JWT do cookie e está disponível no contexto do proxy (não faz chamada ao banco com `strategy: 'jwt'`). Se houver erro de runtime ao chamar `auth()` no proxy, o implementador deve inspecionar a versão do `next-auth@beta` instalada e verificar se ela suporta chamada direta no proxy sem request como argumento. Alternativa: usar `auth` como wrapper `auth(handler)` conforme docs do NextAuth v5.

---

## `app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

---

## `app/page.tsx` — Atualização

A rota raiz atual faz `redirect('/kanban')` sem verificar sessão, causando dois redirects em cadeia (/ → /kanban → /login). Atualizar para verificar sessão primeiro:

```ts
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await auth()
  if (!session) redirect('/login')
  redirect('/kanban')
}
```

---

## Tela de login — `/login`

### Comportamento
- Usuário logado que acessa `/login` é redirecionado para `/kanban`
- Após login bem-sucedido → redirect para `/kanban`
- Credenciais inválidas → mensagem: `"Email ou senha incorretos"`
- Usuário inativo → mesma mensagem genérica (não revelar motivo real)
- Sem link de "esqueci a senha" ou "criar conta"

### UI
- Fundo: `bg-slate-900` (consistente com sidebar)
- Card central branco com sombra, `max-w-sm`, centralizado vertical e horizontal
- Logo/nome "KanbanLicita" acima do card
- Campos: Email, Senha
- Botão "Entrar" (azul, full width, desabilitado durante loading)
- Mensagem de erro abaixo do botão (vermelho, `text-sm`)

### Componentes
- `app/login/page.tsx` — Server Component: verifica sessão com `await auth()`, redireciona se já logado
- `app/login/LoginForm.tsx` — Client Component (`'use client'`): usa `signIn('credentials', { email, senha, redirectTo: '/kanban' })` do `next-auth/react`

---

## Extensão de tipos — `types/next-auth.d.ts`

```ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }
}
```

O diretório `types/` já existe no projeto (contém `licitacao-detalhe.ts`).

---

## Script `scripts/seed-admin.ts`

### Uso (com `tsx`, que já está instalado como devDependency)

```bash
npx tsx scripts/seed-admin.ts \
  --email admin@empresa.com \
  --nome "Administrador" \
  --senha "senha_segura"
```

### Código do script

```ts
// scripts/seed-admin.ts
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

function arg(name: string): string {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error(`Argumento --${name} é obrigatório`)
    process.exit(1)
  }
  return process.argv[idx + 1]
}

async function main() {
  const email = arg('email').toLowerCase().trim()
  const nome = arg('nome')
  const senha = arg('senha')

  const existente = await db.user.findUnique({ where: { email } })
  if (existente) {
    console.log(`Usuário ${email} já existe. Nenhuma ação necessária.`)
    return
  }

  const hash = await bcrypt.hash(senha, 12)
  await db.user.create({
    data: {
      email,
      name: nome,
      senha: hash,
      role: 'admin',
      ativo: true,
    },
  })

  console.log(`Admin criado com sucesso: ${email}`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => db.$disconnect())
```

**Nota:** Usar `tsx` (não `ts-node`) pois o `tsconfig.json` tem `"moduleResolution": "bundler"` que o `ts-node` não suporta. O `tsx` está instalado como devDependency. O path alias `@/lib/db` funciona com `tsx` pois ele lê o `tsconfig.json` automaticamente.

---

## Uso da sessão em Server Components

```ts
import { auth } from '@/auth'

export default async function AlgumaPage() {
  const session = await auth()
  // session?.user.id   → id do usuário logado
  // session?.user.role → "admin" | "user"
}
```

---

## Testes

| Caso | Resultado esperado |
|---|---|
| Email correto + senha correta + ativo=true | Login bem-sucedido, redirect /kanban |
| Email correto + senha errada | Erro "Email ou senha incorretos" |
| Email correto + senha correta + ativo=false | Erro "Email ou senha incorretos" |
| Email com letras maiúsculas (ex: Admin@Empresa.com) | Normalizado, login bem-sucedido |
| Acesso a `/kanban` sem sessão | Redirect para /login |
| Acesso a `/licitacoes` sem sessão | Redirect para /login |
| Acesso a `/configuracoes` sem sessão | Redirect para /login |
| Acesso a `/login` com sessão ativa | Redirect para /kanban |
| Acesso a `/` sem sessão | Redirect para /login (sem double redirect) |
| Acesso a `/` com sessão | Redirect para /kanban |

---

## Fora do escopo deste spec

- Multi-tenancy (empresaId nos modelos) → C2-B
- CRUD de usuários via UI → C2-D
- Recuperação de senha
- OAuth (Google, Microsoft)
- Logs de acesso
