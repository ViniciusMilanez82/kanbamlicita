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

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const licitacoes = await db.licitacao.findMany({
    include: {
      card: {
        include: {
          coluna: { select: { nome: true } },
          responsavel: { select: { name: true } },
        },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  const headers = [
    "Numero",
    "Titulo",
    "Orgao",
    "UF",
    "Municipio",
    "Modalidade",
    "Valor Estimado",
    "Data Publicacao",
    "Data Sessao",
    "Coluna Kanban",
    "Responsavel",
    "Urgente",
    "Score Preliminar",
    "Classificacao",
    "Criado Em",
  ];

  const rows = licitacoes.map((l) => [
    String(l.numero),
    escapeCsv(l.titulo),
    escapeCsv(l.orgao),
    escapeCsv(l.uf),
    escapeCsv(l.municipio),
    escapeCsv(l.modalidade),
    l.valorEstimado ? String(l.valorEstimado) : "",
    l.dataPublicacao
      ? l.dataPublicacao.toLocaleDateString("pt-BR")
      : "",
    l.dataSessao ? l.dataSessao.toLocaleDateString("pt-BR") : "",
    escapeCsv(l.card?.coluna?.nome),
    escapeCsv(l.card?.responsavel?.name),
    l.card?.urgente ? "Sim" : "Nao",
    l.scorePreliminar != null ? String(l.scorePreliminar) : "",
    escapeCsv(l.classificacaoPreliminar),
    l.criadoEm.toLocaleDateString("pt-BR"),
  ]);

  const bom = "\uFEFF"; // UTF-8 BOM para Excel
  const csv =
    bom +
    headers.join(",") +
    "\n" +
    rows.map((r) => r.join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=licitacoes_${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
