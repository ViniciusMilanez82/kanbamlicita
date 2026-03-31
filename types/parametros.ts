// ==================== Enums ====================

export type CategoriaParametro =
  | "segmento"
  | "categoria_produto"
  | "linha_servico"
  | "palavra_chave_positiva"
  | "palavra_chave_negativa"
  | "regra_modalidade"
  | "regra_orgao"
  | "regra_uf"
  | "criterio_descarte"
  | "criterio_urgencia"
  | "gatilho_risco";

export const CATEGORIA_LABELS: Record<CategoriaParametro, string> = {
  segmento: "Segmentos de atuação",
  categoria_produto: "Categorias de produto",
  linha_servico: "Linhas de serviço",
  palavra_chave_positiva: "Palavras-chave positivas",
  palavra_chave_negativa: "Palavras-chave negativas",
  regra_modalidade: "Regras por modalidade",
  regra_orgao: "Regras por órgão",
  regra_uf: "Regras por UF",
  criterio_descarte: "Critérios de descarte",
  criterio_urgencia: "Critérios de urgência",
  gatilho_risco: "Gatilhos de risco",
};

export type TipoCriterio = "objetivo" | "subjetivo";

export type TipoRegra = "inclusao" | "exclusao" | "condicional";

export const TIPO_REGRA_LABELS: Record<TipoRegra, string> = {
  inclusao: "Inclusão",
  exclusao: "Exclusão",
  condicional: "Condicional",
};

export type OperadorRegra =
  | "igual"
  | "diferente"
  | "contem"
  | "nao_contem"
  | "maior"
  | "menor"
  | "regex";

export const OPERADOR_LABELS: Record<OperadorRegra, string> = {
  igual: "é igual a",
  diferente: "é diferente de",
  contem: "contém",
  nao_contem: "não contém",
  maior: "é maior que",
  menor: "é menor que",
  regex: "corresponde a (regex)",
};

// ==================== Entities ====================

export interface ParametroEstrategico {
  id: string;
  categoria: CategoriaParametro;
  chave: string;
  valor: string;
  peso: number | null;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriterioScore {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoCriterio;
  peso: number;
  formulaRef: string | null;
  faixaMin: number | null;
  faixaMax: number | null;
  ativo: boolean;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegraAderencia {
  id: string;
  nome: string;
  tipo: TipoRegra;
  campo: string;
  operador: OperadorRegra;
  valor: string;
  peso: number | null;
  ativo: boolean;
  descricao: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AuditoriaParametro {
  id: string;
  tabela: string;
  registroId: string;
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
  acao: "criacao" | "edicao" | "exclusao";
  alteradoPorId: string;
  alteradoPorNome?: string;
  criadoEm: string;
}

export interface ConfiguracaoScore {
  scoreMinimo: number;
  faixas: {
    A: [number, number];
    B: [number, number];
    C: [number, number];
    D: [number, number];
  };
  recomendacoes: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}
