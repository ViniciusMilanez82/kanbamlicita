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

export interface LicitacaoDetalhe extends Licitacao {
  card: CardInfo | null;
  movimentacoes: Movimentacao[];
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
