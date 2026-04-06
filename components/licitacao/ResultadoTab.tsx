"use client";

import { useState, useEffect, useMemo } from "react";
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
import { ClipboardList } from "lucide-react";
import type { Concorrente, ResultadoLicitacao } from "@/types/licitacao";

const RESULTADOS = [
  { value: "ganhou", label: "Ganhamos" },
  { value: "perdeu", label: "Perdemos" },
  { value: "desistiu", label: "Desistimos" },
  { value: "inabilitado", label: "Inabilitados" },
  { value: "sem_proposta", label: "Sem proposta" },
];

const CRITERIOS = [
  { value: "menor_preco", label: "Menor preco" },
  { value: "tecnica_preco", label: "Tecnica e preco" },
  { value: "maior_desconto", label: "Maior desconto" },
  { value: "melhor_tecnica", label: "Melhor tecnica" },
];

const MOTIVOS_DERROTA = [
  { value: "preco", label: "Preco" },
  { value: "tecnica", label: "Tecnica" },
  { value: "habilitacao", label: "Habilitacao" },
  { value: "prazo", label: "Prazo" },
  { value: "desistencia", label: "Desistencia" },
];

function formatarMoeda(valor: string): string {
  const num = valor.replace(/\D/g, "");
  if (!num) return "";
  const centavos = Number(num) / 100;
  return centavos.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseMoeda(valorFormatado: string): string {
  return valorFormatado.replace(/\./g, "").replace(",", ".");
}

export function ResultadoTab({ licitacaoId }: { licitacaoId: string }) {
  const queryClient = useQueryClient();

  const { data: resultadoData, isLoading } = useQuery<ResultadoLicitacao | null>({
    queryKey: ["resultado", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/resultado`);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("Erro ao carregar resultado");
      return r.json();
    },
  });

  const { data: concorrentes = [] } = useQuery<Concorrente[]>({
    queryKey: ["concorrentes"],
    queryFn: async () => {
      const r = await fetch("/api/concorrentes");
      if (!r.ok) return [];
      return r.json();
    },
  });

  const [form, setForm] = useState({
    resultado: "",
    empresaVencedoraId: "",
    nomeVencedorExterno: "",
    valorVencedor: "",
    valorNossaProposta: "",
    criterioJulgamento: "",
    motivoDerrota: "",
    motivoDetalhado: "",
    licoesAprendidas: "",
  });

  const [buscaConcorrente, setBuscaConcorrente] = useState("");
  const [mostrarListaConcorrentes, setMostrarListaConcorrentes] = useState(false);

  const existeResultado = !!resultadoData?.id;

  useEffect(() => {
    if (resultadoData) {
      setForm({
        resultado: resultadoData.resultado ?? "",
        empresaVencedoraId: resultadoData.empresaVencedoraId ?? "",
        nomeVencedorExterno: resultadoData.nomeVencedorExterno ?? "",
        valorVencedor: resultadoData.valorVencedor
          ? formatarMoeda(String(Math.round(Number(resultadoData.valorVencedor) * 100)))
          : "",
        valorNossaProposta: resultadoData.valorNossaProposta
          ? formatarMoeda(String(Math.round(Number(resultadoData.valorNossaProposta) * 100)))
          : "",
        criterioJulgamento: resultadoData.criterioJulgamento ?? "",
        motivoDerrota: resultadoData.motivoDerrota ?? "",
        motivoDetalhado: resultadoData.motivoDetalhado ?? "",
        licoesAprendidas: resultadoData.licoesAprendidas ?? "",
      });
      // Set the search field with the winner name
      if (resultadoData.empresaVencedora) {
        setBuscaConcorrente(resultadoData.empresaVencedora.nome);
      } else if (resultadoData.nomeVencedorExterno) {
        setBuscaConcorrente(resultadoData.nomeVencedorExterno);
      }
    }
  }, [resultadoData]);

  const concorrentesFiltrados = useMemo(() => {
    if (!buscaConcorrente.trim()) return concorrentes;
    const busca = buscaConcorrente.toLowerCase();
    return concorrentes.filter(
      (c) => c.nome.toLowerCase().includes(busca) || c.cnpj?.includes(busca)
    );
  }, [concorrentes, buscaConcorrente]);

  // Calculate difference percentage
  const diferencaPercentual = useMemo(() => {
    const vencedor = Number(parseMoeda(form.valorVencedor));
    const nosso = Number(parseMoeda(form.valorNossaProposta));
    if (!vencedor || !nosso || isNaN(vencedor) || isNaN(nosso)) return null;
    return ((nosso - vencedor) / vencedor) * 100;
  }, [form.valorVencedor, form.valorNossaProposta]);

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        resultado: form.resultado || null,
        empresaVencedoraId: form.empresaVencedoraId || null,
        nomeVencedorExterno:
          !form.empresaVencedoraId && buscaConcorrente.trim()
            ? buscaConcorrente.trim()
            : null,
        valorVencedor: form.valorVencedor ? parseMoeda(form.valorVencedor) : null,
        valorNossaProposta: form.valorNossaProposta
          ? parseMoeda(form.valorNossaProposta)
          : null,
        criterioJulgamento: form.criterioJulgamento || null,
        motivoDerrota: form.motivoDerrota || null,
        motivoDetalhado: form.motivoDetalhado || null,
        licoesAprendidas: form.licoesAprendidas || null,
      };

      const method = existeResultado ? "PATCH" : "POST";
      const r = await fetch(`/api/licitacoes/${licitacaoId}/resultado`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Erro ao salvar resultado");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Resultado salvo!");
      queryClient.invalidateQueries({ queryKey: ["resultado", licitacaoId] });
    },
    onError: () => toast.error("Erro ao salvar resultado. Tente novamente."),
  });

  function handleValorChange(
    campo: "valorVencedor" | "valorNossaProposta",
    valor: string
  ) {
    const formatted = formatarMoeda(valor);
    setForm({ ...form, [campo]: formatted });
  }

  function selecionarConcorrente(c: Concorrente) {
    setForm({ ...form, empresaVencedoraId: c.id });
    setBuscaConcorrente(c.nome);
    setMostrarListaConcorrentes(false);
  }

  function limparConcorrente() {
    setForm({ ...form, empresaVencedoraId: "" });
    setBuscaConcorrente("");
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!resultadoData && !existeResultado) {
    // Show empty state with option to start registering
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">
            Nenhum resultado registrado
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            Registre o resultado quando a licitacao for concluida. Voce podera
            informar quem venceu, os valores e as licoes aprendidas.
          </p>
          <Button onClick={() => setForm({ ...form, resultado: "ganhou" })}>
            Registrar resultado
          </Button>
        </div>

        {form.resultado && renderFormulario()}
      </div>
    );
  }

  return <div className="space-y-6">{renderFormulario()}</div>;

  function renderFormulario() {
    return (
      <>
        <h3 className="text-lg font-semibold">Resultado da licitacao</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Resultado */}
          <div>
            <label className="text-sm font-medium">Resultado</label>
            <Select
              value={form.resultado || ""}
              onValueChange={(v) => setForm({ ...form, resultado: v ?? "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o resultado" />
              </SelectTrigger>
              <SelectContent>
                {RESULTADOS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Criterio de julgamento */}
          <div>
            <label className="text-sm font-medium">Criterio de julgamento</label>
            <Select
              value={form.criterioJulgamento || ""}
              onValueChange={(v) =>
                setForm({ ...form, criterioJulgamento: v ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CRITERIOS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Empresa vencedora (searchable) */}
        <div className="relative">
          <label className="text-sm font-medium">Empresa vencedora</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={buscaConcorrente}
                onChange={(e) => {
                  setBuscaConcorrente(e.target.value);
                  setForm({ ...form, empresaVencedoraId: "" });
                  setMostrarListaConcorrentes(true);
                }}
                onFocus={() => setMostrarListaConcorrentes(true)}
                onBlur={() =>
                  setTimeout(() => setMostrarListaConcorrentes(false), 200)
                }
                placeholder="Busque pelo nome ou digite o nome da empresa"
              />
              {mostrarListaConcorrentes &&
                buscaConcorrente.trim() &&
                concorrentesFiltrados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-white shadow-lg">
                    {concorrentesFiltrados.slice(0, 10).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selecionarConcorrente(c)}
                      >
                        <span className="font-medium">{c.nome}</span>
                        {c.cnpj && (
                          <span className="ml-2 text-slate-500">{c.cnpj}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
            </div>
            {(form.empresaVencedoraId || buscaConcorrente) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limparConcorrente}
                className="shrink-0"
              >
                Limpar
              </Button>
            )}
          </div>
          {form.empresaVencedoraId && (
            <p className="text-xs text-green-600 mt-1">
              Empresa selecionada do cadastro
            </p>
          )}
          {!form.empresaVencedoraId && buscaConcorrente.trim() && (
            <p className="text-xs text-slate-500 mt-1">
              Nome digitado manualmente (empresa nao cadastrada)
            </p>
          )}
        </div>

        {/* Valores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Valor do vencedor (R$)</label>
            <Input
              value={form.valorVencedor}
              onChange={(e) => handleValorChange("valorVencedor", e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Valor da nossa proposta (R$)
            </label>
            <Input
              value={form.valorNossaProposta}
              onChange={(e) =>
                handleValorChange("valorNossaProposta", e.target.value)
              }
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Diferenca</label>
            <div className="flex items-center h-10">
              {diferencaPercentual !== null ? (
                <Badge
                  className={
                    diferencaPercentual <= 0
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-red-100 text-red-800 hover:bg-red-100"
                  }
                >
                  {diferencaPercentual <= 0 ? "Mais barato" : "Mais caro"}{" "}
                  {Math.abs(diferencaPercentual).toFixed(1)}%
                </Badge>
              ) : (
                <span className="text-sm text-slate-400">
                  Preencha os valores para ver
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Motivo da derrota (only if perdeu) */}
        {form.resultado === "perdeu" && (
          <div>
            <label className="text-sm font-medium">Motivo da derrota</label>
            <Select
              value={form.motivoDerrota || ""}
              onValueChange={(v) =>
                setForm({ ...form, motivoDerrota: v ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_DERROTA.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Detalhes */}
        <div>
          <label className="text-sm font-medium">Detalhes</label>
          <Textarea
            value={form.motivoDetalhado}
            onChange={(e) =>
              setForm({ ...form, motivoDetalhado: e.target.value })
            }
            rows={3}
            placeholder="Informacoes adicionais sobre o resultado..."
          />
        </div>

        {/* Licoes aprendidas */}
        <div>
          <label className="text-sm font-medium">Licoes aprendidas</label>
          <Textarea
            value={form.licoesAprendidas}
            onChange={(e) =>
              setForm({ ...form, licoesAprendidas: e.target.value })
            }
            rows={3}
            placeholder="O que aprendemos com essa licitacao..."
          />
        </div>

        <Button
          onClick={() => salvarMutation.mutate()}
          disabled={salvarMutation.isPending || !form.resultado}
        >
          {salvarMutation.isPending ? "Salvando..." : "Salvar resultado"}
        </Button>
      </>
    );
  }
}
