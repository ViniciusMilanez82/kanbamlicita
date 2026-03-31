"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

type Execucao = {
  id: string;
  status: string;
  iniciadaEm: string;
  finalizadaEm: string | null;
  totalCaptados: number;
  totalCriados: number;
  totalAtualizados: number;
  totalDuplicados: number;
  totalDescartados: number;
  totalErros: number;
  erro: string | null;
};

function formatarDuracao(inicio: string, fim: string | null): string {
  if (!fim) return "Em andamento";
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  const segundos = Math.floor(ms / 1000);
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${minutos}m ${seg}s`;
}

function formatarData(data: string): string {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  concluida: { label: "Concluída", variant: "default" },
  erro: { label: "Erro", variant: "destructive" },
  executando: { label: "Executando", variant: "secondary" },
  cancelada: { label: "Cancelada", variant: "outline" },
};

export function ExecucoesHistorico({ fonteId }: { fonteId: string }) {
  const { data: execucoes, isLoading } = useQuery<Execucao[]>({
    queryKey: ["execucoes", fonteId],
    queryFn: () => fetch(`/api/fontes/${fonteId}/execucoes`).then((r) => r.json()),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <div className="h-20 bg-slate-50 animate-pulse rounded" />;
  }

  if (!execucoes?.length) {
    return <p className="text-sm text-slate-500 py-2">Nenhuma execução registrada.</p>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Data/Hora</th>
            <th className="text-left px-3 py-2 font-medium">Duração</th>
            <th className="text-left px-3 py-2 font-medium">Status</th>
            <th className="text-right px-3 py-2 font-medium">Captados</th>
            <th className="text-right px-3 py-2 font-medium">Novos</th>
            <th className="text-right px-3 py-2 font-medium">Atualizados</th>
            <th className="text-right px-3 py-2 font-medium">Sem mudanças</th>
            <th className="text-right px-3 py-2 font-medium">Erros</th>
          </tr>
        </thead>
        <tbody>
          {execucoes.map((exec) => {
            const cfg = STATUS_CONFIG[exec.status] ?? { label: exec.status, variant: "secondary" as const };
            return (
              <tr key={exec.id} className="border-t">
                <td className="px-3 py-2">{formatarData(exec.iniciadaEm)}</td>
                <td className="px-3 py-2">{formatarDuracao(exec.iniciadaEm, exec.finalizadaEm)}</td>
                <td className="px-3 py-2">
                  <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                </td>
                <td className="text-right px-3 py-2">{exec.totalCaptados}</td>
                <td className="text-right px-3 py-2">{exec.totalCriados}</td>
                <td className="text-right px-3 py-2">{exec.totalAtualizados}</td>
                <td className="text-right px-3 py-2">{exec.totalDuplicados}</td>
                <td className="text-right px-3 py-2">
                  {exec.totalErros > 0 ? (
                    <span className="text-red-600 font-medium">{exec.totalErros}</span>
                  ) : (
                    exec.totalErros
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {execucoes.some((e) => e.erro) && (
        <div className="px-3 py-2 border-t bg-red-50">
          {execucoes
            .filter((e) => e.erro)
            .slice(0, 3)
            .map((e) => (
              <p key={e.id} className="text-sm text-red-700">
                {formatarData(e.iniciadaEm)}: {e.erro}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
