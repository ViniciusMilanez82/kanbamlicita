"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Loader2, Sparkles } from "lucide-react";

type AnaliseResponse = {
  analise: Record<string, unknown> | null;
  analiseIa: { status: string; resultadoJson: Record<string, unknown> | null } | null;
};

const NIVEIS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
  { value: "nenhuma", label: "Nenhuma" },
];

function BlocoAnalise({
  titulo,
  existeValue,
  onExisteChange,
  nivelValue,
  onNivelChange,
  iaPreenchido,
}: {
  titulo: string;
  existeValue: boolean;
  onExisteChange: (v: boolean) => void;
  nivelValue: string;
  onNivelChange: (v: string) => void;
  iaPreenchido?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{titulo}</h4>
        {iaPreenchido && <Badge variant="secondary" className="text-xs">IA</Badge>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={existeValue}
          onChange={(e) => onExisteChange(e.target.checked)}
          className="rounded"
        />
        Existe?
      </label>
      {existeValue && (
        <Select value={nivelValue || ""} onValueChange={(v) => onNivelChange(v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            {NIVEIS.map((n) => (
              <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function AnaliseTab({ licitacaoId }: { licitacaoId: string }) {
  const queryClient = useQueryClient();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const { data, isLoading } = useQuery<AnaliseResponse>({
    queryKey: ["analise", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise`);
      if (!r.ok) throw new Error("Erro ao carregar análise");
      return r.json();
    },
  });

  const [form, setForm] = useState({
    aderenciaDiretaExiste: false,
    aderenciaDiretaNivel: "",
    aderenciaAplicacaoExiste: false,
    aderenciaAplicacaoNivel: "",
    contextoOcultoExiste: false,
    contextoOcultoNivel: "",
    oportunidadeOcultaExiste: false,
    oportunidadeOcultaForca: "",
    oportunidadeOcultaResumo: "",
    oportunidadeNoObjeto: false,
    oportunidadeNoTr: false,
    oportunidadeNosLotes: false,
    oportunidadeNosItens: false,
    oportunidadeNaPlanilha: false,
    oportunidadeNoMemorial: false,
    oportunidadeEmAnexoTecnico: false,
  });

  const [iaFields, setIaFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data?.analise) {
      const a = data.analise;
      setForm({
        aderenciaDiretaExiste: (a.aderenciaDiretaExiste as boolean) ?? false,
        aderenciaDiretaNivel: (a.aderenciaDiretaNivel as string) ?? "",
        aderenciaAplicacaoExiste: (a.aderenciaAplicacaoExiste as boolean) ?? false,
        aderenciaAplicacaoNivel: (a.aderenciaAplicacaoNivel as string) ?? "",
        contextoOcultoExiste: (a.contextoOcultoExiste as boolean) ?? false,
        contextoOcultoNivel: (a.contextoOcultoNivel as string) ?? "",
        oportunidadeOcultaExiste: (a.oportunidadeOcultaExiste as boolean) ?? false,
        oportunidadeOcultaForca: (a.oportunidadeOcultaForca as string) ?? "",
        oportunidadeOcultaResumo: (a.oportunidadeOcultaResumo as string) ?? "",
        oportunidadeNoObjeto: (a.oportunidadeNoObjeto as boolean) ?? false,
        oportunidadeNoTr: (a.oportunidadeNoTr as boolean) ?? false,
        oportunidadeNosLotes: (a.oportunidadeNosLotes as boolean) ?? false,
        oportunidadeNosItens: (a.oportunidadeNosItens as boolean) ?? false,
        oportunidadeNaPlanilha: (a.oportunidadeNaPlanilha as boolean) ?? false,
        oportunidadeNoMemorial: (a.oportunidadeNoMemorial as boolean) ?? false,
        oportunidadeEmAnexoTecnico: (a.oportunidadeEmAnexoTecnico as boolean) ?? false,
      });
    }
  }, [data]);

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Análise salva!");
      queryClient.invalidateQueries({ queryKey: ["analise", licitacaoId] });
    },
    onError: () => toast.error("Erro ao salvar análise"),
  });

  const iaMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/analise/ia`, { method: "POST" });
      if (!r.ok) {
        const body = await r.json();
        throw new Error(body.error ?? "Erro ao iniciar análise IA");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success("Análise IA iniciada! Aguarde...");
      // Poll every 3s until done
      pollingRef.current = setInterval(async () => {
        const r = await fetch(`/api/licitacoes/${licitacaoId}/analise`);
        const d = await r.json() as AnaliseResponse;
        if (d.analiseIa?.status === "concluido" && d.analiseIa.resultadoJson) {
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          const ia = d.analiseIa.resultadoJson as Record<string, unknown>;
          const newIaFields = new Set<string>();
          const updated = { ...form };
          const fieldsMap: Array<[string, string, string]> = [
            ["aderenciaDiretaExiste", "aderenciaDiretaNivel", "aderenciaDiretaNivel"],
            ["aderenciaAplicacaoExiste", "aderenciaAplicacaoNivel", "aderenciaAplicacaoNivel"],
            ["contextoOcultoExiste", "contextoOcultoNivel", "contextoOcultoNivel"],
          ];
          for (const [existeKey, nivelKey] of fieldsMap) {
            if (!updated[existeKey as keyof typeof updated] && ia[existeKey] != null) {
              (updated as Record<string, unknown>)[existeKey] = ia[existeKey];
              (updated as Record<string, unknown>)[nivelKey] = ia[nivelKey] ?? "";
              newIaFields.add(existeKey);
            }
          }
          if (!updated.oportunidadeOcultaExiste && ia.oportunidadeOcultaExiste != null) {
            updated.oportunidadeOcultaExiste = ia.oportunidadeOcultaExiste as boolean;
            updated.oportunidadeOcultaForca = (ia.oportunidadeOcultaForca as string) ?? "";
            updated.oportunidadeOcultaResumo = (ia.oportunidadeOcultaResumo as string) ?? "";
            newIaFields.add("oportunidadeOculta");
          }
          const flagKeys = ["oportunidadeNoObjeto", "oportunidadeNoTr", "oportunidadeNosLotes", "oportunidadeNosItens", "oportunidadeNaPlanilha", "oportunidadeNoMemorial", "oportunidadeEmAnexoTecnico"] as const;
          for (const key of flagKeys) {
            if (ia[key]) {
              (updated as Record<string, unknown>)[key] = true;
              newIaFields.add(key);
            }
          }
          setForm(updated);
          setIaFields(newIaFields);
          queryClient.invalidateQueries({ queryKey: ["analise", licitacaoId] });
          toast.success("Análise IA concluída! Campos preenchidos.");
        } else if (d.analiseIa?.status === "erro") {
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          toast.error("Análise IA falhou. Tente novamente.");
        }
      }, 3000);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-lg" />)}</div>;
  }

  const FLAGS = [
    { key: "oportunidadeNoObjeto" as const, label: "No objeto" },
    { key: "oportunidadeNoTr" as const, label: "No termo de referência" },
    { key: "oportunidadeNosLotes" as const, label: "Nos lotes" },
    { key: "oportunidadeNosItens" as const, label: "Nos itens" },
    { key: "oportunidadeNaPlanilha" as const, label: "Na planilha" },
    { key: "oportunidadeNoMemorial" as const, label: "No memorial" },
    { key: "oportunidadeEmAnexoTecnico" as const, label: "Em anexo técnico" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Análise qualitativa</h3>
        <Button
          variant="outline"
          size="sm"
          disabled={iaMutation.isPending || data?.analiseIa?.status === "processando"}
          onClick={() => iaMutation.mutate()}
        >
          {iaMutation.isPending || data?.analiseIa?.status === "processando" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          Analisar com IA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BlocoAnalise
          titulo="Aderência direta"
          existeValue={form.aderenciaDiretaExiste}
          onExisteChange={(v) => setForm({ ...form, aderenciaDiretaExiste: v })}
          nivelValue={form.aderenciaDiretaNivel}
          onNivelChange={(v) => setForm({ ...form, aderenciaDiretaNivel: v })}
          iaPreenchido={iaFields.has("aderenciaDiretaExiste")}
        />
        <BlocoAnalise
          titulo="Aderência por aplicação"
          existeValue={form.aderenciaAplicacaoExiste}
          onExisteChange={(v) => setForm({ ...form, aderenciaAplicacaoExiste: v })}
          nivelValue={form.aderenciaAplicacaoNivel}
          onNivelChange={(v) => setForm({ ...form, aderenciaAplicacaoNivel: v })}
          iaPreenchido={iaFields.has("aderenciaAplicacaoExiste")}
        />
        <BlocoAnalise
          titulo="Contexto oculto"
          existeValue={form.contextoOcultoExiste}
          onExisteChange={(v) => setForm({ ...form, contextoOcultoExiste: v })}
          nivelValue={form.contextoOcultoNivel}
          onNivelChange={(v) => setForm({ ...form, contextoOcultoNivel: v })}
          iaPreenchido={iaFields.has("contextoOcultoExiste")}
        />
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Oportunidade oculta</h4>
          {iaFields.has("oportunidadeOculta") && <Badge variant="secondary" className="text-xs">IA</Badge>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.oportunidadeOcultaExiste}
            onChange={(e) => setForm({ ...form, oportunidadeOcultaExiste: e.target.checked })}
            className="rounded"
          />
          Existe oportunidade oculta?
        </label>
        {form.oportunidadeOcultaExiste && (
          <>
            <Select value={form.oportunidadeOcultaForca || ""} onValueChange={(v) => setForm({ ...form, oportunidadeOcultaForca: v ?? "" })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Força" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={form.oportunidadeOcultaResumo}
              onChange={(e) => setForm({ ...form, oportunidadeOcultaResumo: e.target.value })}
              placeholder="Descreva a oportunidade oculta..."
              rows={3}
            />
          </>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium">Onde encontrou oportunidade?</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {FLAGS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                className="rounded"
              />
              {f.label}
              {iaFields.has(f.key) && <Badge variant="secondary" className="text-[10px] px-1">IA</Badge>}
            </label>
          ))}
        </div>
      </div>

      <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
        {salvarMutation.isPending ? "Salvando..." : "Salvar análise"}
      </Button>
    </div>
  );
}
