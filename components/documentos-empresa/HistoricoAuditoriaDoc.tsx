"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, History } from "lucide-react";

type AuditoriaEntry = {
  id: string;
  acao: string;
  detalhes: string | null;
  criadoEm: string;
  realizadoPor: { name: string | null };
  documento: {
    tipoDocumento: string;
    nomeOriginal: string;
    cnpj: string;
  };
};

const ACAO_LABELS: Record<string, { label: string; cor: string }> = {
  upload: { label: "Upload", cor: "text-emerald-600 bg-emerald-50" },
  substituicao: { label: "Substituição", cor: "text-amber-600 bg-amber-50" },
  exclusao: { label: "Exclusão", cor: "text-red-600 bg-red-50" },
  alteracao_metadata: { label: "Edição", cor: "text-blue-600 bg-blue-50" },
  download: { label: "Download", cor: "text-slate-600 bg-slate-50" },
};

export function HistoricoAuditoriaDoc() {
  const [filtroAcao, setFiltroAcao] = useState("");

  const { data: registros = [], isLoading } = useQuery<AuditoriaEntry[]>({
    queryKey: ["auditoria-doc", filtroAcao],
    queryFn: async () => {
      const params = filtroAcao ? `?acao=${filtroAcao}` : "";
      const r = await fetch(`/api/documentos-empresa/auditoria${params}`);
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">
          Log de auditoria
        </h3>
        <select
          value={filtroAcao}
          onChange={(e) => setFiltroAcao(e.target.value)}
          className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todas as ações</option>
          <option value="upload">Upload</option>
          <option value="substituicao">Substituição</option>
          <option value="exclusao">Exclusão</option>
          <option value="alteracao_metadata">Edição</option>
          <option value="download">Download</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : registros.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <p className="text-sm text-slate-500">Nenhum registro de auditoria.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {registros.map((reg) => {
            const acaoConfig = ACAO_LABELS[reg.acao] ?? {
              label: reg.acao,
              cor: "text-slate-600 bg-slate-50",
            };
            return (
              <div
                key={reg.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <span
                  className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${acaoConfig.cor}`}
                >
                  {acaoConfig.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">
                      {reg.documento.tipoDocumento}
                    </span>
                    {" — "}
                    <span className="text-slate-500">
                      {reg.documento.nomeOriginal}
                    </span>
                  </p>
                  {reg.detalhes && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {reg.detalhes}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">
                    {new Date(reg.criadoEm).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {reg.realizadoPor?.name ?? "Sistema"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
