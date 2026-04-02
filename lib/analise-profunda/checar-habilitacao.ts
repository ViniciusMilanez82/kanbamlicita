import { db } from "@/lib/db";

export type ResultadoHabilitacao = {
  ok: boolean;
  exigencias: {
    categoria: string;
    documento: string;
    status: "ok" | "vencido" | "faltando";
    documentoEmpresa: string | null;
    dataValidade: string | null;
  }[];
  resumo: {
    total: number;
    ok: number;
    vencidos: number;
    faltando: number;
  };
};

/**
 * Cruza documentos de habilitação exigidos (da análise profunda)
 * com documentos da empresa cadastrados no sistema.
 */
export async function checarHabilitacao(
  licitacaoId: string
): Promise<ResultadoHabilitacao> {
  // Buscar análise profunda mais recente
  const analise = await db.acaoIa.findFirst({
    where: { licitacaoId, tipo: "analise_profunda", status: "concluido" },
    orderBy: { criadoEm: "desc" },
    select: { respostaJson: true },
  });

  const dados = analise?.respostaJson as Record<string, unknown> | null;
  const habilitacao = dados?.habilitacao as Record<string, string[]> | null;

  if (!habilitacao) {
    return {
      ok: true,
      exigencias: [],
      resumo: { total: 0, ok: 0, vencidos: 0, faltando: 0 },
    };
  }

  // Buscar docs da empresa
  const docsEmpresa = await db.documentoEmpresa.findMany({
    where: { status: { in: ["vigente", "vencendo", "vencido"] } },
    select: {
      tipoDocumento: true,
      nome: true,
      categoria: true,
      status: true,
      dataValidade: true,
    },
  });

  const exigencias: ResultadoHabilitacao["exigencias"] = [];

  const categorias: [string, string[]][] = [
    ["juridica", habilitacao.juridica ?? []],
    ["tecnica", habilitacao.tecnica ?? []],
    ["fiscal", habilitacao.fiscal ?? []],
    ["economica", habilitacao.economica ?? []],
    ["declaracoes", habilitacao.declaracoes ?? []],
  ];

  for (const [categoria, docs] of categorias) {
    for (const docExigido of docs) {
      const docExigidoLower = docExigido.toLowerCase();

      // Buscar match fuzzy nos docs da empresa
      const match = docsEmpresa.find((d) => {
        const nomeDoc = (d.tipoDocumento + " " + d.nome).toLowerCase();
        const palavras = docExigidoLower.split(/\s+/).filter((p) => p.length > 3);
        return palavras.some((p) => nomeDoc.includes(p));
      });

      if (!match) {
        exigencias.push({
          categoria,
          documento: docExigido,
          status: "faltando",
          documentoEmpresa: null,
          dataValidade: null,
        });
      } else if (match.status === "vencido") {
        exigencias.push({
          categoria,
          documento: docExigido,
          status: "vencido",
          documentoEmpresa: match.nome,
          dataValidade: match.dataValidade?.toISOString() ?? null,
        });
      } else {
        exigencias.push({
          categoria,
          documento: docExigido,
          status: "ok",
          documentoEmpresa: match.nome,
          dataValidade: match.dataValidade?.toISOString() ?? null,
        });
      }
    }
  }

  const resumo = {
    total: exigencias.length,
    ok: exigencias.filter((e) => e.status === "ok").length,
    vencidos: exigencias.filter((e) => e.status === "vencido").length,
    faltando: exigencias.filter((e) => e.status === "faltando").length,
  };

  return {
    ok: resumo.vencidos === 0 && resumo.faltando === 0,
    exigencias,
    resumo,
  };
}
