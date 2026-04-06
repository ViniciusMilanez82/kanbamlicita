import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toNum(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "toNumber" in (v as object)) {
    return String((v as { toNumber(): number }).toNumber());
  }
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const resultados = await db.resultadoLicitacao.findMany({
    include: {
      licitacao: {
        select: {
          uf: true,
          modalidade: true,
          orgao: true,
          titulo: true,
        },
      },
      empresaVencedora: {
        select: { nome: true },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  const headers = [
    "Resultado",
    "Valor Vencedor",
    "Nossa Proposta",
    "Diferenca %",
    "Motivo Derrota",
    "UF",
    "Modalidade",
    "Concorrente",
    "Data",
  ];

  const rows = resultados.map((r) => [
    escapeCsv(r.resultado),
    toNum(r.valorVencedor),
    toNum(r.valorNossaProposta),
    r.diferencaPercentual != null ? String(r.diferencaPercentual) : "",
    escapeCsv(r.motivoDerrota),
    escapeCsv(r.licitacao.uf),
    escapeCsv(r.licitacao.modalidade),
    escapeCsv(r.empresaVencedora?.nome ?? r.nomeVencedorExterno),
    formatDate(r.criadoEm),
  ]);

  const bom = "\uFEFF";
  const csv =
    bom +
    headers.join(",") +
    "\n" +
    rows.map((r) => r.join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inteligencia-competitiva.csv"`,
    },
  });
}
