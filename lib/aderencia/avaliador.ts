import type { Licitacao, RegraAderencia } from "@/lib/generated/prisma/client";

export type RegraAvaliada = {
  id: string;
  nome: string;
  tipo: string;
  campo: string;
  peso: number | null;
  atendida: boolean;
};

export type ResultadoAderencia = {
  avaliadoEm: string;
  regrasAvaliadas: number;
  regrasAtendidas: RegraAvaliada[];
  regrasVioladas: RegraAvaliada[];
  scorePreliminar: number;
  classificacao: string;
};

/**
 * Extrai o valor de um campo da licitacao para comparacao.
 */
function getValorCampo(licitacao: Licitacao, campo: string): string | number | null {
  switch (campo) {
    case "titulo":
      return licitacao.titulo;
    case "objeto":
      return licitacao.objeto;
    case "modalidade":
      return licitacao.modalidade;
    case "uf":
      return licitacao.uf;
    case "municipio":
      return licitacao.municipio;
    case "orgao":
      return licitacao.orgao;
    case "valorEstimado":
      return licitacao.valorEstimado
        ? Number(licitacao.valorEstimado)
        : null;
    default:
      return null;
  }
}

/**
 * Testa se uma regra e atendida pelo valor do campo da licitacao.
 */
function testarRegra(
  valorCampo: string | number | null,
  operador: string,
  valorRegra: string
): boolean {
  if (valorCampo === null || valorCampo === undefined) return false;

  const campoStr = String(valorCampo).toLowerCase();
  const regraStr = valorRegra.toLowerCase();

  switch (operador) {
    case "igual":
      return campoStr === regraStr;

    case "diferente":
      return campoStr !== regraStr;

    case "contem": {
      // Suporta lista separada por virgula: "SP,RJ,SC"
      const termos = regraStr.split(",").map((t) => t.trim());
      return termos.some((t) => campoStr.includes(t));
    }

    case "nao_contem": {
      const termos = regraStr.split(",").map((t) => t.trim());
      return !termos.some((t) => campoStr.includes(t));
    }

    case "maior":
      return typeof valorCampo === "number" && valorCampo > Number(valorRegra);

    case "menor":
      return typeof valorCampo === "number" && valorCampo < Number(valorRegra);

    case "regex":
      try {
        return new RegExp(valorRegra, "i").test(campoStr);
      } catch {
        return false;
      }

    default:
      return false;
  }
}

/**
 * Avalia uma licitacao contra uma lista de regras de aderencia.
 */
export function avaliarAderencia(
  licitacao: Licitacao,
  regras: RegraAderencia[]
): ResultadoAderencia {
  const regrasAtendidas: RegraAvaliada[] = [];
  const regrasVioladas: RegraAvaliada[] = [];

  for (const regra of regras) {
    if (!regra.ativo) continue;

    const valorCampo = getValorCampo(licitacao, regra.campo);
    const atendida = testarRegra(valorCampo, regra.operador, regra.valor);

    const info: RegraAvaliada = {
      id: regra.id,
      nome: regra.nome,
      tipo: regra.tipo,
      campo: regra.campo,
      peso: regra.peso,
      atendida,
    };

    if (regra.tipo === "exclusao") {
      // Para exclusao: se a regra "bate", e uma violacao (item indesejado)
      if (atendida) {
        regrasVioladas.push(info);
      }
    } else {
      // Para inclusao/condicional: se a regra "bate", e positivo
      if (atendida) {
        regrasAtendidas.push(info);
      }
    }
  }

  const scorePreliminar = calcularScorePreliminar(
    regras,
    regrasAtendidas,
    regrasVioladas
  );
  const classificacao = classificar(scorePreliminar);

  return {
    avaliadoEm: new Date().toISOString(),
    regrasAvaliadas: regras.filter((r) => r.ativo).length,
    regrasAtendidas,
    regrasVioladas,
    scorePreliminar,
    classificacao,
  };
}

/**
 * Calcula score 0-100 baseado nas regras atendidas e violadas.
 */
function calcularScorePreliminar(
  todasRegras: RegraAderencia[],
  atendidas: RegraAvaliada[],
  violadas: RegraAvaliada[]
): number {
  const regrasAtivas = todasRegras.filter((r) => r.ativo);
  if (regrasAtivas.length === 0) return 50; // Score neutro se nao tem regras

  // Soma dos pesos positivos possiveis
  const pesoPositivoTotal = regrasAtivas
    .filter((r) => r.tipo !== "exclusao")
    .reduce((acc, r) => acc + Math.abs(r.peso ?? 10), 0);

  // Pontos ganhos (inclusao atendida)
  const pontosGanhos = atendidas.reduce(
    (acc, r) => acc + Math.abs(r.peso ?? 10),
    0
  );

  // Penalidade por exclusao violada
  const penalidade = violadas.reduce(
    (acc, r) => acc + Math.abs(r.peso ?? 10),
    0
  );

  if (pesoPositivoTotal === 0) {
    // So tem regras de exclusao
    return violadas.length > 0 ? Math.max(0, 50 - penalidade) : 70;
  }

  // Score base: proporcao de inclusoes atendidas
  const scoreBase = (pontosGanhos / pesoPositivoTotal) * 100;

  // Aplica penalidade
  const scoreFinal = Math.max(0, Math.min(100, scoreBase - penalidade));

  return Math.round(scoreFinal);
}

/**
 * Classifica score em faixas.
 */
function classificar(score: number): string {
  if (score >= 85) return "A+";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}
