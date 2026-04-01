import type { AnaliseData, AnaliseIaResultado, ScoreResultado } from "./types";
import { PESOS_COMPONENTES, NIVEL_VALORES, CLASSIFICACAO_FAIXAS } from "./types";

function nivelParaValor(nivel: string | null | undefined): number {
  if (!nivel) return 0;
  return NIVEL_VALORES[nivel] ?? 0;
}

function contarFlagsOportunidade(analise: AnaliseData): number {
  const flags = [
    analise.oportunidadeNoObjeto,
    analise.oportunidadeNoTr,
    analise.oportunidadeNosLotes,
    analise.oportunidadeNosItens,
    analise.oportunidadeNaPlanilha,
    analise.oportunidadeNoMemorial,
    analise.oportunidadeEmAnexoTecnico,
  ];
  return flags.filter(Boolean).length;
}

function classificar(score: number): string {
  for (const faixa of CLASSIFICACAO_FAIXAS) {
    if (score >= faixa.min) return faixa.label;
  }
  return "D";
}

export function calcularScore(
  analise: AnaliseData,
  analiseIa?: AnaliseIaResultado | null,
  valorEstimadoLicitacao?: number | null
): ScoreResultado {
  // Merge: manual tem prioridade, IA como fallback
  const aderenciaDiretaNivel =
    analise.aderenciaDiretaNivel ?? analiseIa?.aderenciaDiretaNivel ?? null;
  const aderenciaAplicacaoNivel =
    analise.aderenciaAplicacaoNivel ?? analiseIa?.aderenciaAplicacaoNivel ?? null;
  const contextoOcultoNivel =
    analise.contextoOcultoNivel ?? analiseIa?.contextoOcultoNivel ?? null;
  const oportunidadeOcultaForca =
    analise.oportunidadeOcultaForca ?? analiseIa?.oportunidadeOcultaForca ?? null;

  // Merge flags: manual OR ia
  const mergedAnalise: AnaliseData = {
    ...analise,
    oportunidadeNoObjeto: analise.oportunidadeNoObjeto || analiseIa?.oportunidadeNoObjeto || false,
    oportunidadeNoTr: analise.oportunidadeNoTr || analiseIa?.oportunidadeNoTr || false,
    oportunidadeNosLotes: analise.oportunidadeNosLotes || analiseIa?.oportunidadeNosLotes || false,
    oportunidadeNosItens: analise.oportunidadeNosItens || analiseIa?.oportunidadeNosItens || false,
    oportunidadeNaPlanilha: analise.oportunidadeNaPlanilha || analiseIa?.oportunidadeNaPlanilha || false,
    oportunidadeNoMemorial: analise.oportunidadeNoMemorial || analiseIa?.oportunidadeNoMemorial || false,
    oportunidadeEmAnexoTecnico: analise.oportunidadeEmAnexoTecnico || analiseIa?.oportunidadeEmAnexoTecnico || false,
  };

  const flagsCount = contarFlagsOportunidade(mergedAnalise);

  const scoreAderenciaDireta = nivelParaValor(aderenciaDiretaNivel);
  const scoreAderenciaAplicacao = nivelParaValor(aderenciaAplicacaoNivel);
  const scoreContextoOculto = nivelParaValor(contextoOcultoNivel);

  const baseModelo = nivelParaValor(oportunidadeOcultaForca);
  const bonusFlags = Math.min(flagsCount * 10, 100);
  const scoreModeloComercial = Math.min(Math.round((baseModelo + bonusFlags) / 2), 100);

  let scorePotencialEconomico = 20;
  if (valorEstimadoLicitacao != null && valorEstimadoLicitacao > 0) {
    if (valorEstimadoLicitacao >= 5_000_000) scorePotencialEconomico = 100;
    else if (valorEstimadoLicitacao >= 1_000_000) scorePotencialEconomico = 90;
    else if (valorEstimadoLicitacao >= 500_000) scorePotencialEconomico = 70;
    else scorePotencialEconomico = 50;
  }

  const scoreQualidadeEvidencia = Math.round((flagsCount / 7) * 100);

  const componentes = {
    scoreAderenciaDireta,
    scoreAderenciaAplicacao,
    scoreContextoOculto,
    scoreModeloComercial,
    scorePotencialEconomico,
    scoreQualidadeEvidencia,
  };

  const scoreFinal = Math.round(
    Object.entries(PESOS_COMPONENTES).reduce((sum, [key, peso]) => {
      return sum + (componentes[key as keyof typeof componentes] ?? 0) * peso;
    }, 0)
  );

  const classificacao = classificar(scoreFinal);

  const labels: Record<string, string> = {
    scoreAderenciaDireta: "Aderência direta",
    scoreAderenciaAplicacao: "Aderência aplicação",
    scoreContextoOculto: "Contexto oculto",
    scoreModeloComercial: "Modelo comercial",
    scorePotencialEconomico: "Potencial econômico",
    scoreQualidadeEvidencia: "Qualidade evidência",
  };

  const justificativaResumida = Object.entries(componentes)
    .map(([key, valor]) => {
      const peso = PESOS_COMPONENTES[key as keyof typeof PESOS_COMPONENTES];
      const contribuicao = Math.round(valor * peso);
      return `${labels[key]} ${valor}/100 (${contribuicao} pts)`;
    })
    .join(", ");

  return {
    scoreFinal,
    classificacao,
    componentes,
    justificativaResumida: `Score ${scoreFinal} (${classificacao}): ${justificativaResumida}`,
  };
}
