# Configurações — Design Spec

**Data:** 2026-03-26
**Status:** Aprovado

---

## Objetivo

Implementar a página `/configuracoes` com 3 abas: Perfil (todos os usuários), Usuários (admin) e Sistema (admin). Eliminar a necessidade de alterações no código para mudanças operacionais como pesos do score, faixas de classificação, segmentos e listas do ParecerTab.

---

## Arquitetura

### Navegação por abas

A page `/configuracoes` é um Server Component que lê `searchParams.tab` (padrão: `perfil`) e verifica a role do usuário logado via `auth()` do NextAuth.

| Aba | `tab=` | Visível para |
|-----|--------|-------------|
| Perfil | `perfil` | todos |
| Usuários | `usuarios` | admin |
| Sistema | `sistema` | admin |

Usuários não-admin que acessarem `?tab=usuarios` ou `?tab=sistema` são redirecionados para `?tab=perfil` no Server Component — sem exposição client-side.

---

## Model de Dados

### Novo: `ConfiguracaoSistema`

Singleton — sempre 1 registro com `id = 'default'`.

```prisma
model ConfiguracaoSistema {
  id               String   @id @default("default")
  pesosScore       Json     @default("{\"aderenciaDireta\":15,\"aderenciaAplicacao\":25,\"contextoOculto\":20,\"modeloComercial\":15,\"potencialEconomico\":15,\"qualidadeEvidencia\":10}")
  faixasScore      Json     @default("{\"aPlus\":85,\"a\":70,\"b\":55,\"c\":40}")
  segmentos        Json     @default("[]")
  listasParecerTab Json     @default("{}")
  criadoEm         DateTime @default(now()) @map("criado_em")
  atualizadoEm     DateTime @updatedAt @map("atualizado_em")

  @@map("configuracao_sistema")
}
```

**Seed:** O script de seed cria o registro `default` com os valores atualmente hardcoded no sistema.

**`listasParecerTab`** estrutura esperada:
```json
{
  "ondeEstaOportunidade": ["objeto", "tr", "lotes", ...],
  "solucoesMultiteiner": ["containers_adaptados", ...],
  "proximosPassos": ["elaborar_proposta", ...],
  "riscosLimitacoes": ["prazo_curto", ...],
  "evidenciasPrincipais": ["mencao_explicita_no_tr", ...]
}
```

---

## Impacto em Código Existente

### `lib/score/calculator.ts`

A função `calcularScore` passa a aceitar um terceiro parâmetro com os pesos:

```ts
export type ConfigPesos = {
  aderenciaDireta: number
  aderenciaAplicacao: number
  contextoOculto: number
  modeloComercial: number
  potencialEconomico: number
  qualidadeEvidencia: number
}

export function calcularScore(
  analise: AnaliseDetalhe,
  analiseIaResult: AnaliseIaResult | null,
  pesos: ConfigPesos
): ScoreSugestao
```

Valor padrão dos pesos (usado em testes): `{ aderenciaDireta: 15, aderenciaAplicacao: 25, ... }`.

### `app/licitacoes/[id]/page.tsx`

Carrega `ConfiguracaoSistema` via Prisma junto com os dados da licitação e passa `pesos` e `listasParecerTab` como props para `ScoreTab` e `ParecerTab`.

### `components/licitacao/tabs/ScoreTab.tsx`

Recebe `configPesos: ConfigPesos` como prop e passa para `calcularScore`.

### `components/licitacao/tabs/ParecerTab.tsx`

Recebe `listasParecerTab` como prop em vez das constantes hardcoded.

---

## API Routes

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/me` | qualquer | Retorna nome e email do usuário logado |
| PUT | `/api/me` | qualquer | Atualiza nome e/ou senha |
| GET | `/api/admin/usuarios` | admin | Lista todos os usuários |
| POST | `/api/admin/usuarios` | admin | Cria novo usuário |
| PATCH | `/api/admin/usuarios/[id]` | admin | Edita nome/senha/role/ativo |
| GET | `/api/configuracoes/sistema` | admin | Lê singleton ConfiguracaoSistema |
| PUT | `/api/configuracoes/sistema` | admin | Atualiza singleton |
| GET | `/api/admin/fontes` | admin | Lista CaptacaoFonte |
| POST | `/api/admin/fontes` | admin | Cria CaptacaoFonte |
| PATCH | `/api/admin/fontes/[id]` | admin | Edita CaptacaoFonte |

**Verificação de admin:** todas as rotas `/api/admin/*` e `/api/configuracoes/*` retornam 403 se `session.user.role !== 'admin'`.

**Senha:** hasheada com `bcryptjs` (já dependência do projeto via C2A).

---

## Arquivos Novos e Modificados

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Modificar | `prisma/schema.prisma` | Adicionar model `ConfiguracaoSistema` |
| Criar | `prisma/migrations/...` | Migration da nova tabela |
| Modificar | `prisma/seed.ts` | Seed do registro `default` |
| Modificar | `lib/score/calculator.ts` | Aceitar `ConfigPesos` como parâmetro |
| Modificar | `__tests__/lib/score/calculator.test.ts` | Passar pesos nos testes existentes |
| Modificar | `app/licitacoes/[id]/page.tsx` | Carregar config e passar como props |
| Modificar | `components/licitacao/tabs/ScoreTab.tsx` | Receber `configPesos` como prop |
| Modificar | `components/licitacao/tabs/ParecerTab.tsx` | Receber `listasParecerTab` como prop |
| Criar | `app/configuracoes/page.tsx` | Server Component — roteamento de abas + auth |
| Criar | `components/configuracoes/ConfigTabs.tsx` | Barra de navegação de abas |
| Criar | `components/configuracoes/PerfilTab.tsx` | Formulário de perfil |
| Criar | `components/configuracoes/UsuariosTab.tsx` | Gerenciamento de usuários |
| Criar | `components/configuracoes/SistemaTab.tsx` | Configurações do sistema |
| Criar | `app/api/me/route.ts` | GET/PUT perfil |
| Criar | `app/api/admin/usuarios/route.ts` | GET/POST usuários |
| Criar | `app/api/admin/usuarios/[id]/route.ts` | PATCH usuário |
| Criar | `app/api/configuracoes/sistema/route.ts` | GET/PUT sistema |
| Criar | `app/api/admin/fontes/route.ts` | GET/POST fontes |
| Criar | `app/api/admin/fontes/[id]/route.ts` | PATCH fonte |

---

## UI por Aba

### Aba Perfil

- Input nome (texto)
- Input nova senha (password, opcional — em branco = não altera)
- Botão Salvar → `PUT /api/me`
- Feedback de sucesso/erro inline

### Aba Usuários *(admin)*

- Tabela: nome, email, role, status (ativo/inativo), ações
- Botão "Novo usuário" → formulário inline: email, nome, senha, role
- Ações por linha: editar (nome/senha/role), ativar/desativar toggle
- Admin não pode desativar a si mesmo (botão desabilitado na própria linha)

### Aba Sistema *(admin)*

Dividida em 4 subseções:

**Pesos do Score**
- 6 inputs numéricos (0–100) para cada componente
- Exibe soma em tempo real; botão Salvar desabilitado se soma ≠ 100
- Salva via `PUT /api/configuracoes/sistema`

**Faixas de Classificação**
- 4 inputs de limiar (A+, A, B, C)
- Validação: valores devem ser decrescentes
- Salva junto com pesos no mesmo PUT

**Segmentos**
- Lista de tags editável
- Botão "Adicionar" + input texto → adiciona à lista
- Botão "×" em cada tag para remover
- Salva via `PUT /api/configuracoes/sistema`

**Listas do ParecerTab**
- 5 grupos: onde está oportunidade, soluções Multiteiner, próximos passos, riscos, evidências
- Cada grupo: lista de strings com botão "Adicionar" e "×" por item
- Salva via `PUT /api/configuracoes/sistema`

**Fontes de Captação**
- Tabela: nome, tipo, endpoint, último sync, ativo
- Criar nova fonte: formulário inline (nome, tipo, endpointBase)
- Toggle ativo/inativo via `PATCH /api/admin/fontes/[id]`

---

## Padrão Visual

Seguir padrão existente: Tailwind CSS, shadcn/ui, `text-xs`, `border-slate-200`, acento `#1D4ED8`, fundo `bg-slate-50` nos containers. Mesma estrutura de TopBar + conteúdo scrollável usada nas demais páginas.

---

## O que NÃO entra

- Upload de logo ou assets
- Configurações de notificações/email
- Temas visuais
- Histórico de alterações nas configurações
- Permissões granulares (além de user/admin)
- Exclusão permanente de usuários (apenas desativar)
- Exclusão de fontes de captação (apenas desativar)
