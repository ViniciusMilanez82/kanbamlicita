"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PNCP_DOCS } from "@/lib/pncp/constants";
import type { PncpContratoListaItem, PncpPreferenciasSalvas } from "@/lib/pncp/types";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Filter,
  HelpCircle,
  Info,
  Loader2,
  Receipt,
  Save,
  ScrollText,
  Search,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function explicarErro(texto: string): string {
  const t = texto.trim();
  if (!t) return "Algo deu errado. Tente de novo daqui a pouco.";
  if (/n[aã]o autenticado/i.test(t))
    return "Você precisa estar logado. Atualize a página (F5) e entre de novo.";
  if (/502|consultar pncp|falha ao consultar|indisponível/i.test(t))
    return "O site do governo está fora do ar neste momento. Aguarde alguns minutos e tente de novo.";
  if (/409|já existe|já foi adicionad/i.test(t))
    return "Esse contrato já está no seu painel. Abra o Kanban para vê-lo.";
  return t;
}

function fmtNum(n: number) {
  return n.toLocaleString("pt-BR");
}

const TAMANHOS_LOTE = [10, 20, 30, 40, 50] as const;

function tamanhoLoteValido(n: number): string {
  if (!Number.isFinite(n)) return "20";
  const r = Math.round(n / 10) * 10;
  return String(Math.min(50, Math.max(10, r)));
}

/* ------------------------------------------------------------------ */
/*  Config dos tipos de documento                                      */
/* ------------------------------------------------------------------ */

const TIPOS_DOC = [
  { id: "contrato", label: "Contratos", icon: FileText, cor: "blue" },
  { id: "empenho", label: "Empenhos", icon: Receipt, cor: "amber" },
  { id: "ata", label: "Atas", icon: ScrollText, cor: "emerald" },
] as const;

const COR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string; header: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-800", header: "bg-blue-600" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-800", header: "bg-amber-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", header: "bg-emerald-600" },
};

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

type TipoResultado = {
  tipo: string;
  itens: PncpContratoListaItem[];
  totalRegistros: number;
  totalPaginas: number;
};

type ResultadoAgrupado = {
  porTipo: Record<string, TipoResultado>;
  totalGeral: number;
  numeroPagina: number;
  filtrosUsados: { ufs: string[]; palavrasChave: string[] };
};

/* ------------------------------------------------------------------ */
/*  Dica contextual                                                    */
/* ------------------------------------------------------------------ */

function Dica({ children }: { children: React.ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return (
    <span className="relative inline-block align-middle ml-1">
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        className="text-slate-400 hover:text-blue-600 transition-colors"
        aria-label="Ver explicação"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {aberta && (
        <span className="absolute left-0 top-5 z-50 w-72 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-slate-700 shadow-lg">
          <button
            type="button"
            onClick={() => setAberta(false)}
            className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
          {children}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Passo header                                                       */
/* ------------------------------------------------------------------ */

function PassoHeader({
  numero,
  titulo,
  descricao,
}: {
  numero: number;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {numero}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{titulo}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{descricao}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Coluna de resultados por tipo                                      */
/* ------------------------------------------------------------------ */

function ColunaResultado({
  config,
  dados,
  pagina,
  isPending,
  onPaginaChange,
  onImportar,
  importandoId,
}: {
  config: (typeof TIPOS_DOC)[number];
  dados: TipoResultado | undefined;
  pagina: number;
  isPending: boolean;
  onPaginaChange: (tipo: string, pag: number) => void;
  onImportar: (item: { raw: object; urlPncp?: string | null }) => void;
  importandoId: string | null;
}) {
  const Icon = config.icon;
  const cores = COR_CLASSES[config.cor];
  const itens = dados?.itens ?? [];
  const total = dados?.totalRegistros ?? 0;
  const totalPaginas = dados?.totalPaginas ?? 1;

  return (
    <div className={`flex flex-col rounded-xl border ${cores.border} overflow-hidden`}>
      {/* Header da coluna */}
      <div className={`${cores.header} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white" />
          <span className="text-sm font-semibold text-white">{config.label}</span>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
          {fmtNum(total)}
        </span>
      </div>

      {/* Itens */}
      <div className={`flex-1 ${cores.bg} p-2 space-y-2 overflow-y-auto`} style={{ maxHeight: "calc(100vh - 400px)" }}>
        {isPending && itens.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {!isPending && itens.length === 0 && (
          <div className="py-8 text-center">
            <Info className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-xs text-slate-400">Nenhum resultado</p>
          </div>
        )}

        {itens.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-2">
              {row.titulo}
            </p>
            {row.orgao && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-1">{row.orgao}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              {row.uf && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  {row.uf}
                </span>
              )}
              {row.municipio && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                  {row.municipio}
                </span>
              )}
              {row.valorGlobal != null && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                  R$ {row.valorGlobal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              {row.dataPublicacao && (
                <span className="text-slate-400">
                  {new Date(row.dataPublicacao).toLocaleDateString("pt-BR")}
                </span>
              )}
              {row.urlPncp && (
                <a
                  href={row.urlPncp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                >
                  Ver <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <Button
              size="sm"
              className="mt-2 w-full gap-1.5 text-xs h-7"
              disabled={importandoId === row.id}
              onClick={() => onImportar({ raw: row.raw, urlPncp: row.urlPncp })}
            >
              {importandoId === row.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Adicionar
            </Button>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {total > 0 && totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t px-3 py-2 bg-white">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isPending || pagina <= 1}
            onClick={() => onPaginaChange(config.id, pagina - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-slate-400">
            {pagina}/{totalPaginas}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isPending || pagina >= totalPaginas}
            onClick={() => onPaginaChange(config.id, pagina + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

export function PncpBuscaClient() {
  const queryClient = useQueryClient();

  const { data: empresa } = useQuery({
    queryKey: ["empresa"],
    queryFn: async () => {
      const r = await fetch("/api/empresa", { credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(explicarErro(String(data.error ?? "")));
      return data as {
        nome: string | null;
        descricao?: string | null;
        segmento?: string | null;
        pncpPreferencias?: PncpPreferenciasSalvas | null;
      } | null;
    },
  });

  const prefs = empresa?.pncpPreferencias;

  const [ufsCsv, setUfsCsv] = useState("");
  const [palavras, setPalavras] = useState("");
  const [tamanho, setTamanho] = useState("20");
  const [paginas, setPaginas] = useState<Record<string, number>>({ contrato: 1, empenho: 1, ata: 1 });
  const [resultado, setResultado] = useState<ResultadoAgrupado | null>(null);
  const [importandoId, setImportandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!prefs) return;
    if (prefs.ufs?.length) setUfsCsv(prefs.ufs.join(", "));
    if (prefs.palavrasChave?.length) setPalavras(prefs.palavrasChave.join(", "));
    if (prefs.tamanhoPagina) setTamanho(tamanhoLoteValido(prefs.tamanhoPagina));
  }, [prefs]);

  const buscarMutation = useMutation({
    mutationFn: async (overrides?: { pagina?: number }) => {
      const paginaReq = overrides?.pagina ?? 1;
      const r = await fetch("/api/pncp/contratos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagina: paginaReq,
          tamanhoPagina: Number(tamanho) || 20,
          ufsCsv,
          palavrasChaveTexto: palavras,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(explicarErro(String(data.error ?? "")));
      return data as ResultadoAgrupado;
    },
    onSuccess: (data) => setResultado(data),
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarPrefsMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/empresa", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: empresa?.nome ?? "Minha Empresa",
          descricao: empresa?.descricao ?? "",
          segmento: empresa?.segmento ?? "",
          pncpPreferencias: {
            ufs: ufsCsv
              .split(/[,;\s]+/)
              .map((s) => s.trim().toUpperCase())
              .filter((s) => /^[A-Z]{2}$/.test(s)),
            palavrasChave: palavras
              .split(/[,;\n]+/)
              .map((s) => s.trim())
              .filter(Boolean),
            tamanhoPagina: Number(tamanho) || 20,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(explicarErro(String(data.error ?? "")));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresa"] });
      toast.success("Opções salvas!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importarMutation = useMutation({
    mutationFn: async (item: { raw: object; urlPncp?: string | null; id: string }) => {
      setImportandoId(item.id);
      const r = await fetch("/api/licitacoes/pncp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: item.raw, urlPncp: item.urlPncp }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(explicarErro(String(data.error ?? "")));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Adicionado ao painel!");
      setImportandoId(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setImportandoId(null);
    },
  });

  function handlePaginaChange(tipo: string, pag: number) {
    setPaginas((prev) => ({ ...prev, [tipo]: pag }));
    // Re-buscar com a nova página
    buscarMutation.mutate({ pagina: pag });
  }

  const totalGeral = resultado?.totalGeral ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Banner explicativo */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <BookOpen className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Busca no PNCP — Contratos, Empenhos e Atas
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Pesquise no Portal Nacional de Contratações Públicas. Os resultados são
              separados em <strong>3 colunas</strong>: contratos, empenhos e atas de registro de preços.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={PNCP_DOCS.site}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 transition-colors"
              >
                O que é o PNCP <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de busca compacto */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label className="text-xs font-medium text-slate-600">
              Palavras-chave
              <Dica>
                Escreva o que procura, separado por vírgula. Ex: container, equipamento portuário
              </Dica>
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              rows={2}
              placeholder="Ex: container, locação, equipamento"
              value={palavras}
              onChange={(e) => setPalavras(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Estados
              <Dica>Siglas separadas por vírgula. Vazio = todos.</Dica>
            </label>
            <Input
              placeholder="SP, RJ, MG"
              value={ufsCsv}
              onChange={(e) => setUfsCsv(e.target.value)}
              className="mt-1 w-32"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Qtd</label>
            <select
              value={tamanho}
              onChange={(e) => setTamanho(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            >
              {TAMANHOS_LOTE.map((v) => (
                <option key={v} value={String(v)}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              size="lg"
              onClick={() => {
                setPaginas({ contrato: 1, empenho: 1, ata: 1 });
                setResultado(null);
                buscarMutation.mutate({ pagina: 1 });
              }}
              disabled={buscarMutation.isPending}
              className="gap-2 text-sm"
            >
              {buscarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {buscarMutation.isPending ? "Buscando..." : "Buscar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => salvarPrefsMutation.mutate()}
              disabled={salvarPrefsMutation.isPending}
              title="Salvar preferências"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {prefs && (
          <span className="mt-2 inline-flex text-xs text-green-600 items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Preferências carregadas
          </span>
        )}
      </section>

      {/* Resumo */}
      {resultado && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-700">
            <strong className="text-lg text-blue-700">{fmtNum(totalGeral)}</strong> resultado{totalGeral !== 1 && "s"} encontrado{totalGeral !== 1 && "s"}
          </p>
          {resultado.filtrosUsados.ufs.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <Filter className="h-3 w-3" />
              {resultado.filtrosUsados.ufs.join(", ")}
            </span>
          )}
          {resultado.filtrosUsados.palavrasChave.map((p) => (
            <span
              key={p}
              className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Colunas por tipo */}
      {resultado && (
        <div className="grid gap-4 md:grid-cols-3">
          {TIPOS_DOC.map((config) => (
            <ColunaResultado
              key={config.id}
              config={config}
              dados={resultado.porTipo[config.id]}
              pagina={paginas[config.id] ?? 1}
              isPending={buscarMutation.isPending}
              onPaginaChange={handlePaginaChange}
              onImportar={(item) =>
                importarMutation.mutate({
                  ...item,
                  id: (item.raw as { numeroControlePNCP?: string }).numeroControlePNCP ?? "",
                })
              }
              importandoId={importandoId}
            />
          ))}
        </div>
      )}

      {/* Nenhum resultado */}
      {resultado && totalGeral === 0 && !buscarMutation.isPending && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
          <Info className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700">Nenhum resultado encontrado</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Tente outras palavras-chave ou remova os filtros de estado.
          </p>
        </div>
      )}
    </div>
  );
}
