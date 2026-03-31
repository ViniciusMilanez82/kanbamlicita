"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calculator, Loader2 } from "lucide-react";

const COR_CLASSIFICACAO: Record<string, string> = {
  "A+": "bg-emerald-700 text-white",
  A: "bg-blue-600 text-white",
  B: "bg-yellow-500 text-white",
  C: "bg-orange-500 text-white",
  D: "bg-red-600 text-white",
};

const COMPONENTES = [
  { key: "scoreAderenciaDireta", label: "Aderencia direta", peso: "15%" },
  { key: "scoreAderenciaAplicacao", label: "Aderencia aplicacao", peso: "25%" },
  { key: "scoreContextoOculto", label: "Contexto oculto", peso: "20%" },
  { key: "scoreModeloComercial", label: "Modelo comercial", peso: "15%" },
  { key: "scorePotencialEconomico", label: "Potencial economico", peso: "15%" },
  { key: "scoreQualidadeEvidencia", label: "Qualidade evidencia", peso: "10%" },
];

export function ScoreTab({ licitacaoId }: { licitacaoId: string }) {
  const queryClient = useQueryClient();

  const { data: scoreData, isLoading } = useQuery<Record<string, unknown> | null>({
    queryKey: ["score", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/score`);
      if (!r.ok) throw new Error("Erro ao carregar score");
      return r.json();
    },
  });

  const [form, setForm] = useState({
    scoreFinal: 0,
    classificacao: "",
    scoreAderenciaDireta: 0,
    scoreAderenciaAplicacao: 0,
    scoreContextoOculto: 0,
    scoreModeloComercial: 0,
    scorePotencialEconomico: 0,
    scoreQualidadeEvidencia: 0,
    scoreJustificativaResumida: "",
    // Valor capturavel
    valorCapturavelEstimado: "",
    valorCapturavelFaixaMin: "",
    valorCapturavelFaixaMax: "",
    valorCapturavelMoeda: "BRL",
    valorCapturavelNivelConfianca: "",
    valorCapturavelMetodoEstimativa: "",
    valorCapturavelJustificativa: "",
    valorCapturavelObservacao: "",
    // Falso negativo
    falsoNegativoExisteRisco: false,
    falsoNegativoNivelRisco: "",
    falsoNegativoResumo: "",
  });

  useEffect(() => {
    if (scoreData) {
      setForm({
        scoreFinal: Number(scoreData.scoreFinal ?? 0),
        classificacao: (scoreData.classificacao as string) ?? "",
        scoreAderenciaDireta: Number(scoreData.scoreAderenciaDireta ?? 0),
        scoreAderenciaAplicacao: Number(scoreData.scoreAderenciaAplicacao ?? 0),
        scoreContextoOculto: Number(scoreData.scoreContextoOculto ?? 0),
        scoreModeloComercial: Number(scoreData.scoreModeloComercial ?? 0),
        scorePotencialEconomico: Number(scoreData.scorePotencialEconomico ?? 0),
        scoreQualidadeEvidencia: Number(scoreData.scoreQualidadeEvidencia ?? 0),
        scoreJustificativaResumida: (scoreData.scoreJustificativaResumida as string) ?? "",
        valorCapturavelEstimado: scoreData.valorCapturavelEstimado != null ? String(scoreData.valorCapturavelEstimado) : "",
        valorCapturavelFaixaMin: scoreData.valorCapturavelFaixaMin != null ? String(scoreData.valorCapturavelFaixaMin) : "",
        valorCapturavelFaixaMax: scoreData.valorCapturavelFaixaMax != null ? String(scoreData.valorCapturavelFaixaMax) : "",
        valorCapturavelMoeda: (scoreData.valorCapturavelMoeda as string) ?? "BRL",
        valorCapturavelNivelConfianca: (scoreData.valorCapturavelNivelConfianca as string) ?? "",
        valorCapturavelMetodoEstimativa: (scoreData.valorCapturavelMetodoEstimativa as string) ?? "",
        valorCapturavelJustificativa: (scoreData.valorCapturavelJustificativa as string) ?? "",
        valorCapturavelObservacao: (scoreData.valorCapturavelObservacao as string) ?? "",
        falsoNegativoExisteRisco: (scoreData.falsoNegativoExisteRisco as boolean) ?? false,
        falsoNegativoNivelRisco: (scoreData.falsoNegativoNivelRisco as string) ?? "",
        falsoNegativoResumo: (scoreData.falsoNegativoResumo as string) ?? "",
      });
    }
  }, [scoreData]);

  const calcularMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/score/calcular`, { method: "POST" });
      if (!r.ok) {
        const body = await r.json();
        throw new Error(body.error ?? "Erro ao calcular");
      }
      return r.json() as Promise<{ scoreFinal: number; classificacao: string; componentes: Record<string, number>; justificativaResumida: string }>;
    },
    onSuccess: (resultado) => {
      setForm((prev) => ({
        ...prev,
        scoreFinal: resultado.scoreFinal,
        classificacao: resultado.classificacao,
        ...resultado.componentes,
        scoreJustificativaResumida: resultado.justificativaResumida,
      }));
      toast.success("Score calculado! Ajuste os valores se necessario.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          valorCapturavelEstimado: form.valorCapturavelEstimado || null,
          valorCapturavelFaixaMin: form.valorCapturavelFaixaMin || null,
          valorCapturavelFaixaMax: form.valorCapturavelFaixaMax || null,
          valorCapturavelNivelConfianca: form.valorCapturavelNivelConfianca || null,
          valorCapturavelMetodoEstimativa: form.valorCapturavelMetodoEstimativa || null,
          valorCapturavelJustificativa: form.valorCapturavelJustificativa || null,
          valorCapturavelObservacao: form.valorCapturavelObservacao || null,
          falsoNegativoNivelRisco: form.falsoNegativoNivelRisco || null,
          falsoNegativoResumo: form.falsoNegativoResumo || null,
        }),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Score salvo!");
      queryClient.invalidateQueries({ queryKey: ["score", licitacaoId] });
    },
    onError: () => toast.error("Erro ao salvar score"),
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Score</h3>
        <Button variant="outline" size="sm" disabled={calcularMutation.isPending} onClick={() => calcularMutation.mutate()}>
          {calcularMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
          Calcular score
        </Button>
      </div>

      {form.classificacao && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
          <Badge className={`text-lg px-3 py-1 ${COR_CLASSIFICACAO[form.classificacao] ?? "bg-slate-400 text-white"}`}>
            {form.classificacao}
          </Badge>
          <span className="text-3xl font-bold">{form.scoreFinal}</span>
          <span className="text-slate-500">/ 100</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMPONENTES.map((c) => (
          <div key={c.key} className="border rounded-lg p-3">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">{c.label}</label>
              <span className="text-xs text-slate-500">Peso: {c.peso}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={form[c.key as keyof typeof form] as number}
                onChange={(e) => setForm({ ...form, [c.key]: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-mono w-8 text-right">
                {form[c.key as keyof typeof form] as number}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium">Justificativa resumida</label>
        <Textarea
          value={form.scoreJustificativaResumida}
          onChange={(e) => setForm({ ...form, scoreJustificativaResumida: e.target.value })}
          rows={3}
        />
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Valor capturavel</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-slate-600">Estimado (R$)</label>
            <Input type="number" value={form.valorCapturavelEstimado} onChange={(e) => setForm({ ...form, valorCapturavelEstimado: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Faixa min (R$)</label>
            <Input type="number" value={form.valorCapturavelFaixaMin} onChange={(e) => setForm({ ...form, valorCapturavelFaixaMin: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Faixa max (R$)</label>
            <Input type="number" value={form.valorCapturavelFaixaMax} onChange={(e) => setForm({ ...form, valorCapturavelFaixaMax: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">Nivel de confianca</label>
            <Select value={form.valorCapturavelNivelConfianca || ""} onValueChange={(v) => setForm({ ...form, valorCapturavelNivelConfianca: v ?? "" })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Metodo de estimativa</label>
            <Input value={form.valorCapturavelMetodoEstimativa} onChange={(e) => setForm({ ...form, valorCapturavelMetodoEstimativa: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-sm text-slate-600">Justificativa</label>
          <Textarea value={form.valorCapturavelJustificativa} onChange={(e) => setForm({ ...form, valorCapturavelJustificativa: e.target.value })} rows={2} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Risco de falso negativo</h4>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.falsoNegativoExisteRisco} onChange={(e) => setForm({ ...form, falsoNegativoExisteRisco: e.target.checked })} className="rounded" />
          Existe risco de falso negativo?
        </label>
        {form.falsoNegativoExisteRisco && (
          <>
            <Select value={form.falsoNegativoNivelRisco || ""} onValueChange={(v) => setForm({ ...form, falsoNegativoNivelRisco: v ?? "" })}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Nivel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <label className="text-sm text-slate-600">Resumo</label>
              <Textarea value={form.falsoNegativoResumo} onChange={(e) => setForm({ ...form, falsoNegativoResumo: e.target.value })} rows={3} />
            </div>
          </>
        )}
      </div>

      <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending || !form.classificacao}>
        {salvarMutation.isPending ? "Salvando..." : "Salvar score"}
      </Button>
    </div>
  );
}
