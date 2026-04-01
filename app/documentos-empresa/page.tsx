"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { DashboardDocumental } from "@/components/documentos-empresa/DashboardDocumental";
import { RepositorioDocumentos } from "@/components/documentos-empresa/RepositorioDocumentos";
import { ConfiguracaoAlertasTab } from "@/components/documentos-empresa/ConfiguracaoAlertasTab";
import { HistoricoAuditoriaDoc } from "@/components/documentos-empresa/HistoricoAuditoriaDoc";
import { AnaliseIaPanel } from "@/components/documentos-empresa/AnaliseIaPanel";

const TABS = [
  { id: "painel", label: "Painel" },
  { id: "repositorio", label: "Repositório" },
  { id: "alertas", label: "Config. Alertas" },
  { id: "historico", label: "Histórico" },
];

export default function DocumentosEmpresaPage() {
  const [tab, setTab] = useState("painel");
  const [cnpjFiltro, setCnpjFiltro] = useState("");

  // Buscar CNPJs disponíveis
  const { data: cnpjs = [] } = useQuery<string[]>({
    queryKey: ["cnpjs-empresa"],
    queryFn: async () => {
      const r = await fetch("/api/documentos-empresa/cnpjs");
      if (!r.ok) return [];
      return r.json();
    },
  });

  return (
    <>
      <TopBar title="Gestão Documental" />
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          {/* Header com filtro CNPJ */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    tab === t.id
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {cnpjs.length > 0 && (
              <select
                value={cnpjFiltro}
                onChange={(e) => setCnpjFiltro(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos os CNPJs</option>
                {cnpjs.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Conteúdo da aba */}
          {tab === "painel" && (
            <>
              <DashboardDocumental cnpjFiltro={cnpjFiltro || undefined} />
              <AnaliseIaPanel />
            </>
          )}
          {tab === "repositorio" && (
            <RepositorioDocumentos cnpjFiltro={cnpjFiltro || undefined} />
          )}
          {tab === "alertas" && <ConfiguracaoAlertasTab />}
          {tab === "historico" && <HistoricoAuditoriaDoc />}
        </div>
      </div>
    </>
  );
}
