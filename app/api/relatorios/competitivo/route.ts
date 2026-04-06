import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

const MOTIVO_LABELS: Record<string, string> = {
  preco: "Preco",
  tecnica: "Tecnica",
  habilitacao: "Habilitacao",
  prazo: "Prazo",
  desistencia: "Desistencia",
};

function motivoLabel(raw: string | null | undefined): string {
  if (!raw) return "Nao informado";
  return MOTIVO_LABELS[raw.toLowerCase()] ?? raw;
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && "toNumber" in (v as object)) {
    return (v as { toNumber(): number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildDateFilter(periodo: string): Date | undefined {
  if (periodo === "todos") return undefined;
  const mesesMap: Record<string, number> = { "3m": 3, "6m": 6, "12m": 12 };
  const meses = mesesMap[periodo];
  if (!meses) return undefined;
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d;
}

function formatMes(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type ResultadoRow = {
  id: string;
  resultado: string;
  valorVencedor: unknown;
  valorNossaProposta: unknown;
  diferencaPercentual: number | null;
  criterioJulgamento: string | null;
  motivoDerrota: string | null;
  criadoEm: Date;
  empresaVencedoraId: string | null;
  licitacao: { uf: string | null; modalidade: string | null };
  empresaVencedora: { id: string; nome: string } | null;
  nomeVencedorExterno: string | null;
};

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get("periodo") ?? "todos";
  const uf = searchParams.get("uf") ?? "";
  const segmento = searchParams.get("segmento") ?? "";

  const dataMinima = buildDateFilter(periodo);

  // Build where clause
  const where: Record<string, unknown> = {};
  if (dataMinima) where.criadoEm = { gte: dataMinima };

  const licitacaoWhere: Record<string, unknown> = {};
  if (uf) licitacaoWhere.uf = uf;
  if (segmento) licitacaoWhere.modalidade = segmento;
  if (Object.keys(licitacaoWhere).length > 0) {
    where.licitacao = licitacaoWhere;
  }

  const resultados: ResultadoRow[] = await db.resultadoLicitacao.findMany({
    where,
    include: {
      licitacao: { select: { uf: true, modalidade: true } },
      empresaVencedora: { select: { id: true, nome: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  // ---------- 1. Resumo geral ----------
  const ganhas = resultados.filter((r) => r.resultado === "ganhou");
  const perdidas = resultados.filter((r) => r.resultado === "perdeu");
  const desistidas = resultados.filter((r) => r.resultado === "desistiu");

  const somaValorGanho = ganhas.reduce(
    (acc, r) => acc + toNum(r.valorNossaProposta),
    0,
  );
  const somaValorPerdido = perdidas.reduce(
    (acc, r) => acc + toNum(r.valorNossaProposta),
    0,
  );

  const todosValoresNossos = resultados
    .map((r) => toNum(r.valorNossaProposta))
    .filter((v) => v > 0);
  const ticketMedioNosso =
    todosValoresNossos.length > 0
      ? todosValoresNossos.reduce((a, b) => a + b, 0) /
        todosValoresNossos.length
      : 0;

  const todosValoresVencedor = resultados
    .map((r) => toNum(r.valorVencedor))
    .filter((v) => v > 0);
  const ticketMedioVencedor =
    todosValoresVencedor.length > 0
      ? todosValoresVencedor.reduce((a, b) => a + b, 0) /
        todosValoresVencedor.length
      : 0;

  const difPercentuais = perdidas
    .map((r) => r.diferencaPercentual)
    .filter((v): v is number => v != null);
  const diferencaMediaPercentual =
    difPercentuais.length > 0
      ? difPercentuais.reduce((a, b) => a + b, 0) / difPercentuais.length
      : 0;

  const totalDecisivos = ganhas.length + perdidas.length;
  const winRate = totalDecisivos > 0 ? (ganhas.length / totalDecisivos) * 100 : 0;

  const resumo = {
    totalLicitacoes: resultados.length,
    ganhas: ganhas.length,
    perdidas: perdidas.length,
    desistidas: desistidas.length,
    winRate: Math.round(winRate * 100) / 100,
    valorTotalGanho: Math.round(somaValorGanho * 100) / 100,
    valorTotalPerdido: Math.round(somaValorPerdido * 100) / 100,
    ticketMedioNosso: Math.round(ticketMedioNosso * 100) / 100,
    ticketMedioVencedor: Math.round(ticketMedioVencedor * 100) / 100,
    diferencaMediaPercentual: Math.round(diferencaMediaPercentual * 100) / 100,
  };

  // ---------- 2. Tendencia mensal (ultimos 12 meses) ----------
  const agora = new Date();
  const dozeAtras = new Date();
  dozeAtras.setMonth(dozeAtras.getMonth() - 12);

  const recenteParaTendencia = resultados.filter(
    (r) => r.criadoEm >= dozeAtras,
  );

  const porMesMap = new Map<
    string,
    { ganhas: number; perdidas: number; valores: number[] }
  >();

  // Pre-fill 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const key = formatMes(d);
    porMesMap.set(key, { ganhas: 0, perdidas: 0, valores: [] });
  }

  for (const r of recenteParaTendencia) {
    const key = formatMes(r.criadoEm);
    const entry = porMesMap.get(key);
    if (!entry) continue;
    if (r.resultado === "ganhou") entry.ganhas++;
    if (r.resultado === "perdeu") entry.perdidas++;
    const v = toNum(r.valorNossaProposta);
    if (v > 0) entry.valores.push(v);
  }

  const tendenciaMensal = Array.from(porMesMap.entries()).map(
    ([mes, data]) => {
      const total = data.ganhas + data.perdidas;
      return {
        mes,
        ganhas: data.ganhas,
        perdidas: data.perdidas,
        winRate:
          total > 0
            ? Math.round((data.ganhas / total) * 100 * 100) / 100
            : 0,
        valorMedio:
          data.valores.length > 0
            ? Math.round(
                (data.valores.reduce((a, b) => a + b, 0) /
                  data.valores.length) *
                  100,
              ) / 100
            : 0,
      };
    },
  );

  // ---------- 3. Win rate por UF ----------
  const ufMap = new Map<string, { total: number; ganhas: number }>();
  for (const r of resultados) {
    const key = r.licitacao.uf ?? "N/A";
    const entry = ufMap.get(key) ?? { total: 0, ganhas: 0 };
    entry.total++;
    if (r.resultado === "ganhou") entry.ganhas++;
    ufMap.set(key, entry);
  }
  const porUf = Array.from(ufMap.entries())
    .map(([uf, data]) => ({
      uf,
      total: data.total,
      ganhas: data.ganhas,
      winRate:
        data.total > 0
          ? Math.round((data.ganhas / data.total) * 100 * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // ---------- 4. Win rate por modalidade ----------
  const modMap = new Map<string, { total: number; ganhas: number }>();
  for (const r of resultados) {
    const key = r.licitacao.modalidade ?? "Nao informada";
    const entry = modMap.get(key) ?? { total: 0, ganhas: 0 };
    entry.total++;
    if (r.resultado === "ganhou") entry.ganhas++;
    modMap.set(key, entry);
  }
  const porModalidade = Array.from(modMap.entries())
    .map(([modalidade, data]) => ({
      modalidade,
      total: data.total,
      ganhas: data.ganhas,
      winRate:
        data.total > 0
          ? Math.round((data.ganhas / data.total) * 100 * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // ---------- 5. Ranking de concorrentes ----------
  const concMap = new Map<
    string,
    {
      id: string | null;
      nome: string;
      vezesVenceu: number;
      valoresVencedor: number[];
      motivos: string[];
    }
  >();

  for (const r of perdidas) {
    const nome =
      r.empresaVencedora?.nome ?? r.nomeVencedorExterno ?? "Desconhecido";
    const concId = r.empresaVencedora?.id ?? nome;
    const entry = concMap.get(concId) ?? {
      id: r.empresaVencedora?.id ?? null,
      nome,
      vezesVenceu: 0,
      valoresVencedor: [],
      motivos: [],
    };
    entry.vezesVenceu++;
    const v = toNum(r.valorVencedor);
    if (v > 0) entry.valoresVencedor.push(v);
    if (r.motivoDerrota) entry.motivos.push(r.motivoDerrota);
    concMap.set(concId, entry);
  }

  const rankingConcorrentes = Array.from(concMap.values())
    .map((c) => {
      // Find most common motivo
      const freq = new Map<string, number>();
      for (const m of c.motivos) {
        freq.set(m, (freq.get(m) ?? 0) + 1);
      }
      let motivoMaisComum: string | null = null;
      let maxCount = 0;
      freq.forEach((count, motivo) => {
        if (count > maxCount) {
          maxCount = count;
          motivoMaisComum = motivoLabel(motivo);
        }
      });

      return {
        id: c.id,
        nome: c.nome,
        vezesVenceu: c.vezesVenceu,
        valorMedioVencedor:
          c.valoresVencedor.length > 0
            ? Math.round(
                (c.valoresVencedor.reduce((a, b) => a + b, 0) /
                  c.valoresVencedor.length) *
                  100,
              ) / 100
            : 0,
        motivoMaisComum,
      };
    })
    .sort((a, b) => b.vezesVenceu - a.vezesVenceu);

  // ---------- 6. Analise de derrotas ----------
  const derrotaMap = new Map<
    string,
    { count: number; valores: number[] }
  >();
  for (const r of perdidas) {
    const motivo = motivoLabel(r.motivoDerrota);
    const entry = derrotaMap.get(motivo) ?? { count: 0, valores: [] };
    entry.count++;
    const v = toNum(r.valorNossaProposta);
    if (v > 0) entry.valores.push(v);
    derrotaMap.set(motivo, entry);
  }

  const totalDerrotas = perdidas.length || 1; // avoid div by zero
  const analiseDerrota = Array.from(derrotaMap.entries())
    .map(([motivo, data]) => ({
      motivo,
      count: data.count,
      percentual:
        Math.round((data.count / totalDerrotas) * 100 * 100) / 100,
      valorMedioPerdido:
        data.valores.length > 0
          ? Math.round(
              (data.valores.reduce((a, b) => a + b, 0) /
                data.valores.length) *
                100,
            ) / 100
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ---------- 7. Por criterio de julgamento ----------
  const critMap = new Map<string, { total: number; ganhas: number }>();
  for (const r of resultados) {
    const key = r.criterioJulgamento ?? "Nao informado";
    const entry = critMap.get(key) ?? { total: 0, ganhas: 0 };
    entry.total++;
    if (r.resultado === "ganhou") entry.ganhas++;
    critMap.set(key, entry);
  }
  const porCriterio = Array.from(critMap.entries())
    .map(([criterio, data]) => ({
      criterio,
      total: data.total,
      ganhas: data.ganhas,
      winRate:
        data.total > 0
          ? Math.round((data.ganhas / data.total) * 100 * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    resumo,
    tendenciaMensal,
    porUf,
    porModalidade,
    rankingConcorrentes,
    analiseDerrota,
    porCriterio,
  });
}
