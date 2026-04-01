"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Search,
} from "lucide-react";
import type { PetronectOportunidade } from "@/lib/fontes/conector-petronect";

type Resultado = {
  itens: PetronectOportunidade[];
  total: number;
  query: string;
};

function explicarErro(texto: string): string {
  const t = texto.trim();
  if (!t) return "Algo deu errado. Tente de novo daqui a pouco.";
  if (/fora do ar|502|Bad Gateway/i.test(t))
    return "O Petronect está fora do ar neste momento. Tente novamente mais tarde.";
  if (/incorretos|NotAuthorized/i.test(t))
    return "E-mail ou senha do Petronect incorretos. Verifique nas Configurações.";
  if (/credenciais|configurad/i.test(t)) return t;
  if (/409|já existe|já foi/i.test(t))
    return "Essa oportunidade já está no seu painel. Abra o Kanban para vê-la.";
  if (/expirad/i.test(t))
    return "A sessão expirou. Tente buscar novamente.";
  return t;
}

export function PetronectBuscaClient() {
  const queryClient = useQueryClient();
  const [palavras, setPalavras] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [importados, setImportados] = useState<Set<string>>(new Set());

  const buscarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/petronect/buscar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palavrasChave: palavras }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(explicarErro(String(data.error ?? "")));
      return data as Resultado;
    },
    onSuccess: (data) => setResultado(data),
    onError: (e: Error) => toast.error(e.message),
  });

  const importarMutation = useMutation({
    mutationFn: async (item: PetronectOportunidade) => {
      const r = await fetch("/api/licitacoes/petronect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: item }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(explicarErro(String(data.error ?? "")));
      return { data, opportNum: item.OPPORT_NUM };
    },
    onSuccess: ({ opportNum }) => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      setImportados((prev) => new Set(prev).add(opportNum));
      toast.success("Adicionado ao seu painel! Vá ao Kanban para acompanhar.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Banner */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100">
            <Building2 className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Oportunidades no Petronect
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              O <strong>Petronect</strong> é o portal de compras da Petrobras e
              suas subsidiárias. Aqui você busca oportunidades abertas de
              fornecimento usando suas palavras-chave.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              As credenciais de acesso são as configuradas na fonte Petronect em{" "}
              <strong>Configurações</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Busca */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
            1
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              O que você está procurando?
            </p>
            <p className="text-xs text-slate-500">
              Digite palavras que descrevam o produto ou serviço. Separe por
              vírgula para buscar vários termos.
            </p>
          </div>
        </div>
        <div className="ml-10 space-y-4">
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
            rows={2}
            placeholder="Ex: container, equipamento portuário, empilhadeira"
            value={palavras}
            onChange={(e) => setPalavras(e.target.value)}
          />
          <Button
            size="lg"
            onClick={() => buscarMutation.mutate()}
            disabled={buscarMutation.isPending}
            className="gap-2 text-sm bg-teal-600 hover:bg-teal-700"
          >
            {buscarMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {buscarMutation.isPending
              ? "Buscando no Petronect..."
              : "Buscar oportunidades"}
          </Button>
        </div>
      </section>

      {/* Resultados */}
      {resultado && (
        <>
          <section className="rounded-xl border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-white p-5">
            {resultado.total === 0 ? (
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Nenhuma oportunidade encontrada
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Tente outras palavras-chave ou aguarde novas publicações.
                </p>
              </div>
            ) : (
              <div className="flex items-baseline gap-4">
                <p className="text-2xl font-bold text-teal-700">
                  {resultado.total}
                </p>
                <p className="text-sm text-slate-700">
                  oportunidade{resultado.total !== 1 && "s"} encontrada
                  {resultado.total !== 1 && "s"}
                  {resultado.query && ` para "${resultado.query}"`}
                </p>
              </div>
            )}
          </section>

          {resultado.total === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
              <Info className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Nenhuma oportunidade encontrada
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Tente outras palavras-chave ou escreva de forma diferente.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {resultado.itens.map((item, idx) => {
              const jaImportado = importados.has(item.OPPORT_NUM);
              const uf = item.REGIONS?.[0]?.REGION;
              const regiao = item.REGIONS?.[0]?.REGION_DESCRIPTION;
              const titulo =
                item.DESC_OBJ_CONTRAT ||
                item.OPPORT_DESCR ||
                `Oportunidade ${item.OPPORT_NUM}`;

              return (
                <div
                  key={item.OPPORT_NUM ?? idx}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-200 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 leading-snug line-clamp-2">
                            {titulo}
                          </p>
                          {item.OPPORT_DESCR &&
                            item.OPPORT_DESCR !== titulo && (
                              <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">
                                {item.OPPORT_DESCR}
                              </p>
                            )}
                        </div>
                      </div>
                      {item.COMPANY_DESC && (
                        <p className="mt-1.5 ml-7 text-sm text-slate-600">
                          {item.COMPANY_DESC}
                        </p>
                      )}
                      <div className="mt-2 ml-7 flex flex-wrap items-center gap-2 text-xs">
                        {uf && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                            {uf}
                          </span>
                        )}
                        {regiao && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                            {regiao}
                          </span>
                        )}
                        {item.STATUS_DESC && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                            {item.STATUS_DESC}
                          </span>
                        )}
                        {item.OPPORT_TYPE && (
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">
                            {item.OPPORT_TYPE}
                          </span>
                        )}
                        {item.POSTING_DATE && (
                          <span className="text-slate-400">
                            Publicado em{" "}
                            {new Date(
                              item.POSTING_DATE + "T00:00:00"
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {item.END_DATE && (
                          <span className="text-slate-400">
                            Encerra em{" "}
                            {new Date(
                              item.END_DATE + "T00:00:00"
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {item.score != null && (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                            Relevância: {Math.round(item.score)}%
                          </span>
                        )}
                        <a
                          href="https://minhapetronect.com.br/oportunidadespublicas"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-teal-600 hover:underline"
                        >
                          Ver no Petronect{" "}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={jaImportado ? "outline" : "default"}
                      className={
                        jaImportado
                          ? "shrink-0 gap-1.5 border-green-300 text-green-700"
                          : "shrink-0 gap-1.5 bg-teal-600 hover:bg-teal-700"
                      }
                      disabled={importarMutation.isPending || jaImportado}
                      onClick={() => importarMutation.mutate(item)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {jaImportado ? "Adicionado" : "Adicionar ao painel"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
