"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Play, Pencil, Power, Loader2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { FonteDialog } from "./FonteDialog";
import { ExecucoesHistorico } from "./ExecucoesHistorico";

type Fonte = {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  parametros: Record<string, unknown>;
  filtros: Record<string, unknown> | null;
  periodicidade: string | null;
  ultimaSincronizacao: string | null;
  execucoes: Array<{
    id: string;
    status: string;
    totalCaptados: number;
    totalCriados: number;
    totalAtualizados: number;
    totalDuplicados: number;
    totalErros: number;
  }>;
};

const TIPO_LABELS: Record<string, string> = {
  pncp: "PNCP",
  petronect: "Petronect",
  rss: "RSS",
  scraping: "Scraping",
  api_generica: "API Genérica",
};

const TIPO_CORES: Record<string, string> = {
  pncp: "bg-blue-100 text-blue-800",
  petronect: "bg-teal-100 text-teal-800",
  rss: "bg-orange-100 text-orange-800",
  scraping: "bg-purple-100 text-purple-800",
  api_generica: "bg-green-100 text-green-800",
};

function tempoRelativo(data: string | null): string {
  if (!data) return "Nunca";
  const diff = Date.now() - new Date(data).getTime();
  const minutos = Math.floor(diff / 60000);
  if (minutos < 1) return "Agora mesmo";
  if (minutos < 60) return `Há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `Há ${dias} dia${dias > 1 ? "s" : ""}`;
}

export function FontesTab() {
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [fonteEditando, setFonteEditando] = useState<Fonte | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState<string | null>(null);

  const { data: fontes, isLoading } = useQuery<Fonte[]>({
    queryKey: ["fontes"],
    queryFn: async () => {
      const r = await fetch("/api/fontes");
      if (!r.ok) throw new Error("Erro ao carregar fontes");
      return r.json();
    },
  });

  const executarMutation = useMutation({
    mutationFn: (fonteId: string) =>
      fetch(`/api/fontes/${fonteId}/executar`, { method: "POST" }).then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "Erro ao executar");
        }
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Captação iniciada! Acompanhe o progresso no histórico.");
      queryClient.invalidateQueries({ queryKey: ["fontes"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      fetch(`/api/fontes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo }),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Erro ao alterar status");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fontes"] });
    },
    onError: () => {
      toast.error("Erro ao alterar status da fonte");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Fontes de captação</h2>
        <Button
          onClick={() => {
            setFonteEditando(null);
            setDialogAberto(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova fonte
        </Button>
      </div>

      {!fontes?.length && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            Nenhuma fonte configurada. Clique em "Nova fonte" para começar.
          </CardContent>
        </Card>
      )}

      {fontes?.map((fonte) => {
        const ultimaExec = fonte.execucoes[0];
        return (
          <Card key={fonte.id} className={!fonte.ativo ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{fonte.nome}</CardTitle>
                  <Badge className={TIPO_CORES[fonte.tipo] ?? "bg-slate-100 text-slate-800"} variant="secondary">
                    {TIPO_LABELS[fonte.tipo] ?? fonte.tipo}
                  </Badge>
                  {fonte.periodicidade && fonte.periodicidade !== "manual" && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {fonte.periodicidade}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAtivoMutation.mutate({ id: fonte.id, ativo: !fonte.ativo })}
                    title={fonte.ativo ? "Desativar" : "Ativar"}
                  >
                    <Power className={`h-4 w-4 ${fonte.ativo ? "text-green-600" : "text-slate-400"}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFonteEditando(fonte);
                      setDialogAberto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!fonte.ativo || executarMutation.isPending}
                    onClick={() => executarMutation.mutate(fonte.id)}
                  >
                    {executarMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Executar agora
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>Última sincronização: {tempoRelativo(fonte.ultimaSincronizacao)}</span>
                {ultimaExec && (
                  <span className="flex items-center gap-2">
                    <Badge variant={ultimaExec.status === "concluida" ? "default" : ultimaExec.status === "erro" ? "destructive" : "secondary"} className="text-xs">
                      {ultimaExec.status === "concluida" ? "Concluída" : ultimaExec.status === "erro" ? "Erro" : ultimaExec.status === "executando" ? "Executando..." : ultimaExec.status}
                    </Badge>
                    <span>
                      {ultimaExec.totalCaptados} captados &middot; {ultimaExec.totalCriados} novos &middot; {ultimaExec.totalAtualizados} atualizados &middot; {ultimaExec.totalDuplicados} sem mudanças
                      {ultimaExec.totalErros > 0 && <span className="text-red-600"> &middot; {ultimaExec.totalErros} erros</span>}
                    </span>
                  </span>
                )}
              </div>

              <button
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                onClick={() => setHistoricoAberto(historicoAberto === fonte.id ? null : fonte.id)}
              >
                {historicoAberto === fonte.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Histórico de execuções
              </button>

              {historicoAberto === fonte.id && <ExecucoesHistorico fonteId={fonte.id} />}
            </CardContent>
          </Card>
        );
      })}

      <FonteDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        fonte={fonteEditando}
      />
    </div>
  );
}
