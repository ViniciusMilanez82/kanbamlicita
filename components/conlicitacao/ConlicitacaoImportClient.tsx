"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUp,
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { parseBoletimCsv } from "@/lib/conlicitacao/parser";
import {
  classificarStatus,
  type BoletimRow,
  type BoletimStatus,
} from "@/lib/conlicitacao/types";
import {
  dedupIdBoletim,
  parseCidadeUf,
  parseValorBR,
} from "@/lib/conlicitacao/normalize";

type PreviewItem = {
  id: string;
  raw: BoletimRow;
  status: BoletimStatus;
  selecionado: boolean;
  cidade: string;
  edital: string;
  objeto: string;
  valorTexto: string;
};

type Resultado = {
  total: number;
  criados: number;
  duplicados: number;
  erros: number;
};

const STATUS_BADGE: Record<
  BoletimStatus,
  { label: string; cor: string }
> = {
  ESCOPO: { label: "No escopo", cor: "bg-green-100 text-green-700 ring-green-200" },
  CONFERIR: { label: "Conferir", cor: "bg-amber-100 text-amber-700 ring-amber-200" },
  RUIDO: { label: "Descartado", cor: "bg-slate-100 text-slate-500 ring-slate-200" },
  OUTRO: { label: "Sem triagem", cor: "bg-slate-100 text-slate-500 ring-slate-200" },
};

function formatarValor(valor: number | null): string {
  if (valor == null) return "";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ConlicitacaoImportClient() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [itens, setItens] = useState<PreviewItem[]>([]);
  const [nomesArquivos, setNomesArquivos] = useState<string[]>([]);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  function montarPreview(rows: BoletimRow[], jaVistos: Set<string>): PreviewItem[] {
    const novos: PreviewItem[] = [];
    for (const raw of rows) {
      const id = dedupIdBoletim(raw);
      if (jaVistos.has(id)) continue; // remove repetidos entre arquivos/dias
      jaVistos.add(id);
      const status = classificarStatus(raw.status);
      const { municipio, uf } = parseCidadeUf(raw.cidade);
      novos.push({
        id,
        raw,
        status,
        // por padrão já vem marcado, exceto o que a triagem descartou
        selecionado: status !== "RUIDO",
        cidade: [municipio, uf].filter(Boolean).join(" - "),
        edital: (raw.edital ?? "").trim(),
        objeto: (raw.objeto ?? raw.unidade ?? "").trim(),
        valorTexto: formatarValor(parseValorBR(raw.valor_estimado)),
      });
    }
    return novos;
  }

  async function aoEscolherArquivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErroLeitura(null);
    setResultado(null);
    try {
      const jaVistos = new Set(itens.map((i) => i.id));
      const acumulado: PreviewItem[] = [];
      const nomes: string[] = [];
      for (const file of Array.from(files)) {
        const texto = await file.text();
        const rows = parseBoletimCsv(texto);
        acumulado.push(...montarPreview(rows, jaVistos));
        nomes.push(file.name);
      }
      if (acumulado.length === 0 && itens.length === 0) {
        setErroLeitura(
          "Não encontramos licitações no arquivo. Confira se é o boletim exportado da ConLicitação."
        );
        return;
      }
      setItens((prev) => [...prev, ...acumulado]);
      setNomesArquivos((prev) => [...prev, ...nomes]);
    } catch {
      setErroLeitura(
        "Não foi possível ler o arquivo. Tente exportar o boletim novamente."
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function alternar(id: string) {
    setItens((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selecionado: !i.selecionado } : i))
    );
  }

  function selecionarTodos(valor: boolean) {
    setItens((prev) => prev.map((i) => ({ ...i, selecionado: valor })));
  }

  function limpar() {
    setItens([]);
    setNomesArquivos([]);
    setResultado(null);
    setErroLeitura(null);
  }

  const selecionados = useMemo(
    () => itens.filter((i) => i.selecionado),
    [itens]
  );

  const importarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/licitacoes/conlicitacao", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: selecionados.map((i) => i.raw) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(String(data.error ?? "Falha ao importar."));
      return data as Resultado;
    },
    onSuccess: (data) => {
      setResultado(data);
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      // remove da lista o que entrou (criados), mantém duplicados/erros visíveis
      if (data.criados > 0) {
        toast.success(
          `${data.criados} licitação${data.criados !== 1 ? "ões" : ""} adicionada${
            data.criados !== 1 ? "s" : ""
          } ao painel! Vá ao Kanban para acompanhar.`
        );
      }
      if (data.duplicados > 0) {
        toast.info(
          `${data.duplicados} já estava${data.duplicados !== 1 ? "m" : ""} no painel.`
        );
      }
      setItens((prev) => prev.filter((i) => !i.selecionado));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Banner explicativo */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
            <Building2 className="h-5 w-5 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Importar boletim da ConLicitação
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Aqui você adiciona licitações ao painel a partir do arquivo do
              boletim da <strong>ConLicitação</strong>. Escolha o arquivo (com
              final <code className="rounded bg-slate-100 px-1">.csv</code>),
              confira a lista e clique em adicionar.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Pode escolher mais de um arquivo de uma vez — itens repetidos entre
              os boletins são juntados automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Passo 1: escolher arquivo */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            1
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Escolha o arquivo do boletim
            </p>
            <p className="text-xs text-slate-500">
              O arquivo é o que você baixa da ConLicitação, separado por ponto e
              vírgula.
            </p>
          </div>
        </div>
        <div className="ml-10 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            multiple
            className="hidden"
            onChange={(e) => aoEscolherArquivos(e.target.files)}
          />
          <Button
            size="lg"
            onClick={() => inputRef.current?.click()}
            className="gap-2 bg-indigo-600 text-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Escolher arquivo
          </Button>
          {itens.length > 0 && (
            <Button
              size="lg"
              variant="outline"
              onClick={limpar}
              className="gap-2 text-sm"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
          {nomesArquivos.length > 0 && (
            <span className="text-xs text-slate-500">
              {nomesArquivos.join(", ")}
            </span>
          )}
        </div>
        {erroLeitura && (
          <div className="ml-10 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erroLeitura}</span>
          </div>
        )}
      </section>

      {/* Resultado da importação */}
      {resultado && (
        <section className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="font-semibold text-slate-900">Resultado:</span>
            <span className="text-green-700">
              <strong>{resultado.criados}</strong> adicionada
              {resultado.criados !== 1 && "s"}
            </span>
            <span className="text-slate-600">
              <strong>{resultado.duplicados}</strong> já estava
              {resultado.duplicados !== 1 ? "m" : ""} no painel
            </span>
            {resultado.erros > 0 && (
              <span className="text-red-700">
                <strong>{resultado.erros}</strong> com erro
              </span>
            )}
          </div>
        </section>
      )}

      {/* Passo 2: conferir e importar */}
      {itens.length > 0 && (
        <section className="rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Confira e adicione ao painel
                </p>
                <p className="text-xs text-slate-500">
                  {selecionados.length} de {itens.length} selecionada
                  {itens.length !== 1 && "s"}. Desmarque o que não quer importar.
                </p>
              </div>
            </div>
            <div className="ml-10 flex items-center gap-2 sm:ml-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => selecionarTodos(true)}
                className="text-xs"
              >
                Marcar todas
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => selecionarTodos(false)}
                className="text-xs"
              >
                Desmarcar todas
              </Button>
            </div>
          </div>

          <ul className="divide-y">
            {itens.map((item) => {
              const badge = STATUS_BADGE[item.status];
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 p-4 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={item.selecionado}
                    onChange={() => alternar(item.id)}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${badge.cor}`}
                      >
                        {badge.label}
                      </span>
                      {item.edital && (
                        <span className="text-xs font-medium text-slate-700">
                          {item.edital}
                        </span>
                      )}
                      {item.cidade && (
                        <span className="text-xs text-slate-500">
                          {item.cidade}
                        </span>
                      )}
                      {item.valorTexto && (
                        <span className="text-xs font-medium text-slate-600">
                          {item.valorTexto}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-snug text-slate-800 line-clamp-2">
                      {item.objeto || "Sem descrição"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t p-5">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Info className="h-3.5 w-3.5" />
              As licitações entram na primeira coluna do Kanban.
            </p>
            <Button
              size="lg"
              onClick={() => importarMutation.mutate()}
              disabled={importarMutation.isPending || selecionados.length === 0}
              className="gap-2 bg-indigo-600 text-sm hover:bg-indigo-700"
            >
              {importarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
              {importarMutation.isPending
                ? "Adicionando..."
                : `Adicionar ${selecionados.length} ao painel`}
            </Button>
          </div>
        </section>
      )}

      {/* Estado vazio */}
      {itens.length === 0 && !erroLeitura && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Nenhum arquivo escolhido ainda
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Clique em &quot;Escolher arquivo&quot; para carregar o boletim da
            ConLicitação e ver as licitações aqui.
          </p>
        </div>
      )}
    </div>
  );
}
