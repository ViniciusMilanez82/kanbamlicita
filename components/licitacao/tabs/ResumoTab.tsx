import { formatCurrency, formatDate } from '@/lib/format'
import type { LicitacaoDetalhe } from '@/types/licitacao-detalhe'

type Props = { licitacao: LicitacaoDetalhe }

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-900">{value ?? '—'}</p>
    </div>
  )
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${
        value
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-slate-50 text-slate-400 border-slate-200'
      }`}
    >
      {value ? '✓' : '○'} {label}
    </span>
  )
}

const NATUREZA_LABELS: Array<[keyof LicitacaoDetalhe, string]> = [
  ['envolveLocacao', 'Locação'],
  ['envolveFornecimento', 'Fornecimento'],
  ['envolveServico', 'Serviço'],
  ['envolveObra', 'Obra'],
  ['envolveInstalacao', 'Instalação'],
  ['envolveMontagem', 'Montagem'],
  ['envolveDesmontagem', 'Desmontagem'],
  ['envolveTransporte', 'Transporte'],
  ['envolveMobilizacao', 'Mobilização'],
  ['envolveDesmobilizacao', 'Desmobilização'],
  ['envolveManutencao', 'Manutenção'],
]

const ESTRUTURAL_LABELS: Array<[keyof LicitacaoDetalhe, string]> = [
  ['possuiLotes', 'Lotes'],
  ['possuiItens', 'Itens'],
  ['possuiPlanilhaOrcamentaria', 'Planilha orçamentária'],
  ['possuiQuantitativos', 'Quantitativos'],
  ['possuiPrecosUnitarios', 'Preços unitários'],
]

export function ResumoTab({ licitacao }: Props) {
  return (
    <div className="p-6 space-y-6">
      {/* Grid 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados principais */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Dados Principais
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Órgão" value={licitacao.orgao} />
            <Field label="Nº Licitação" value={licitacao.numeroLicitacao} />
            <Field label="Nº Processo" value={licitacao.numeroProcesso} />
            <Field label="Modalidade" value={licitacao.modalidade} />
            <Field label="Tipo Disputa" value={licitacao.tipoDisputa} />
            <Field label="Critério Julgamento" value={licitacao.criterioJulgamento} />
            <Field label="Segmento" value={licitacao.segmento} />
            <Field label="Fonte" value={licitacao.fonteCaptacao} />
            <Field label="Publicação" value={formatDate(licitacao.dataPublicacao)} />
            <Field label="Sessão" value={formatDate(licitacao.dataSessao)} />
            <Field label="UF" value={licitacao.uf} />
            <Field label="Município" value={licitacao.municipio} />
            <Field label="Região" value={licitacao.regiao} />
            <Field
              label="Valor Global"
              value={formatCurrency(licitacao.valorGlobalEstimado)}
            />
            <Field label="Status Pipeline" value={licitacao.statusPipeline} />
          </div>
          {/* Flags estruturais */}
          <div>
            <p className="text-xs text-slate-400 mb-1">Estrutura</p>
            <div className="flex flex-wrap gap-1.5">
              {ESTRUTURAL_LABELS.map(([key, label]) => (
                <BoolBadge key={key} value={licitacao[key] as boolean} label={label} />
              ))}
            </div>
          </div>
        </div>

        {/* Natureza do objeto */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Natureza do Objeto
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {NATUREZA_LABELS.map(([key, label]) => (
              <BoolBadge key={key} value={licitacao[key] as boolean} label={label} />
            ))}
          </div>
        </div>
      </div>

      {/* Objeto resumido */}
      {licitacao.objetoResumido && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Objeto
          </h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{licitacao.objetoResumido}</p>
        </div>
      )}

      {/* Resumo natureza */}
      {licitacao.resumoNatureza && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Resumo da Natureza
          </h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{licitacao.resumoNatureza}</p>
        </div>
      )}
    </div>
  )
}
