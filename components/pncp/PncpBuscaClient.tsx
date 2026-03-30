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
/*  Tipo do resultado                                                  */
/* ------------------------------------------------------------------ */

type Resultado = {
  itens: PncpContratoListaItem[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  totalFiltrados: number;
  filtrosUsados: { ufs: string[]; palavrasChave: string[] };
};

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

export function PncpBuscaClient() {
  const queryClient = useQueryClient();

  /* ---------- dados da empresa (preferências salvas) ---------- */
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

  /* ---------- estado do formulário ---------- */
  const [ufsCsv, setUfsCsv] = useState("");
  const [palavras, setPalavras] = useState("");
  const [tamanho, setTamanho] = useState("20");
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  /* preenche com preferências salvas */
  useEffect(() => {
    if (!prefs) return;
    if (prefs.ufs?.length) setUfsCsv(prefs.ufs.join(", "));
    if (prefs.palavrasChave?.length) setPalavras(prefs.palavrasChave.join(", "));
    if (prefs.tamanhoPagina) setTamanho(tamanhoLoteValido(prefs.tamanhoPagina));
  }, [prefs]);

  /* ---------- mutations ---------- */
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
      toast.success("Opções salvas! Na próxima vez elas já vêm preenchidas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importarMutation = useMutation({
    mutationFn: async (item: { raw: object; urlPncp?: string | null }) => {
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
      toast.success("Adicionado ao seu painel! Vá ao Kanban para acompanhar.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ---------- render ---------- */
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* ---- Banner explicativo ---- */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <BookOpen className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Encontre contratos publicados pelo governo
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              O governo publica todas as compras e contratações em um site chamado{" "}
              <strong>PNCP</strong> (Portal Nacional de Contratações Públicas). Aqui você pesquisa
              esses contratos <strong>sem precisar de cadastro no site do governo</strong> — basta
              estar logado neste sistema.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Digite o que você procura (ex: <em>container</em>, <em>manutenção predial</em>,{" "}
              <em>software</em>) e o sistema busca direto no governo, trazendo{" "}
              <strong>somente</strong> o que combina com sua busca.
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
              <a
                href={PNCP_DOCS.manuais}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 transition-colors"
              >
                Manuais do governo <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ---- PASSO 1: O que procura ---- */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <PassoHeader
          numero={1}
          titulo="O que você está procurando?"
          descricao="Digite palavras que descrevam o produto ou serviço que sua empresa oferece. O governo vai buscar contratos que contenham essas palavras."
        />
        <div className="ml-10 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">
              Palavras-chave
              <Dica>
                Escreva palavras que costumam aparecer nos contratos que interessam a sua
                empresa. Exemplos: &quot;container&quot;, &quot;locação equipamento&quot;,
                &quot;manutenção predial&quot;, &quot;licença software&quot;. Separe por vírgula
                se quiser buscar mais de uma coisa.
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
        </div>
      </section>

      {/* ---- PASSO 2: Filtros opcionais ---- */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <PassoHeader
          numero={2}
          titulo="Refine sua busca (opcional)"
          descricao="Se quiser, filtre por estados e escolha quantos resultados ver de cada vez."
        />
        <div className="ml-10 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">
              Filtrar por estados
              <Dica>
                Digite a sigla dos estados separada por vírgula. Exemplo: SP, RJ, MG. Se deixar
                em branco, busca em todos os estados do Brasil.
              </Dica>
            </label>
            <Input
              placeholder="Ex: SP, RJ, MG  (deixe vazio para todos)"
              value={ufsCsv}
              onChange={(e) => setUfsCsv(e.target.value)}
              className="mt-1 max-w-md"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Resultados por vez
              <Dica>
                Escolha quantos contratos quer ver de cada vez. Depois de buscar, use
                &quot;Anterior&quot; e &quot;Próximos&quot; para ver mais.
              </Dica>
            </label>
            <select
              value={tamanho}
              onChange={(e) => setTamanho(e.target.value)}
              className="mt-1 flex h-9 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            >
              {TAMANHOS_LOTE.map((v) => (
                <option key={v} value={String(v)}>
                  {v} contratos por vez
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ---- PASSO 3: Buscar ---- */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <PassoHeader
          numero={3}
          titulo="Buscar"
          descricao="Clique para consultar os contratos no site do governo."
        />
        <div className="ml-10 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => {
              setPagina(1);
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
            {buscarMutation.isPending
              ? "Buscando no governo..."
              : "Buscar contratos no governo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => salvarPrefsMutation.mutate()}
            disabled={salvarPrefsMutation.isPending}
            className="gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {salvarPrefsMutation.isPending ? "Salvando..." : "Lembrar minhas opções"}
          </Button>
          {prefs && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Opções salvas carregadas
            </span>
          )}
        </div>
      </section>

      {/* ---- Resultados ---- */}
      {resultado && (
        <>
          {/* Painel de resumo */}
          <section className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {resultado.totalRegistros === 0 ? (
                  <>
                    <p className="text-base font-semibold text-slate-900">
                      Nenhum contrato encontrado
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Tente outras palavras-chave ou remova os filtros de estado.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <p className="text-2xl font-bold text-blue-700">
                        {fmtNum(resultado.totalRegistros)}
                      </p>
                      <p className="text-sm text-slate-700">
                        contrato{resultado.totalRegistros !== 1 && "s"} encontrado
                        {resultado.totalRegistros !== 1 && "s"}
                        {resultado.filtrosUsados.palavrasChave.length > 0 &&
                          ` para "${resultado.filtrosUsados.palavrasChave.join(", ")}"`}
                      </p>
                    </div>
                    {/* Badges dos filtros */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {resultado.filtrosUsados.ufs.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          <Filter className="h-3 w-3" />
                          Estados: {resultado.filtrosUsados.ufs.join(", ")}
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
                    {resultado.totalPaginas > 1 && (
                      <p className="mt-2 text-xs text-slate-500">
                        Mostrando página {resultado.numeroPagina} de{" "}
                        {fmtNum(resultado.totalPaginas)} ({resultado.itens.length} contrato
                        {resultado.itens.length !== 1 && "s"} nesta página)
                      </p>
                    )}
                  </>
                )}
              </div>

              {resultado.totalRegistros > 0 && resultado.totalPaginas > 1 && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={buscarMutation.isPending || resultado.numeroPagina <= 1}
                    onClick={() =>
                      buscarMutation.mutate({
                        pagina: Math.max(1, resultado.numeroPagina - 1),
                      })
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-xs text-slate-500 px-2">
                    {resultado.numeroPagina}/{resultado.totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={
                      buscarMutation.isPending ||
                      resultado.numeroPagina >= resultado.totalPaginas
                    }
                    onClick={() =>
                      buscarMutation.mutate({ pagina: resultado.numeroPagina + 1 })
                    }
                  >
                    Próximos
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Lista vazia */}
          {resultado.itens.length === 0 && resultado.totalRegistros === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
              <Info className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Nenhum contrato encontrado
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Tente outras palavras-chave, remova os filtros de estado, ou escreva de forma
                diferente (ex: &quot;container&quot; ou &quot;contêiner&quot;).
              </p>
            </div>
          )}

          {/* Cards de resultado */}
          <div className="space-y-3">
            {resultado.itens.map((row, idx) => (
              <div
                key={row.id}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                        {(resultado.numeroPagina - 1) * (Number(tamanho) || 20) + idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 leading-snug line-clamp-2">
                          {row.titulo}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">
                          {row.objeto !== row.titulo && row.objeto}
                        </p>
                      </div>
                    </div>
                    <p className="mt-1.5 ml-7 text-sm text-slate-600">{row.orgao}</p>
                    <div className="mt-2 ml-7 flex flex-wrap items-center gap-2 text-xs">
                      {row.uf && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {row.uf}
                        </span>
                      )}
                      {row.municipio && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          {row.municipio}
                        </span>
                      )}
                      {row.valorGlobal != null && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                          R${" "}
                          {row.valorGlobal.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      {row.modalidade && (
                        <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">
                          {row.modalidade}
                        </span>
                      )}
                      {row.categoria && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                          {row.categoria}
                        </span>
                      )}
                      {row.dataPublicacao && (
                        <span className="text-slate-400">
                          Publicado em{" "}
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
                    disabled={importarMutation.isPending}
                    onClick={() => importarMutation.mutate({ raw: row.raw, urlPncp: row.urlPncp })}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Adicionar ao meu painel
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Navegação inferior */}
          {resultado.totalRegistros > 0 && resultado.totalPaginas > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={buscarMutation.isPending || resultado.numeroPagina <= 1}
                onClick={() =>
                  buscarMutation.mutate({
                    pagina: Math.max(1, resultado.numeroPagina - 1),
                  })
                }
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="flex items-center px-3 text-xs text-slate-500">
                Página {resultado.numeroPagina} de {fmtNum(resultado.totalPaginas)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={
                  buscarMutation.isPending ||
                  resultado.numeroPagina >= resultado.totalPaginas
                }
                onClick={() =>
                  buscarMutation.mutate({ pagina: resultado.numeroPagina + 1 })
                }
              >
                Próximos
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
