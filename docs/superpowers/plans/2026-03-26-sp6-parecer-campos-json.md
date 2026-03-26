# SP-6 — Campos Json do ParecerTab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 checkbox fields (Json arrays) ao formulário `ParecerTab` que foram intencionalmente excluídos do SP-5.

**Architecture:** Três arquivos afetados — expandir o tipo `ParecerDetalhe`, serializar os 5 campos em `page.tsx`, e atualizar `ParecerTab.tsx` com constantes, estado, toggle genérico, payload e renderização. Nenhuma mudança em schema, migrations ou rotas de API.

**Tech Stack:** TypeScript, React (useState), Next.js App Router, Prisma (campos Json já existem no schema)

---

## File Map

| Ação | Arquivo | O que muda |
|------|---------|------------|
| Modificar | `types/licitacao-detalhe.ts` | Adicionar 5 campos `string[]` ao `ParecerDetalhe` |
| Modificar | `app/licitacoes/[id]/page.tsx` | Serializar 5 campos com `as unknown[]` no bloco parecer |
| Modificar | `components/licitacao/tabs/ParecerTab.tsx` | Constantes, estado, toggle, payload, 5 blocos de checkboxes |

---

### Task 1: Expandir `ParecerDetalhe` com os 5 novos campos

**Files:**
- Modify: `types/licitacao-detalhe.ts:40-52`

- [ ] **Step 1: Editar o tipo**

Em `types/licitacao-detalhe.ts`, substituir o bloco `ParecerDetalhe`:

```ts
export type ParecerDetalhe = {
  classificacaoFinal: string
  prioridadeComercial: string
  valeEsforcoComercial: boolean
  recomendacaoFinal: string
  resumo: string | null
  oportunidadeDireta: boolean
  oportunidadeIndireta: boolean
  oportunidadeOcultaItemLoteAnexo: boolean
  oportunidadeInexistente: boolean
  riscoFalsoPositivo: string
  riscoFalsoNegativoSoTitulo: string
  // SP-6:
  ondeEstaOportunidade: string[]
  solucoesQueMultiteinerPoderiaOfertar: string[]
  proximoPasosRecomendado: string[]
  riscosLimitacoes: string[]
  evidenciasPrincipais: string[]
} | null
```

- [ ] **Step 2: Verificar compilação**

```bash
cd C:/Users/vinic/OneDrive/PROJETOS/APPS/kanbamlicita
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros em `types/licitacao-detalhe.ts` (pode haver erros em outros arquivos que usam `ParecerDetalhe` — serão corrigidos nas próximas tasks).

- [ ] **Step 3: Commit**

```bash
git add types/licitacao-detalhe.ts
git commit -m "feat(sp6): expand ParecerDetalhe with 5 json array fields"
```

---

### Task 2: Serializar os 5 campos em `page.tsx`

**Files:**
- Modify: `app/licitacoes/[id]/page.tsx:101`

- [ ] **Step 1: Adicionar serialização no bloco parecer**

Em `app/licitacoes/[id]/page.tsx`, após a linha `riscoFalsoNegativoSoTitulo: row.parecer.riscoFalsoNegativoSoTitulo,` (linha 101), adicionar:

```ts
          ondeEstaOportunidade: row.parecer.ondeEstaOportunidade as unknown[],
          solucoesQueMultiteinerPoderiaOfertar: row.parecer.solucoesQueMultiteinerPoderiaOfertar as unknown[],
          proximoPasosRecomendado: row.parecer.proximoPasosRecomendado as unknown[],
          riscosLimitacoes: row.parecer.riscosLimitacoes as unknown[],
          evidenciasPrincipais: row.parecer.evidenciasPrincipais as unknown[],
```

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros nos arquivos modificados até agora.

- [ ] **Step 3: Commit**

```bash
git add "app/licitacoes/[id]/page.tsx"
git commit -m "feat(sp6): serialize 5 json fields in parecer serialization block"
```

---

### Task 3: Atualizar `ParecerTab.tsx` com checkboxes para os 5 campos

**Files:**
- Modify: `components/licitacao/tabs/ParecerTab.tsx`

- [ ] **Step 1: Adicionar constantes no topo do arquivo**

Após os imports (antes do `type Props`), adicionar:

```ts
const ONDE_ESTA_OPORTUNIDADE = [
  'objeto',
  'tr',
  'lotes',
  'itens',
  'planilha',
  'memorial',
  'anexo_tecnico',
]

const SOLUCOES_MULTITEINER = [
  'containers_adaptados',
  'modulos_habitacionais',
  'modulos_administrativos',
  'modulos_sanitarios',
  'guaritas',
  'almoxarifados',
  'refeitorios',
  'alojamentos',
  'escritorios_de_obra',
  'bases_operacionais',
  'estruturas_temporarias_modulares',
]

const PROXIMOS_PASSOS = [
  'elaborar_proposta',
  'solicitar_esclarecimentos',
  'visitar_local',
  'contatar_gestor',
  'acompanhar_publicacao',
  'montar_consorcio',
  'aguardar_nova_edicao',
  'solicitar_visita_tecnica',
  'preparar_amostra',
  'cadastrar_fornecedor',
]

const RISCOS_LIMITACOES = [
  'prazo_curto',
  'exigencia_tecnica_restritiva',
  'capacidade_limitada',
  'concorrencia_acirrada',
  'preco_referencia_baixo',
  'localizacao_desfavoravel',
  'habilitacao_complexa',
  'historico_direcionamento',
  'escopo_indefinido',
  'dependencia_de_parceiro',
]

const EVIDENCIAS_PRINCIPAIS = [
  'mencao_explicita_no_tr',
  'mencao_em_item_ou_lote',
  'descricao_tecnica_compativel',
  'quantitativo_compativel',
  'aderencia_ao_portfolio',
  'historico_de_relacionamento',
  'preco_referencia_compativel',
  'concorrente_fraco_identificado',
]
```

- [ ] **Step 2: Adicionar estado para os 5 campos**

Dentro de `ParecerTab`, após o `useState(parecer?.resumo ?? '')`, adicionar:

```ts
  const [ondeEstaOportunidade, setOndeEstaOportunidade] = useState<string[]>(
    (parecer?.ondeEstaOportunidade as string[]) ?? []
  )
  const [solucoes, setSolucoes] = useState<string[]>(
    (parecer?.solucoesQueMultiteinerPoderiaOfertar as string[]) ?? []
  )
  const [proximosPassos, setProximosPassos] = useState<string[]>(
    (parecer?.proximoPasosRecomendado as string[]) ?? []
  )
  const [riscos, setRiscos] = useState<string[]>(
    (parecer?.riscosLimitacoes as string[]) ?? []
  )
  const [evidencias, setEvidencias] = useState<string[]>(
    (parecer?.evidenciasPrincipais as string[]) ?? []
  )
```

- [ ] **Step 3: Adicionar função toggle genérica**

Após os `useState`s e antes de `handleOportunidade`, adicionar:

```ts
  function toggle(
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ): void {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }
```

- [ ] **Step 4: Adicionar 5 campos ao body do PUT em `handleSalvar`**

No `JSON.stringify({ ... })` dentro de `handleSalvar`, após `riscoFalsoNegativoSoTitulo: riscoFalsoNegativo,`, adicionar:

```ts
          ondeEstaOportunidade,
          solucoesQueMultiteinerPoderiaOfertar: solucoes,
          proximoPasosRecomendado: proximosPassos,
          riscosLimitacoes: riscos,
          evidenciasPrincipais: evidencias,
```

- [ ] **Step 5: Adicionar 5 blocos de checkboxes no JSX**

Após o `<label>` do Resumo (textarea) e antes do `<div className="flex items-center gap-4">` do botão Salvar, inserir:

```tsx
      {/* Onde está a oportunidade */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Onde está a oportunidade
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {ONDE_ESTA_OPORTUNIDADE.map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ondeEstaOportunidade.includes(v)}
                onChange={() => toggle(ondeEstaOportunidade, setOndeEstaOportunidade, v)}
              />
              {v.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </section>

      {/* Soluções que a Multiteiner poderia ofertar */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Soluções Multiteiner aplicáveis
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {SOLUCOES_MULTITEINER.map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={solucoes.includes(v)}
                onChange={() => toggle(solucoes, setSolucoes, v)}
              />
              {v.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </section>

      {/* Próximos passos recomendados */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Próximos passos recomendados
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PROXIMOS_PASSOS.map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={proximosPassos.includes(v)}
                onChange={() => toggle(proximosPassos, setProximosPassos, v)}
              />
              {v.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </section>

      {/* Riscos e limitações */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Riscos e limitações
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {RISCOS_LIMITACOES.map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={riscos.includes(v)}
                onChange={() => toggle(riscos, setRiscos, v)}
              />
              {v.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </section>

      {/* Evidências principais */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Evidências principais
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {EVIDENCIAS_PRINCIPAIS.map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={evidencias.includes(v)}
                onChange={() => toggle(evidencias, setEvidencias, v)}
              />
              {v.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </section>
```

- [ ] **Step 6: Verificar compilação final**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: zero erros de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add components/licitacao/tabs/ParecerTab.tsx
git commit -m "feat(sp6): add 5 json checkbox fields to ParecerTab"
```
