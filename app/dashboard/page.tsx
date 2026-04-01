import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { MetricsCardsRow } from "@/components/kanban/MetricsCardsRow";
import { queryKanbanMetricas } from "@/lib/kanban/metricas-query";
import { ArrowRight, LayoutGrid } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [metricas, atencao] = await Promise.all([
    queryKanbanMetricas(),
    db.kanbanCard.findMany({
      where: {
        OR: [{ responsavelId: null }, { urgente: true }],
      },
      take: 12,
      orderBy: { atualizadoEm: "desc" },
      include: {
        licitacao: {
          select: {
            id: true,
            orgao: true,
            titulo: true,
            objeto: true,
          },
        },
        coluna: { select: { nome: true } },
      },
    }),
  ]);

  return (
    <>
      <TopBar title="Painel operacional" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <MetricsCardsRow metricas={metricas} />

        {/* Distribuição por coluna */}
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {metricas.porColuna.map((c) => (
              <div
                key={c.colunaId}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: c.cor }}
                />
                <span className="font-medium text-slate-700">
                  {c.colunaNome}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/kanban"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-100 hover:bg-slate-50"
            >
              <LayoutGrid className="h-4 w-4 text-blue-700" aria-hidden />
              Abrir Kanban
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            {session.user.role === "admin" ? (
              <Link
                href="/pncp"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm hover:bg-blue-100"
              >
                Buscar no PNCP
              </Link>
            ) : null}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Precisam de atenção
              </h2>
              <p className="text-xs text-slate-500">
                Sem responsável ou urgentes (até 12 mais recentes).
              </p>
            </div>
            {atencao.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Nada crítico na fila no momento.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {atencao.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/licitacoes/${c.licitacao.id}`}
                      className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {c.licitacao.orgao ?? "—"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {c.licitacao.titulo?.slice(0, 80)}
                          {(c.licitacao.titulo?.length ?? 0) > 80 ? "…" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0">
                        {c.urgente && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-800 ring-1 ring-rose-100">
                            Urgente
                          </span>
                        )}
                        {!c.responsavelId && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-amber-100">
                            Sem responsável
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-slate-500">
                          {c.coluna.nome}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
