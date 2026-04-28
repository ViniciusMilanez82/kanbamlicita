import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

// GET — dashboard de saúde documental
export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const cnpj = searchParams.get("cnpj");

  const whereBase: Record<string, unknown> = {};
  if (cnpj) whereBase.cnpj = cnpj;

  // Não contar substituídos no score
  const whereAtivos = { ...whereBase, status: { not: "substituido" as const } };

  const [
    total,
    vigentes,
    vencendo,
    vencidos,
    substituidos,
    _porCategoria,
    porNivelAlerta,
    timeline,
  ] = await Promise.all([
    db.documentoEmpresa.count({ where: whereAtivos }),
    db.documentoEmpresa.count({ where: { ...whereBase, status: "vigente" } }),
    db.documentoEmpresa.count({ where: { ...whereBase, status: "vencendo" } }),
    db.documentoEmpresa.count({ where: { ...whereBase, status: "vencido" } }),
    db.documentoEmpresa.count({ where: { ...whereBase, status: "substituido" } }),

    // Por categoria
    db.documentoEmpresa.groupBy({
      by: ["categoria"],
      where: whereAtivos,
      _count: true,
    }),

    // Por nível de alerta
    db.documentoEmpresa.groupBy({
      by: ["nivelAlerta"],
      where: { ...whereAtivos, nivelAlerta: { not: null } },
      _count: true,
    }),

    // Timeline: documentos vencendo nos próximos 90 dias
    db.documentoEmpresa.findMany({
      where: {
        ...whereAtivos,
        dataValidade: {
          not: null,
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        tipoDocumento: true,
        cnpj: true,
        categoria: true,
        dataValidade: true,
        nivelAlerta: true,
        status: true,
      },
      orderBy: { dataValidade: "asc" },
      take: 50,
    }),
  ]);

  // Score de prontidão: % vigentes sobre total ativos
  const scoreProntidao = total > 0 ? Math.round((vigentes / total) * 100) : 100;

  // Processar categorias com contagem por status
  const categoriaStats = await Promise.all(
    (["juridica", "fiscal", "trabalhista", "tecnica", "economica", "complementar"] as const).map(
      async (cat) => {
        const whereCategoria = { ...whereBase, categoria: cat, status: { not: "substituido" as const } };
        const [catTotal, catVigentes, catVencendo, catVencidos] =
          await Promise.all([
            db.documentoEmpresa.count({ where: whereCategoria }),
            db.documentoEmpresa.count({ where: { ...whereBase, categoria: cat, status: "vigente" } }),
            db.documentoEmpresa.count({ where: { ...whereBase, categoria: cat, status: "vencendo" } }),
            db.documentoEmpresa.count({ where: { ...whereBase, categoria: cat, status: "vencido" } }),
          ]);
        return { categoria: cat, total: catTotal, vigentes: catVigentes, vencendo: catVencendo, vencidos: catVencidos };
      }
    )
  );

  // Ações pendentes: vencendo + vencidos
  const acoesPendentes = await db.documentoEmpresa.findMany({
    where: {
      ...whereBase,
      status: { in: ["vencendo", "vencido"] },
    },
    select: {
      id: true,
      tipoDocumento: true,
      cnpj: true,
      dataValidade: true,
      nivelAlerta: true,
      status: true,
    },
    orderBy: { dataValidade: "asc" },
    take: 20,
  });

  // Dias restantes para timeline
  const hoje = new Date();
  const timelineComDias = timeline.map((doc) => ({
    ...doc,
    diasRestantes: doc.dataValidade
      ? Math.ceil(
          (doc.dataValidade.getTime() - hoje.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null,
  }));

  const acoesPendentesComDias = acoesPendentes.map((doc) => ({
    ...doc,
    diasRestantes: doc.dataValidade
      ? Math.ceil(
          (doc.dataValidade.getTime() - hoje.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null,
    acao: doc.status === "vencido" ? "renovar_urgente" : "renovar",
  }));

  return NextResponse.json({
    scoreProntidao,
    totalDocumentos: total,
    porStatus: { vigente: vigentes, vencendo, vencido: vencidos, substituido: substituidos },
    porCategoria: categoriaStats,
    porNivelAlerta: Object.fromEntries(
      porNivelAlerta.map((g) => [g.nivelAlerta ?? "sem_alerta", g._count])
    ),
    timeline: timelineComDias,
    acoesPendentes: acoesPendentesComDias,
  });
}
