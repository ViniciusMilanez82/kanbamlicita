# SP-9: Captação Histórico — Design Spec

## Objetivo

Exibir o histórico de execuções de captação por fonte dentro da aba Sistema de Configurações, permitindo ao administrador monitorar quando cada fonte foi processada e os resultados.

## Contexto

`CaptacaoExecucao` e `CaptacaoPayload` já existem no banco. Atualmente não há nenhuma interface para visualizar esses dados.

## Arquitetura

### Localização na UI

Em `SistemaTab.tsx`, na seção de Fontes, cada fonte ganha um botão "Histórico" (ícone `Clock` do lucide-react) ao lado dos controles existentes.

### Fluxo de dados

```
SistemaTab (fontes list)
  → click "Histórico" na fonte X
  → fetch GET /api/admin/fontes/[id]/execucoes
  → expande inline abaixo da linha da fonte
  → tabela com as últimas 20 execuções
```

### API nova

**`GET /api/admin/fontes/[id]/execucoes`**

- Auth: session obrigatória, role `admin`
- Query: `CaptacaoExecucao` where `fonteId = id` (campo Prisma: `fonteId`), order by `iniciadoEm DESC`, limit 20
- Retorno:

```ts
{
  execucoes: {
    id: string
    status: string
    iniciadoEm: string   // ISO
    finalizadoEm: string | null
    totalLidos: number
    totalNovos: number
    totalAtualizados: number
    totalDescartadosDuplicidade: number
    totalErros: number
    logResumo: string | null   // campo logResumo (@map("log_resumo")) do schema
  }[]
}
```

### Componente inline de histórico

Quando expandido, renderizar abaixo da linha da fonte:

**Tabela de execuções** (text-xs, border-slate-200):

| Data | Status | Duração | Lidos | Novos | Atualizados | Erros |
|------|--------|---------|-------|-------|-------------|-------|
| DD/MM/AAAA HH:mm | badge | Xm Ys | N | N | N | N |

**Badges de status:**
- `concluido` = verde
- `rodando` = azul (pulsante se possível) — valor padrão no schema (`@default("rodando")`)
- `erro` = vermelho (com tooltip do `logResumo`)
- outros = cinza

**Duração:** calculada como `finalizadoEm - iniciadoEm` (se ambos presentes), senão "—"

**Empty state:** "Nenhuma execução registrada para esta fonte."

**Loading state:** skeleton de 3 linhas enquanto fetch

### Estado no SistemaTab

```ts
// Map de fonteId → estado do histórico
type HistoricoState = {
  [fonteId: string]: {
    aberto: boolean
    loading: boolean
    execucoes: ExecucaoItem[] | null
    erro: string | null
  }
}
```

Click no botão Histórico:
- Se fechado → abre, faz fetch se `execucoes === null`
- Se aberto → fecha (toggle)

### Testes

- `GET /api/admin/fontes/[id]/execucoes` retorna lista ordenada por data DESC
- Usuário não-admin recebe 403
- Fonte sem execuções retorna array vazio
- Badge de status aplica cor correta

## Fora do escopo

- Detalhes de `CaptacaoPayload` individuais (só stats agregadas por execução)
- Paginação (limit 20 é suficiente)
- Reprocessar payloads
- Triggering manual de captação pela UI
