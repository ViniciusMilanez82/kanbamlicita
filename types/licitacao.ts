export interface Licitacao {
  id: string;
  titulo: string;
  orgao: string | null;
  objeto: string | null;
  modalidade: string | null;
  uf: string | null;
  municipio: string | null;
  valorEstimado: number | null;
  dataPublicacao: string | null;
  dataSessao: string | null;
  linkOrigem: string | null;
  observacoes: string | null;
  dadosExtraidos: Record<string, unknown> | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CardInfo {
  id: string;
  colunaId: string;
  colunaNome: string;
  colunaCor: string;
  ordem: number;
  responsavelId: string | null;
  responsavelNome: string | null;
  urgente: boolean;
  notas: string | null;
}

export interface LicitacaoComCard extends Licitacao {
  card: CardInfo | null;
}

export interface Movimentacao {
  id: string;
  colunaOrigem: string | null;
  colunaDestino: string;
  motivo: string | null;
  movidoPor: string | null;
  criadoEm: string;
}

export interface AcaoIa {
  id: string;
  tipo: string;
  resposta: string | null;
  respostaJson: Record<string, unknown> | null;
  modelo: string | null;
  status: string;
  erro: string | null;
  criadoEm: string;
}

export interface LicitacaoDetalhe extends Licitacao {
  card: CardInfo | null;
  movimentacoes: Movimentacao[];
  acoesIa: AcaoIa[];
}

export interface KanbanColuna {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  tipo: string;
  ativo: boolean;
  acoesPadrao: string[];
  corEtapa: string | null;
  papelResponsavel: string | null;
}

export interface KanbanMetricas {
  total: number;
  porColuna: { colunaId: string; colunaNome: string; cor: string; count: number }[];
  urgentes: number;
  semResponsavel: number;
  captadasHoje: number;
}

export interface Concorrente {
  id: string;
  nome: string;
  cnpj: string | null;
  segmentos: string[];
  porte: string | null;
  uf: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface ResultadoLicitacao {
  id: string;
  licitacaoId: string;
  resultado: string;
  empresaVencedoraId: string | null;
  empresaVencedora: { id: string; nome: string; cnpj: string | null } | null;
  nomeVencedorExterno: string | null;
  valorVencedor: string | null;
  valorNossaProposta: string | null;
  diferencaPercentual: number | null;
  criterioJulgamento: string | null;
  motivoDerrota: string | null;
  motivoDetalhado: string | null;
  licoesAprendidas: string | null;
  registradoPor: { id: string; name: string | null } | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ChecklistEditalItem {
  id: string;
  licitacaoId: string;
  nome: string;
  categoria: string;
  obrigatorio: boolean;
  status: string;
  documentoEmpresaId: string | null;
  documentoEmpresa: {
    id: string;
    nome: string;
    status: string;
    nivelAlerta: string | null;
    dataValidade: string | null;
  } | null;
  observacoes: string | null;
  ordem: number;
}

export interface DecisaoGoNoGo {
  id: string;
  licitacaoId: string;
  decisao: string;
  scoreNoMomento: number | null;
  checklistPronto: boolean;
  valorEstimadoCapturavel: string | null;
  riscosIdentificados: string[] | null;
  justificativa: string | null;
  decididoPor: { id: string; name: string | null } | null;
  criadoEm: string;
}
