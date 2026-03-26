# SP-6 — Campos Json do ParecerTab

**Data:** 2026-03-26
**Sub-projeto:** SP-6
**Depende de:** SP-5 (concluído)
**Status:** Aprovado

---

## Objetivo

Adicionar os 5 campos Json ao formulário `ParecerTab` que foram intencionalmente excluídos do SP-5:
- `ondeEstaOportunidade`
- `solucoesQueMultiteinerPoderiaOfertar`
- `proximoPasosRecomendado`
- `riscosLimitacoes`
- `evidenciasPrincipais`

Todos são arrays de strings pré-definidas, salvos no modelo `LicitacaoParece` já existente.

---

## Abordagem

Checkboxes com opções pré-definidas para todos os 5 campos — mesmo padrão dos `FALSO_NEGATIVO_MOTIVOS` já implementado no `ScoreTab`. Consistente, rápido de preencher, dados padronizados.

---

## Opções Pré-Definidas

### `ondeEstaOportunidade`
Espelha os booleanos de oportunidade da `AnaliseForm`:
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
```

### `solucoesQueMultiteinerPoderiaOfertar`
Portfólio principal da Multiteiner (documentação seção 21):
```ts
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
```

### `proximoPasosRecomendado`
```ts
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
```

### `riscosLimitacoes`
```ts
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
```

### `evidenciasPrincipais`
```ts
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

---

## Arquivos Afetados

| Ação | Arquivo | O que muda |
|------|---------|------------|
| Modificar | `types/licitacao-detalhe.ts` | Expandir `ParecerDetalhe` com os 5 campos |
| Modificar | `app/licitacoes/[id]/page.tsx` | Serializar os 5 campos Json em `getLicitacao` |
| Modificar | `components/licitacao/tabs/ParecerTab.tsx` | Adicionar 5 blocos de checkboxes + estado + payload |

**Sem mudanças em:**
- `app/api/licitacoes/[id]/parecer/route.ts` — upsert genérico já funciona
- `prisma/schema.prisma` — campos já existem
- Migrações — nada a fazer

---

## Tipos

### `ParecerDetalhe` expandido (`types/licitacao-detalhe.ts`)

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
  // Novos campos SP-6:
  ondeEstaOportunidade: string[]
  solucoesQueMultiteinerPoderiaOfertar: string[]
  proximoPasosRecomendado: string[]
  riscosLimitacoes: string[]
  evidenciasPrincipais: string[]
} | null
```

---

## Serialização (`app/licitacoes/[id]/page.tsx`)

No bloco `parecer: row.parecer ? { ... } : null`, adicionar após `riscoFalsoNegativoSoTitulo`:

```ts
ondeEstaOportunidade: row.parecer.ondeEstaOportunidade as string[],
solucoesQueMultiteinerPoderiaOfertar: row.parecer.solucoesQueMultiteinerPoderiaOfertar as string[],
proximoPasosRecomendado: row.parecer.proximoPasosRecomendado as string[],
riscosLimitacoes: row.parecer.riscosLimitacoes as string[],
evidenciasPrincipais: row.parecer.evidenciasPrincipais as string[],
```

---

## ParecerTab — Novos Blocos

Localização: após o campo "Resumo", antes do botão "Salvar".

### Estado inicial

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

### Função toggle (genérica)

```ts
function toggle(list: string[], setList: (v: string[]) => void, value: string) {
  setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
}
```

### Body do PUT (adicionar ao handleSalvar)

```ts
ondeEstaOportunidade,
solucoesQueMultiteinerPoderiaOfertar: solucoes,
proximoPasosRecomendado: proximosPassos,
riscosLimitacoes: riscos,
evidenciasPrincipais: evidencias,
```

### Renderização (padrão checkboxes)

Cada bloco usa o mesmo padrão grid de checkboxes do ScoreTab (`grid grid-cols-2 gap-2`):

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
```

Repetir o padrão para os outros 4 campos com seus respectivos arrays e setters.

---

## Testes

Não são necessários testes unitários para este SP — os campos são puramente de UI (estado local + PUT ao salvar). A cobertura do fluxo é garantida pela lógica existente do `handleSalvar` já testada indiretamente.

---

## O que NÃO entra

- Novos campos no schema — todos existem
- Novas rotas de API
- Validação obrigatória dos campos Json
- Histórico de versões do parecer
