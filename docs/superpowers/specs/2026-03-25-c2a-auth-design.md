# C2-A — Autenticação (Auth) Design Spec

## Contexto

O KanbanLicita é um sistema multi-tenant onde cada empresa vê apenas seus próprios dados. Antes de implementar a separação de dados por empresa (C2-B), é necessário ter autenticação funcionando: login, sessão e proteção de rotas.

Tenants são criados manualmente por um administrador — não há auto-cadastro. O primeiro admin é criado via script de terminal.

---

## Escopo

Este spec cobre **somente a autenticação (C2-A)**. Multi-tenancy (empresaId em todos os modelos, query scoping) é C2-B e depende deste spec.

---

## Stack

- **Next.js** App Router (versão atual do projeto)
- **NextAuth.js v5** (`next-auth@beta`) com Credentials provider
- **@auth/prisma-adapter** para persistência de sessão (sessions no banco)
- **bcryptjs** para hash de senha
- **Prisma** (já em uso no projeto via `@/lib/db`)

**Estratégia de sessão:** JWT (`strategy: 'jwt'`). Necessário para o Credentials provider funcionar com o Prisma adapter.

---

## Schema — Novos modelos

Adicionar ao `prisma/schema.prisma`:

```prisma
model Usuario {
  id           String   @id @default(uuid())
  email        String   @unique @db.VarChar(255)
  senha        String?  @db.VarChar(255)
  nome         String   @db.VarChar(100)
  role         String   @default("user") @db.VarChar(20)
  ativo        Boolean  @default(true)
  criadoEm     DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  contas  ContaAuth[]
  sessoes SessaoAuth[]

  @@map("usuarios")
}

model ContaAuth {
  id                String  @id @default(uuid())
  usuarioId         String  @map("usuario_id")
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

  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("contas_auth")
}

model SessaoAuth {
  id           String   @id @default(uuid())
  sessionToken String   @unique @map("session_token")
  usuarioId    String   @map("usuario_id")
  expires      DateTime

  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@map("sessoes_auth")
}

model VerificacaoToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verificacao_tokens")
}
```

**Valores canônicos de `role`:** `"user"` | `"admin"`

**Regras:**
- `senha` é nullable para compatibilidade futura com OAuth
- `ativo: false` bloqueia login mesmo com credenciais corretas
- Email é case-sensitive (armazenado como digitado; normalizar para lowercase na camada de autenticação)

---

## Arquivos a criar/modificar

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `prisma/schema.prisma` | Modificar | Adicionar 4 modelos acima |
| `auth.ts` | Criar | Configuração central do NextAuth |
| `middleware.ts` | Criar | Proteção automática de rotas |
| `app/api/auth/[...nextauth]/route.ts` | Criar | Handler HTTP do NextAuth |
| `app/login/page.tsx` | Criar | Tela de login (Server Component wrapper) |
| `app/login/LoginForm.tsx` | Criar | Formulário de login (Client Component) |
| `types/next-auth.d.ts` | Criar | Extensão de tipos da sessão |
| `scripts/seed-admin.ts` | Criar | Script de criação do primeiro admin |

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

        const usuario = await db.usuario.findUnique({ where: { email } })
        if (!usuario?.senha || !usuario.ativo) return null

        const ok = await bcrypt.compare(senha, usuario.senha)
        if (!ok) return null

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
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

---

## `middleware.ts` — Proteção de rotas

```ts
// middleware.ts
export { auth as middleware } from './auth'

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon\\.ico).*)'],
}
```

Qualquer rota não listada no `matcher` de exceções requer sessão válida. Sem sessão → redirect para `/login`.

---

## `app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

---

## Tela de login — `/login`

### Comportamento
- Usuário logado que acessa `/login` é redirecionado para `/kanban`
- Após login bem-sucedido → redirect para `/kanban`
- Credenciais inválidas → mensagem: `"Email ou senha incorretos"`
- Usuário inativo → mesma mensagem (não revelar motivo)
- Sem link de "esqueci a senha" ou "criar conta"

### UI
- Fundo: `bg-slate-900` (consistente com sidebar)
- Card central branco com sombra, `max-w-sm`, centralizado vertical e horizontal
- Logo/nome "KanbanLicita" acima do card
- Campos: Email, Senha
- Botão "Entrar" (azul, full width, desabilitado durante loading)
- Mensagem de erro abaixo do botão (vermelho, `text-sm`)

### Componentes
- `app/login/page.tsx` — Server Component, verifica sessão e redireciona se já logado
- `app/login/LoginForm.tsx` — Client Component com `'use client'`, usa `signIn('credentials', ...)` do next-auth/react

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

---

## Script `scripts/seed-admin.ts`

### Uso
```bash
npx ts-node --project tsconfig.json scripts/seed-admin.ts \
  --email admin@empresa.com \
  --nome "Administrador" \
  --senha "senha_segura"
```

### Comportamento
- Verifica se já existe usuário com esse email (idempotente)
- Hasheia a senha com bcrypt (rounds: 12)
- Cria o usuário com `role: "admin"`
- Imprime confirmação no terminal

---

## Uso da sessão em Server Components

```ts
import { auth } from '@/auth'

export default async function AlgumaPage() {
  const session = await auth()
  // session.user.id, session.user.role
}
```

---

## Testes

| Caso | Resultado esperado |
|---|---|
| Email correto + senha correta + ativo=true | Login bem-sucedido, redirect /kanban |
| Email correto + senha errada | Erro "Email ou senha incorretos" |
| Email correto + senha correta + ativo=false | Erro "Email ou senha incorretos" |
| Acesso a /kanban sem sessão | Redirect para /login |
| Acesso a /login com sessão ativa | Redirect para /kanban |

---

## Fora do escopo deste spec

- Multi-tenancy (empresaId nos modelos) → C2-B
- CRUD de usuários via UI → C2-D
- Recuperação de senha
- OAuth (Google, Microsoft)
- Logs de acesso
