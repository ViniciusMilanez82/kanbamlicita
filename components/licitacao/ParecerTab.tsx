"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ListaEditavel } from "./ListaEditavel";

type ParecerData = Record<string, unknown> | null;

export function ParecerTab({
  licitacaoId,
  classificacaoScore,
}: {
  licitacaoId: string;
  classificacaoScore?: string;
}) {
  const queryClient = useQueryClient();

  const { data: parecerData, isLoading } = useQuery<ParecerData>({
    queryKey: ["parecer", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/parecer`);
      if (!r.ok) throw new Error("Erro ao carregar parecer");
      return r.json();
    },
  });

  function buildForm(p: ParecerData, fallbackClass?: string) {
    if (!p) {
      return {
        classificacaoFinal: fallbackClass ?? "",
        prioridadeComercial: "",
        valeEsforcoComercial: false,
        recomendacaoFinal: "",
        resumo: "",
        oportunidadeDireta: false,
        oportunidadeIndireta: false,
        oportunidadeOcultaItemLoteAnexo: false,
        oportunidadeInexistente: false,
        riscoFalsoPositivo: false,
        riscoFalsoNegativoSoTitulo: false,
        ondeEstaOportunidade: [] as string[],
        solucoesQueMultiteinerPoderiaOfertar: [] as string[],
        proximoPasosRecomendado: [] as string[],
        riscosLimitacoes: [] as string[],
        evidenciasPrincipais: [] as string[],
      };
    }
    return {
      classificacaoFinal: (p.classificacaoFinal as string) ?? fallbackClass ?? "",
      prioridadeComercial: (p.prioridadeComercial as string) ?? "",
      valeEsforcoComercial: (p.valeEsforcoComercial as boolean) ?? false,
      recomendacaoFinal: (p.recomendacaoFinal as string) ?? "",
      resumo: (p.resumo as string) ?? "",
      oportunidadeDireta: (p.oportunidadeDireta as boolean) ?? false,
      oportunidadeIndireta: (p.oportunidadeIndireta as boolean) ?? false,
      oportunidadeOcultaItemLoteAnexo: (p.oportunidadeOcultaItemLoteAnexo as boolean) ?? false,
      oportunidadeInexistente: (p.oportunidadeInexistente as boolean) ?? false,
      riscoFalsoPositivo: (p.riscoFalsoPositivo as boolean) ?? false,
      riscoFalsoNegativoSoTitulo: (p.riscoFalsoNegativoSoTitulo as boolean) ?? false,
      ondeEstaOportunidade: Array.isArray(p.ondeEstaOportunidade) ? (p.ondeEstaOportunidade as string[]) : [],
      solucoesQueMultiteinerPoderiaOfertar: Array.isArray(p.solucoesQueMultiteinerPoderiaOfertar) ? (p.solucoesQueMultiteinerPoderiaOfertar as string[]) : [],
      proximoPasosRecomendado: Array.isArray(p.proximoPasosRecomendado) ? (p.proximoPasosRecomendado as string[]) : [],
      riscosLimitacoes: Array.isArray(p.riscosLimitacoes) ? (p.riscosLimitacoes as string[]) : [],
      evidenciasPrincipais: Array.isArray(p.evidenciasPrincipais) ? (p.evidenciasPrincipais as string[]) : [],
    };
  }

  const [form, setForm] = useState(() => buildForm(null, classificacaoScore));
  const [seedSource, setSeedSource] = useState<ParecerData | undefined>(undefined);

  // Render-phase reseed when query data arrives or licitação muda — supported by React 19.
  if (parecerData !== undefined && parecerData !== seedSource) {
    setSeedSource(parecerData);
    setForm(buildForm(parecerData, classificacaoScore));
  }

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/parecer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          classificacaoFinal: form.classificacaoFinal || null,
          prioridadeComercial: form.prioridadeComercial || null,
          recomendacaoFinal: form.recomendacaoFinal || null,
          resumo: form.resumo || null,
          ondeEstaOportunidade: form.ondeEstaOportunidade.length > 0 ? form.ondeEstaOportunidade : null,
          solucoesQueMultiteinerPoderiaOfertar: form.solucoesQueMultiteinerPoderiaOfertar.length > 0 ? form.solucoesQueMultiteinerPoderiaOfertar : null,
          proximoPasosRecomendado: form.proximoPasosRecomendado.length > 0 ? form.proximoPasosRecomendado : null,
          riscosLimitacoes: form.riscosLimitacoes.length > 0 ? form.riscosLimitacoes : null,
          evidenciasPrincipais: form.evidenciasPrincipais.length > 0 ? form.evidenciasPrincipais : null,
        }),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Parecer salvo!");
      queryClient.invalidateQueries({ queryKey: ["parecer", licitacaoId] });
    },
    onError: () => toast.error("Erro ao salvar parecer"),
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)}</div>;
  }

  const OPORTUNIDADES = [
    { key: "oportunidadeDireta" as const, label: "Oportunidade direta" },
    { key: "oportunidadeIndireta" as const, label: "Oportunidade indireta" },
    { key: "oportunidadeOcultaItemLoteAnexo" as const, label: "Oportunidade oculta (item/lote/anexo)" },
    { key: "oportunidadeInexistente" as const, label: "Oportunidade inexistente" },
  ];

  const RISCOS = [
    { key: "riscoFalsoPositivo" as const, label: "Risco de falso positivo" },
    { key: "riscoFalsoNegativoSoTitulo" as const, label: "Risco de falso negativo (análise só pelo título)" },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Parecer comercial</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Classificação final</label>
          <Select value={form.classificacaoFinal || ""} onValueChange={(v) => setForm({ ...form, classificacaoFinal: v ?? "" })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="D">D</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Prioridade comercial</label>
          <Select value={form.prioridadeComercial || ""} onValueChange={(v) => setForm({ ...form, prioridadeComercial: v ?? "" })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              checked={form.valeEsforcoComercial}
              onChange={(e) => setForm({ ...form, valeEsforcoComercial: e.target.checked })}
              className="rounded"
            />
            Vale esforço comercial?
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Tipo de oportunidade</h4>
          {OPORTUNIDADES.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[o.key]}
                onChange={(e) => setForm({ ...form, [o.key]: e.target.checked })}
                className="rounded"
              />
              {o.label}
            </label>
          ))}
        </div>
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Riscos</h4>
          {RISCOS.map((r) => (
            <label key={r.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[r.key]}
                onChange={(e) => setForm({ ...form, [r.key]: e.target.checked })}
                className="rounded"
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      <ListaEditavel label="Onde está a oportunidade?" items={form.ondeEstaOportunidade} onChange={(v) => setForm({ ...form, ondeEstaOportunidade: v })} placeholder="Ex: Item 3 do lote 2..." />
      <ListaEditavel label="Soluções que a Multiteiner poderia ofertar" items={form.solucoesQueMultiteinerPoderiaOfertar} onChange={(v) => setForm({ ...form, solucoesQueMultiteinerPoderiaOfertar: v })} placeholder="Ex: Container reefer 40'..." />
      <ListaEditavel label="Próximos passos recomendados" items={form.proximoPasosRecomendado} onChange={(v) => setForm({ ...form, proximoPasosRecomendado: v })} placeholder="Ex: Solicitar edital completo..." />
      <ListaEditavel label="Riscos e limitações" items={form.riscosLimitacoes} onChange={(v) => setForm({ ...form, riscosLimitacoes: v })} placeholder="Ex: Prazo curto para proposta..." />
      <ListaEditavel label="Evidências principais" items={form.evidenciasPrincipais} onChange={(v) => setForm({ ...form, evidenciasPrincipais: v })} placeholder="Ex: Menção a container no item 5..." />

      <div>
        <label className="text-sm font-medium">Recomendação final</label>
        <Textarea value={form.recomendacaoFinal} onChange={(e) => setForm({ ...form, recomendacaoFinal: e.target.value })} rows={3} placeholder="Recomendação detalhada..." />
      </div>

      <div>
        <label className="text-sm font-medium">Resumo executivo</label>
        <Textarea value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} rows={3} placeholder="Resumo para leitura rápida..." />
      </div>

      <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
        {salvarMutation.isPending ? "Salvando..." : "Salvar parecer"}
      </Button>
    </div>
  );
}
