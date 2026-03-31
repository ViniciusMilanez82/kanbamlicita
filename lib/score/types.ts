export type NivelAnalise = "alta" | "media" | "baixa" | "nenhuma";

export type AnaliseData = {
  aderenciaDiretaExiste?: boolean | null;
  aderenciaDiretaNivel?: NivelAnalise | null;
  aderenciaAplicacaoExiste?: boolean | null;
  aderenciaAplicacaoNivel?: NivelAnalise | null;
  contextoOcultoExiste?: boolean | null;
  contextoOcultoNivel?: NivelAnalise | null;
  oportunidadeOcultaExiste?: boolean | null;
  oportunidadeOcultaForca?: NivelAnalise | null;
  oportunidadeOcultaResumo?: string | null;
  oportunidadeNoObjeto?: boolean;
  oportunidadeNoTr?: boolean;
  oportunidadeNosLotes?: boolean;
  oportunidadeNosItens?: boolean;
  oportunidadeNaPlanilha?: boolean;
  oportunidadeNoMemorial?: boolean;
  oportunidadeEmAnexoTecnico?: boolean;
};

export type AnaliseIaResultado = {
  aderenciaDiretaExiste: boolean;
  aderenciaDiretaNivel: NivelAnalise;
  aderenciaDiretaJustificativa?: string;
  aderenciaAplicacaoExiste: boolean;
  aderenciaAplicacaoNivel: NivelAnalise;
  aderenciaAplicacaoJustificativa?: string;
  contextoOcultoExiste: boolean;
  contextoOcultoNivel: NivelAnalise;
  contextoOcultoJustificativa?: string;
  oportunidadeOcultaExiste: boolean;
  oportunidadeOcultaForca: NivelAnalise;
  oportunidadeOcultaResumo?: string;
  oportunidadeNoObjeto: boolean;
  oportunidadeNoTr: boolean;
  oportunidadeNosLotes: boolean;
  oportunidadeNosItens: boolean;
  oportunidadeNaPlanilha: boolean;
  oportunidadeNoMemorial: boolean;
  oportunidadeEmAnexoTecnico: boolean;
};

export type ScoreComponentes = {
  scoreAderenciaDireta: number;
  scoreAderenciaAplicacao: number;
  scoreContextoOculto: number;
  scoreModeloComercial: number;
  scorePotencialEconomico: number;
  scoreQualidadeEvidencia: number;
};

export type ScoreResultado = {
  scoreFinal: number;
  classificacao: string;
  componentes: ScoreComponentes;
  justificativaResumida: string;
};

export const PESOS_COMPONENTES = {
  scoreAderenciaDireta: 0.15,
  scoreAderenciaAplicacao: 0.25,
  scoreContextoOculto: 0.20,
  scoreModeloComercial: 0.15,
  scorePotencialEconomico: 0.15,
  scoreQualidadeEvidencia: 0.10,
} as const;

export const NIVEL_VALORES: Record<string, number> = {
  alta: 100,
  media: 60,
  baixa: 30,
  nenhuma: 0,
};

export const CLASSIFICACAO_FAIXAS = [
  { min: 85, label: "A+" },
  { min: 70, label: "A" },
  { min: 55, label: "B" },
  { min: 40, label: "C" },
  { min: 0, label: "D" },
] as const;
