export type PncpPreferenciasSalvas = {
  dataInicial?: string;
  dataFinal?: string;
  ufs?: string[];
  palavrasChave?: string[];
  tamanhoPagina?: number;
};

export type PncpOrgaoEntidade = {
  cnpj?: string;
  razaoSocial?: string;
  poderId?: string;
  esferaId?: string;
};

export type PncpUnidadeOrgao = {
  ufSigla?: string;
  ufNome?: string;
  municipioNome?: string;
  nomeUnidade?: string;
  codigoIbge?: string;
  codigoUnidade?: string;
};

export type PncpAmparoLegal = {
  codigo?: number;
  nome?: string;
  descricao?: string;
};

/**
 * Schema oficial da API /api/consulta/v1/contratacoes/proposta e
 * /api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{seq} (manual PNCP §6.4).
 */
export type PncpContratacaoOficial = {
  numeroControlePNCP?: string;
  numeroCompra?: string;
  anoCompra?: number;
  sequencialCompra?: number;
  processo?: string;

  tipoInstrumentoConvocatorioCodigo?: number;
  tipoInstrumentoConvocatorioNome?: string;

  modalidadeId?: number;
  modalidadeNome?: string;
  modoDisputaId?: number;
  modoDisputaNome?: string;
  situacaoCompraId?: number;
  situacaoCompraNome?: string;

  objetoCompra?: string;
  informacaoComplementar?: string;
  srp?: boolean;
  justificativaPresencial?: string | null;

  amparoLegal?: PncpAmparoLegal;

  valorTotalEstimado?: number | null;
  valorTotalHomologado?: number | null;

  dataAberturaProposta?: string | null;
  dataEncerramentoProposta?: string | null;
  dataPublicacaoPncp?: string;
  dataInclusao?: string;
  dataAtualizacao?: string;
  dataAtualizacaoGlobal?: string;

  orgaoEntidade?: PncpOrgaoEntidade;
  unidadeOrgao?: PncpUnidadeOrgao;
  orgaoSubRogado?: PncpOrgaoEntidade | null;
  unidadeSubRogada?: PncpUnidadeOrgao | null;

  usuarioNome?: string;
  linkSistemaOrigem?: string | null;
  linkProcessoEletronico?: string | null;

  existeResultado?: boolean;

  /** Schema do search.api.pncp ainda usa estes campos antigos para compat */
  valorGlobal?: number;
  categoriaProcesso?: { id?: number; nome?: string };
  tipoContrato?: { id?: number; nome?: string };
  numeroControlePncpCompra?: string;
  objetoContrato?: string;
};

/** Alias mantido para evitar churn em call-sites antigos. */
export type PncpContratoRaw = PncpContratacaoOficial;

export type PncpSituacao = "oportunidade" | "referencia";

export type PncpContratoListaItem = {
  id: string;
  titulo: string;
  orgao: string;
  objeto: string;
  uf: string;
  municipio: string;
  valorEstimado: number | null;
  valorHomologado: number | null;
  /** @deprecated use valorEstimado/valorHomologado */
  valorGlobal: number | null;
  dataPublicacao: string | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  modalidadeId: number | null;
  modalidadeNome: string;
  modoDisputaNome: string | null;
  situacaoId: number | null;
  situacaoNome: string | null;
  tipoInstrumentoConvocatorioNome: string | null;
  srp: boolean;
  amparoLegalCodigo: number | null;
  amparoLegalNome: string | null;
  processo: string | null;
  numeroCompra: string | null;
  informacaoComplementar: string | null;
  linkSistemaOrigem: string | null;
  urlPncp: string | null;
  /** Heurística mantida para compat — preenchida pela rota */
  tipoDocumento?: string;
  situacao?: PncpSituacao;
  empresaContratada?: string | null;
  cnpjContratada?: string | null;
  /** Objeto oficial (PncpContratacaoOficial) ou objeto do search se enriquecimento falhou */
  raw: PncpContratacaoOficial;
};
