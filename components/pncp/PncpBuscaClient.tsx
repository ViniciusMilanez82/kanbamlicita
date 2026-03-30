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
  HelpCircle,
  Info,
  Loader2,
  Save,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function explicarErro(texto: string): string {
  const t = texto.trim();
  if (!t) return "Algo deu errado. Tente de novo daqui a pouco.";
  if (/n[aã]o autenticado/i.test(t))
    return "Você precisa estar logado. Atualize a página (F5) e entre de novo.";
  if (/502|consultar pncp|falha ao consultar/i.test(t))
    return "O site do governo está fora do ar neste momento. Aguarde alguns minutos e tente de novo.";
  if (/409|já existe|já foi adicionad/i.test(t))
    return "Esse contrato já está no seu painel. Abra o Kanban para vê-lo.";
  return t;
}

function hojeYmd() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function diasAtrasYmd(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function ymdToInput(ymd: string) {
  if (!/^\d{8}$/.test(ymd)) return "";
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function inputToYmd(iso: string) {
  return iso.replace(/-/g, "");
}

const TAMANHOS_LOTE = [10, 20, 30, 40, 50] as const;

function tamanhoLoteValido(n: number): string {
  if (!Number.isFinite(n)) return "20";
  const r = Math.round(n / 10) * 10;
  return String(Math.min(50, Math.max(10, r)));
}

/* ------------------------------------------------------------------ */
/*  Dica contextual reutilizável                                       */
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
        <span className="absolute left-0 top-5 z-50 w-64 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-slate-700 shadow-lg">
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
/*  Passo explicativo                                                  */
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
  const [dataIni, setDataIni] = useState(() => ymdToInput(diasAtrasYmd(14)));
  const [dataFim, setDataFim] = useState(() => ymdToInput(hojeYmd()));
  const [ufsCsv, setUfsCsv] = useState("");
  const [palavras, setPalavras] = useState("");
  const [tamanho, setTamanho] = useState("20");
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<{
    itens: PncpContratoListaItem[];
    totalRegistros: number;
    totalPaginas: number;
    numeroPagina: number;
  } | null>(null);

  /* preenche com preferências salvas */
  useEffect(() => {
    if (!prefs) return;
    if (prefs.dataInicial) setDataIni(ymdToInput(prefs.dataInicial));
    if (prefs.dataFinal) setDataFim(ymdToInput(prefs.dataFinal));
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
          dataInicial: inputToYmd(dataIni),
          dataFinal: inputToYmd(dataFim),
          pagina: paginaReq,
          tamanhoPagina: Number(tamanho) || 20,
          ufsCsv,
          palavrasChaveTexto: palavras,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(explicarErro(String(data.error ?? "")));
      return data as {
        itens: PncpContratoListaItem[];
        totalRegistros: number;
        totalPaginas: number;
        numeroPagina: number;
      };
    },
    onSuccess: (data) => {
      setPagina(data.numeroPagina);
      setResultado(data);
      const n = data.itens.length;
      if (n === 0)
        toast.info("Nenhum resultado com esses filtros. Tente mudar as datas, estados ou palavras.");
      else
        toast.success(`${n} contrato${n > 1 ? "s" : ""} encontrado${n > 1 ? "s" : ""} nesta parte da lista.`);
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
            dataInicial: inputToYmd(dataIni),
            dataFinal: inputToYmd(dataFim),
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
      toast.success("Opções salvas! Na próxima vez elas já vêm preenchidas automaticamente.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importarMutation = useMutation({
    mutationFn: async (raw: object) => {
      const r = await fetch("/api/licitacoes/pncp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
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
              Quando encontrar algo interessante para a sua empresa, clique em{" "}
              <strong>&quot;Adicionar ao meu painel&quot;</strong> e o contrato vai direto para o seu Kanban,
              onde você pode acompanhar e tomar as próximas ações.
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

      {/* ---- PASSO 1: Período ---- */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <PassoHeader
          numero={1}
          titulo="Escolha o período"
          descricao="De quando até quando você quer ver contratos publicados? Quanto maior o período, mais resultados podem aparecer."
        />
        <div className="grid gap-4 sm:grid-cols-2 ml-10">
          <div>
            <label className="text-xs font-medium text-slate-600">
              A partir de
              <Dica>
                Data mais antiga que você quer procurar. Exemplo: se colocar 01/03/2026, vai
                mostrar contratos publicados de 1 de março em diante.
              </Dica>
            </label>
            <Input
              type="date"
              value={dataIni}
              onChange={(e) => setDataIni(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Até
              <Dica>
                Data mais recente. Normalmente é a data de hoje, mas você pode mudar se quiser
                ver só um mês específico, por exemplo.
              </Dica>
            </label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      {/* ---- PASSO 2: Filtros ---- */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <PassoHeader
          numero={2}
          titulo="Refine sua busca (opcional)"
          descricao="Se quiser, filtre por estados e por palavras que descrevam o que você procura. Esses campos não são obrigatórios — sem eles, você verá todos os contratos do período."
        />
        <div className="ml-10 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">
              Filtrar por estados
              <Dica>
                Digite a sigla dos estados separada por vírgula. Exemplo: SP, RJ, MG.
                Se deixar em branco, vêm contratos de todos os estados.
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
              Palavras-chave do que você procura
              <Dica>
                Escreva palavras que costumam aparecer nos contratos que interessam a sua
                empresa. Exemplo: se você vende containers, escreva &quot;container&quot;. Se vende
                serviço de TI, escreva &quot;informática, software, manutenção&quot;. Separe por vírgula.
              </Dica>
            </label>
            <textarea
              className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              rows={2}
              placeholder="Ex: container, locação, equipamento  (deixe vazio para ver tudo)"
              value={palavras}
              onChange={(e) => setPalavras(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Quantos resultados de cada vez
              <Dica>
                A lista do governo pode ter milhares de contratos. Aqui você escolhe quantos
                quer ver por vez. Depois de buscar, use os botões &quot;Anterior&quot; e &quot;Próximos&quot;
                para navegar.
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
          descricao="Clique para consultar os contratos no site do governo. Pode levar alguns segundos."
        />
        <div className="ml-10 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => {
              setPagina(1);
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
            {buscarMutation.isPending ? "Buscando..." : "Buscar contratos no governo"}
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
          {/* Barra de navegação */}
          <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            {resultado.totalRegistros <= 0 ? (
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Nenhum contrato nesse período.</span>{" "}
                Tente datas mais amplas ou mude os filtros.
              </p>
            ) : (
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  Parte {resultado.numeroPagina.toLocaleString("pt-BR")} de{" "}
                  {Math.max(resultado.totalPaginas, 1).toLocaleString("pt-BR")}
                </span>
                <span className="text-slate-500">
                  {" "}
                  — {resultado.totalRegistros.toLocaleString("pt-BR")} contrato
                  {resultado.totalRegistros !== 1 && "s"} no total
                </span>
              </p>
            )}
            {resultado.totalRegistros > 0 && resultado.totalPaginas > 1 && (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={buscarMutation.isPending || resultado.numeroPagina <= 1}
                  onClick={() =>
                    buscarMutation.mutate({ pagina: Math.max(1, resultado.numeroPagina - 1) })
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={
                    buscarMutation.isPending || resultado.numeroPagina >= resultado.totalPaginas
                  }
                  onClick={() => buscarMutation.mutate({ pagina: resultado.numeroPagina + 1 })}
                >
                  Próximos
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Lista vazia */}
          {resultado.itens.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
              <Info className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Nenhum contrato encontrado com esses filtros
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Tente remover os estados ou palavras-chave, ampliar o período de datas, ou clique
                em &quot;Próximos&quot; para ver outras partes da lista.
              </p>
            </div>
          )}

          {/* Cards de resultado */}
          <div className="space-y-3">
            {resultado.itens.map((row) => (
              <div
                key={row.id}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 leading-snug line-clamp-2">
                      {row.objeto || row.titulo}
                    </p>
                    <p className="mt-1.5 text-sm text-slate-600">{row.orgao}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {row.uf && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                          {row.uf}
                        </span>
                      )}
                      {row.municipio && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5">
                          {row.municipio}
                        </span>
                      )}
                      {row.valorGlobal != null && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                          R$ {row.valorGlobal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {row.categoria && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                          {row.categoria}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="shrink-0 gap-1.5"
                    disabled={importarMutation.isPending}
                    onClick={() => importarMutation.mutate(row.raw)}
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
                  buscarMutation.mutate({ pagina: Math.max(1, resultado.numeroPagina - 1) })
                }
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="flex items-center px-3 text-xs text-slate-500">
                Parte {resultado.numeroPagina} de {resultado.totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={
                  buscarMutation.isPending || resultado.numeroPagina >= resultado.totalPaginas
                }
                onClick={() => buscarMutation.mutate({ pagina: resultado.numeroPagina + 1 })}
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
