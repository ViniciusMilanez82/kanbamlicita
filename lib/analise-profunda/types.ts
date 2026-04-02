/**
 * Estrutura do Resumo de Licitação — baseado no formato XLS da Multiteiner.
 */
export type ResumoLicitacaoData = {
  // Identificação
  empresa: string;
  cliente: string;
  modalidade: string;
  portal: string;
  numero: string;

  // Datas
  dataPublicacao: string | null;
  dataSessao: string | null;
  dataLimiteEsclarecimentos: string | null;

  // Tipo e objeto
  tipo: string; // Locação, Venda, Serviço, etc.
  objeto: string;
  objetoResumido: string;

  // Condições
  prazoEntrega: string | null;
  localEntrega: string | null;
  periodoLocacao: string | null;
  esclarecimentos: string | null;
  criterioJulgamento: string | null;
  intervaloLances: string | null;
  modoDisputa: string | null;
  validadeProposta: string | null;
  valorEstimado: string | null;

  // Requisitos técnicos
  interligacaoExterna: string | null;
  visitaTecnica: string | null;
  projeto: string | null;
  artCrea: string | null;
  dfpPlanilha: string | null;
  ppu: string | null;
  renovacao: string | null;

  // Itens
  itens: {
    numero: string;
    descricao: string;
    quantidade: string | null;
    valorUnitario: string | null;
    valorTotal: string | null;
  }[];

  // Documentos de habilitação
  habilitacao: {
    juridica: string[];
    tecnica: string[];
    fiscal: string[];
    economica: string[];
    declaracoes: string[];
  };

  // Observações
  observacao: string | null;
  riscos: string[];
  oportunidades: string[];

  // Metadados da análise
  analisadoEm: string;
  modelo: string;
  documentosAnalisados: string[];
};

/** Status da análise profunda */
export type StatusAnaliseProfunda =
  | "pendente"
  | "buscando_detalhes"
  | "baixando_documentos"
  | "extraindo_texto"
  | "analisando_ia"
  | "concluido"
  | "erro";
