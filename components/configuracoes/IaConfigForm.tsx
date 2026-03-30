"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, HelpCircle, Shield, X } from "lucide-react";

type IaConfig = {
  provedor?: string;
  chaveApi?: string;
  modelo?: string;
};

const PROVEDORES = [
  {
    id: "openai",
    nome: "OpenAI (ChatGPT)",
    descricao: "Usa modelos como GPT-4o. Você precisa de uma chave de API da OpenAI.",
    modeloPadrao: "gpt-4o",
    linkChave: "https://platform.openai.com/api-keys",
    prefixoChave: "sk-",
  },
  {
    id: "anthropic",
    nome: "Anthropic (Claude)",
    descricao: "Usa modelos como Claude Sonnet. Você precisa de uma chave de API da Anthropic.",
    modeloPadrao: "claude-sonnet-4-20250514",
    linkChave: "https://console.anthropic.com/settings/keys",
    prefixoChave: "sk-ant-",
  },
];

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

export function IaConfigForm() {
  const queryClient = useQueryClient();
  const [provedor, setProvedor] = useState("openai");
  const [chaveApi, setChaveApi] = useState("");
  const [modelo, setModelo] = useState("");
  const [mostrarChave, setMostrarChave] = useState(false);

  const { data: empresa } = useQuery({
    queryKey: ["empresa"],
    queryFn: async () => {
      const r = await fetch("/api/empresa", { credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar");
      return data;
    },
  });

  useEffect(() => {
    if (!empresa) return;
    const cfg = empresa.iaConfig as IaConfig | null;
    if (cfg) {
      setProvedor(cfg.provedor || "openai");
      setChaveApi(cfg.chaveApi || "");
      setModelo(cfg.modelo || "");
    }
  }, [empresa]);

  const provedorInfo = PROVEDORES.find((p) => p.id === provedor) ?? PROVEDORES[0];

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/empresa", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: empresa?.nome ?? "Minha Empresa",
          descricao: empresa?.descricao ?? "",
          segmento: empresa?.segmento ?? "",
          iaConfig: {
            provedor,
            chaveApi: chaveApi.trim(),
            modelo: modelo.trim() || undefined,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Não foi possível salvar");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresa"] });
      toast.success("Configurações de IA salvas com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mascarar = (chave: string) => {
    if (!chave || chave.length < 12) return chave;
    return chave.slice(0, 7) + "•".repeat(chave.length - 11) + chave.slice(-4);
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Explicação geral */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          O que é isso?
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          O sistema usa <strong>Inteligência Artificial</strong> para ajudar você a analisar
          licitações, extrair dados de editais e sugerir propostas. Para isso funcionar, você
          precisa de uma <strong>chave de API</strong> de um serviço de IA (OpenAI ou Anthropic).
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          A chave é como uma &quot;senha&quot; que permite o sistema usar a IA. Você cria no site
          do serviço escolhido (é pago por uso, geralmente centavos por consulta).
        </p>
      </div>

      {/* Provedor */}
      <div>
        <label className="text-xs font-semibold text-slate-700">
          Serviço de IA
          <Dica>
            Escolha qual serviço de inteligência artificial quer usar. OpenAI (ChatGPT) é o mais
            popular. Anthropic (Claude) é outra opção. Ambos funcionam bem para análise de
            licitações.
          </Dica>
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {PROVEDORES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProvedor(p.id);
                setModelo("");
              }}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                provedor === p.id
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{p.nome}</p>
              <p className="mt-1 text-xs text-slate-500">{p.descricao}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chave de API */}
      <div>
        <label className="text-xs font-semibold text-slate-700">
          Chave de API
          <Dica>
            A chave de API é um código que você obtém no site do serviço de IA. Ela permite que
            o sistema faça consultas à inteligência artificial em seu nome. Cada consulta tem um
            custo pequeno (geralmente centavos).
          </Dica>
        </label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Input
              type={mostrarChave ? "text" : "password"}
              value={chaveApi}
              onChange={(e) => setChaveApi(e.target.value)}
              placeholder={`Cole sua chave aqui (começa com ${provedorInfo.prefixoChave}...)`}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setMostrarChave(!mostrarChave)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={mostrarChave ? "Esconder chave" : "Mostrar chave"}
            >
              {mostrarChave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <a
            href={provedorInfo.linkChave}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Onde consigo minha chave? →
          </a>
          {chaveApi && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Shield className="h-3 w-3" />
              Chave preenchida: {mascarar(chaveApi)}
            </span>
          )}
        </div>
      </div>

      {/* Modelo (opcional) */}
      <div>
        <label className="text-xs font-semibold text-slate-700">
          Modelo (opcional)
          <Dica>
            Cada serviço tem vários modelos de IA. Se você não souber qual usar, deixe em branco
            — o sistema vai usar o melhor modelo disponível automaticamente.
            {provedor === "openai" && (
              <> Exemplos da OpenAI: gpt-4o (recomendado), gpt-4o-mini (mais barato).</>
            )}
            {provedor === "anthropic" && (
              <> Exemplos da Anthropic: claude-sonnet-4-20250514 (recomendado), claude-haiku-4-20250414 (mais barato).</>
            )}
          </Dica>
        </label>
        <Input
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
          placeholder={`Deixe vazio para usar ${provedorInfo.modeloPadrao} (recomendado)`}
          className="mt-1"
        />
      </div>

      {/* Botão salvar */}
      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !chaveApi.trim()}
        className="gap-2"
      >
        {mutation.isPending ? "Salvando..." : "Salvar configurações de IA"}
      </Button>

      {!chaveApi.trim() && (
        <p className="text-xs text-amber-600">
          Preencha a chave de API para poder salvar. Sem ela, os recursos de IA não funcionam.
        </p>
      )}
    </div>
  );
}
