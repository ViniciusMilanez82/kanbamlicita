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
};

export type PncpUnidadeOrgao = {
  ufSigla?: string;
  ufNome?: string;
  municipioNome?: string;
  nomeUnidade?: string;
  codigoIbge?: string;
};

export type PncpContratoRaw = {
  numeroControlePNCP?: string;
  numeroControlePncpCompra?: string;
  objetoContrato?: string;
  processo?: string;
  dataPublicacaoPncp?: string;
  valorGlobal?: number;
  orgaoEntidade?: PncpOrgaoEntidade;
  unidadeOrgao?: PncpUnidadeOrgao;
  categoriaProcesso?: { id?: number; nome?: string };
  tipoContrato?: { id?: number; nome?: string };
};

export type PncpContratoListaItem = {
  id: string;
  titulo: string;
  orgao: string;
  objeto: string;
  uf: string;
  municipio: string;
  valorGlobal: number | null;
  dataPublicacao: string | null;
  categoria: string;
  raw: PncpContratoRaw;
};
