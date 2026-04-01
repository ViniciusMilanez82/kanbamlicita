"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  licitacaoId: string | null;
  criadoEm: string;
};

const TIPO_ICONE: Record<string, string> = {
  score_alto: "text-emerald-600",
  prazo_vencendo: "text-amber-600",
  captacao_concluida: "text-blue-600",
  nova_licitacao: "text-violet-600",
};

export function NotificacoesBell() {
  const [aberto, setAberto] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: async () => {
      const r = await fetch("/api/notificacoes");
      if (!r.ok) return { notificacoes: [], totalNaoLidas: 0 };
      return r.json() as Promise<{
        notificacoes: Notificacao[];
        totalNaoLidas: number;
      }>;
    },
    refetchInterval: 30_000, // Atualiza a cada 30s
  });

  const marcarMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notificacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marcarTodas: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });

  const total = data?.totalNaoLidas ?? 0;
  const lista = data?.notificacoes ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setAberto(!aberto)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        title="Notificações"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {aberto && (
        <>
          {/* Overlay para fechar */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAberto(false)}
          />

          {/* Painel */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Notificações
              </h3>
              {total > 0 && (
                <button
                  onClick={() => marcarMutation.mutate()}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-auto">
              {lista.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhuma notificação no momento.
                </p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {lista.map((n) => (
                    <li
                      key={n.id}
                      className={`px-4 py-3 ${n.lida ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.lida ? "bg-slate-300" : "bg-blue-500"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${TIPO_ICONE[n.tipo] ?? "text-slate-900"}`}
                          >
                            {n.titulo}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                            {n.mensagem}
                          </p>
                          <div className="mt-1 flex items-center gap-3">
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.criadoEm).toLocaleDateString("pt-BR")}{" "}
                              {new Date(n.criadoEm).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {n.licitacaoId && (
                              <Link
                                href={`/licitacoes/${n.licitacaoId}`}
                                onClick={() => setAberto(false)}
                                className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline"
                              >
                                Ver licitação
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
