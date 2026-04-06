"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PNCP_DOCS } from "@/lib/pncp/constants";
import type { PncpContratoListaItem, PncpPreferenciasSalvas, PncpSituacao } from "@/lib/pncp/types";
import {

  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  HelpCircle,
  Info,
  Loader2,
  Save,
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
    return "Esse item já está no seu painel. Abra o Kanban para vê-lo.";
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

/* Cores para badges de tipo */
const TIPO_CORES: Record<string, string> = {
  Contrato: "bg-blue-100 text-blue-800",
  Empenho: "bg-amber-100 text-amber-800",
  Ata: "bg-emerald-100 text-emerald-800",
  Edital: "bg-purple-100 text-purple-800",
  Aviso: "bg-pink-100 text-pink-800",
  Aditivo: "bg-orange-100 text-orange-800",
  Outro: "bg-slate-100 text-slate-700",
};

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

type ItemComTipo = PncpContratoListaItem & {
  tipoDocumento?: string;
  situacao?: PncpSituacao;
  empresaContratada?: string | null;
  cnpjContratada?: string | null;
};

type Resultado = {
  itens: ItemComTipo[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  tiposDisponiveis: string[];
  filtrosUsados: { ufs: string[]; palavrasChave: string[] };
};

/* ------------------------------------------------------------------ */
/*  Componentes auxiliares                                             */
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
          <button type="button" onClick={() => setAberta(false)} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600">
            <X className="h-3 w-3" />
          </button>
          {children}
        </span>
      )}
    </span>
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
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [importandoId, setImportandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!prefs) return;
    if (prefs.ufs?.length) setUfsCsv(prefs.ufs.join(", "));
    if (prefs.palavrasChave?.length) setPalavras(prefs.palavrasChave.join(", "));
    if (prefs.tamanhoPagina) setTamanho(tamanhoLoteValido(prefs.tamanhoPagina));
  }, [prefs]);

  const buscarMutation = useMutation({
    mutationFn: async (overrides?: { pagina?: number }) => {
      const paginaReq = overrides?.pagina ?? pagina;
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
      return data as Resultado;
    },
    onSuccess: (data) => {
      setPagina(data.numeroPagina);
      setResultado(data);
    },
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
            ufs: ufsCsv.split(/[,;\s]+/).map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z]{2}$/.test(s)),
            palavrasChave: palavras.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
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

  // Filtrar itens por tipo no frontend
  const itensFiltrados = resultado
    ? filtroTipo
      ? resultado.itens.filter((i) => i.tipoDocumento === filtroTipo)
      : resultado.itens
    : [];

  // Contagem por tipo para os badges de filtro
  const contagemPorTipo: Record<string, number> = {};
  if (resultado) {
    for (const item of resultado.itens) {
      const t = item.tipoDocumento ?? "Outro";
      contagemPorTipo[t] = (contagemPorTipo[t] ?? 0) + 1;
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      {/* Banner */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <BookOpen className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Busca no PNCP</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Pesquise oportunidades abertas no Portal Nacional de Contratações Públicas.
              Apenas editais e avisos abertos para participação são exibidos.
            </p>
            <a
              href={PNCP_DOCS.site}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 transition-colors"
            >
              O que é o PNCP <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Formulário de busca */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">
              Palavras-chave
              <Dica>Escreva o que procura, separado por vírgula. Ex: container, equipamento portuário</Dica>
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              rows={2}
              placeholder="Ex: container, locação, equipamento"
              value={palavras}
              onChange={(e) => setPalavras(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">
                Estados
                <Dica>Siglas separadas por vírgula. Vazio = todos os estados.</Dica>
              </label>
              <Input
                placeholder="SP, RJ, MG"
                value={ufsCsv}
                onChange={(e) => setUfsCsv(e.target.value)}
                className="mt-1 w-40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Resultados</label>
              <select
                value={tamanho}
                onChange={(e) => setTamanho(e.target.value)}
                className="mt-1 flex h-9 w-24 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs outline-none focus:border-blue-400 transition-all"
              >
                {TAMANHOS_LOTE.map((v) => (
                  <option key={v} value={String(v)}>{v}</option>
                ))}
              </select>
            </div>
            <Button
              size="lg"
              onClick={() => {
                setPagina(1);
                setFiltroTipo("");
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
              variant="outline"
              size="sm"
              onClick={() => salvarPrefsMutation.mutate()}
              disabled={salvarPrefsMutation.isPending}
              title="Salvar preferências"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
            {prefs && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Salvo
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Resultados */}
      {resultado && (
        <>
          {/* Resumo + Filtros */}
          <section className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-2xl font-bold text-green-700">{fmtNum(resultado.totalRegistros)}</p>
                  <p className="text-sm text-slate-700">
                    oportunidade{resultado.totalRegistros !== 1 && "s"} aberta{resultado.totalRegistros !== 1 && "s"}
                    {resultado.filtrosUsados.palavrasChave.length > 0 &&
                      ` para "${resultado.filtrosUsados.palavrasChave.join(", ")}"`}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {resultado.filtrosUsados.ufs.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      <Filter className="h-3 w-3" />
                      {resultado.filtrosUsados.ufs.join(", ")}
                    </span>
                  )}
                  {resultado.filtrosUsados.palavrasChave.map((p) => (
                    <span key={p} className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Paginação */}
              {resultado.totalPaginas > 1 && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={buscarMutation.isPending || pagina <= 1}
                    onClick={() => buscarMutation.mutate({ pagina: pagina - 1 })}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="text-xs text-slate-500 px-2">{pagina}/{resultado.totalPaginas}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={buscarMutation.isPending || pagina >= resultado.totalPaginas}
                    onClick={() => buscarMutation.mutate({ pagina: pagina + 1 })}
                  >
                    Próximos <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Filtros por tipo */}
            {Object.keys(contagemPorTipo).length > 1 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroTipo("")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    !filtroTipo
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Todos ({resultado.itens.length})
                </button>
                {Object.entries(contagemPorTipo)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tipo, count]) => (
                    <button
                      key={tipo}
                      onClick={() => setFiltroTipo(filtroTipo === tipo ? "" : tipo)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        filtroTipo === tipo
                          ? "bg-blue-600 text-white"
                          : `${TIPO_CORES[tipo] ?? TIPO_CORES.Outro} ring-1 ring-slate-200 hover:opacity-80`
                      }`}
                    >
                      {tipo} ({count})
                    </button>
                  ))}
              </div>
            )}
          </section>

          {/* Lista de itens */}
          {itensFiltrados.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
              <Info className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                {filtroTipo
                  ? `Nenhum "${filtroTipo}" encontrado`
                  : "Nenhuma oportunidade aberta encontrada"}
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {filtroTipo
                  ? "Tente remover o filtro de tipo ou buscar com outras palavras."
                  : "Tente outras palavras-chave ou remova os filtros de estado."}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {itensFiltrados.map((row, idx) => (
              <div
                key={row.id}
                className="group rounded-xl border border-l-4 border-l-green-500 border-slate-200 bg-white p-4 shadow-sm hover:border-green-300 hover:shadow-md transition-all"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                        {(pagina - 1) * (Number(tamanho) || 20) + idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-900 leading-snug line-clamp-2">
                            {row.titulo}
                          </p>
                          {row.tipoDocumento && (
                            <Badge className={`shrink-0 text-[10px] ${TIPO_CORES[row.tipoDocumento] ?? TIPO_CORES.Outro}`}>
                              {row.tipoDocumento}
                            </Badge>
                          )}
                        </div>
                        {row.objeto !== row.titulo && row.objeto && (
                          <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{row.objeto}</p>
                        )}
                      </div>
                    </div>
                    {row.orgao && (
                      <p className="mt-1.5 ml-7 text-sm text-slate-600">{row.orgao}</p>
                    )}
                    <div className="mt-2 ml-7 flex flex-wrap items-center gap-2 text-xs">
                      {row.uf && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{row.uf}</span>
                      )}
                      {row.municipio && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{row.municipio}</span>
                      )}
                      {row.valorGlobal != null && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                          R$ {row.valorGlobal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {row.modalidade && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">{row.modalidade}</span>
                      )}
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
                          Ver no PNCP <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="shrink-0 gap-1.5"
                    disabled={importandoId === row.id}
                    onClick={() =>
                      importarMutation.mutate({
                        raw: row.raw,
                        urlPncp: row.urlPncp,
                        id: row.id,
                      })
                    }
                  >
                    {importandoId === row.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Adicionar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação inferior */}
          {resultado.totalPaginas > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={buscarMutation.isPending || pagina <= 1}
                onClick={() => buscarMutation.mutate({ pagina: pagina - 1 })}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="flex items-center px-3 text-xs text-slate-500">
                Página {pagina} de {fmtNum(resultado.totalPaginas)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={buscarMutation.isPending || pagina >= resultado.totalPaginas}
                onClick={() => buscarMutation.mutate({ pagina: pagina + 1 })}
              >
                Próximos <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
