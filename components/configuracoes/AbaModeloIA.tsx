"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

type Provider = "anthropic" | "openai" | "gemini" | "interna";

type ConfiguracaoPublica = {
  llmProvider: Provider;
  llmModelo: string | null;
  llmBaseUrl: string | null;
  apiKeyMascarada: string | null;
  temApiKey: boolean;
};

const OPCOES: {
  id: Provider;
  titulo: string;
  descricao: string;
  modeloSugerido: string;
  precisaUrl?: boolean;
}[] = [
  {
    id: "anthropic",
    titulo: "Anthropic (Claude)",
    descricao: "Modelos Claude da Anthropic. Pegue a chave em console.anthropic.com.",
    modeloSugerido: "claude-opus-4-7",
  },
  {
    id: "openai",
    titulo: "OpenAI (GPT)",
    descricao: "Modelos GPT da OpenAI. Pegue a chave em platform.openai.com.",
    modeloSugerido: "gpt-4o-mini",
  },
  {
    id: "gemini",
    titulo: "Google Gemini",
    descricao: "Modelos Gemini do Google. Pegue a chave em aistudio.google.com.",
    modeloSugerido: "gemini-1.5-pro",
  },
  {
    id: "interna",
    titulo: "LLM interna (servidor próprio)",
    descricao:
      "Para modelos rodando localmente (Ollama, LM Studio, vLLM…). Use a URL base compatível com OpenAI.",
    modeloSugerido: "llama3.1",
    precisaUrl: true,
  },
];

export function AbaModeloIA() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarChave, setMostrarChave] = useState(false);

  const [provider, setProvider] = useState<Provider>("anthropic");
  const [modelo, setModelo] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [chaveAtual, setChaveAtual] = useState<string | null>(null);
  const [temChave, setTemChave] = useState(false);
  const [novaChave, setNovaChave] = useState("");

  const opcao = OPCOES.find((o) => o.id === provider)!;

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await fetch("/api/configuracoes");
        if (!r.ok) throw new Error("Falha ao carregar");
        const j = (await r.json()) as { configuracao: ConfiguracaoPublica };
        if (cancelado) return;
        setProvider(j.configuracao.llmProvider);
        setModelo(j.configuracao.llmModelo ?? "");
        setBaseUrl(j.configuracao.llmBaseUrl ?? "");
        setChaveAtual(j.configuracao.apiKeyMascarada);
        setTemChave(j.configuracao.temApiKey);
      } catch {
        if (!cancelado) toast.error("Não conseguimos carregar suas configurações.");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function salvar() {
    setSalvando(true);
    try {
      const body: Record<string, unknown> = {
        llmProvider: provider,
        llmModelo: modelo || null,
        llmBaseUrl: opcao.precisaUrl ? baseUrl || null : null,
      };
      if (novaChave.trim().length > 0) body.llmApiKey = novaChave.trim();

      const r = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Não foi possível salvar.");
      }
      const j = (await r.json()) as { configuracao: ConfiguracaoPublica };
      setProvider(j.configuracao.llmProvider);
      setModelo(j.configuracao.llmModelo ?? "");
      setBaseUrl(j.configuracao.llmBaseUrl ?? "");
      setChaveAtual(j.configuracao.apiKeyMascarada);
      setTemChave(j.configuracao.temApiKey);
      setNovaChave("");
      toast.success("Configuração salva.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="text-sm text-slate-500">Carregando configurações…</div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Qual IA o sistema vai usar?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha o provedor de inteligência artificial e cadastre a chave de
          acesso. A chave fica guardada com segurança e nunca é exibida por
          inteiro depois de salva.
        </p>
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-700">
          Provedor
        </span>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPCOES.map((o) => {
            const ativo = provider === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setProvider(o.id)}
                className={
                  "rounded-lg border p-3 text-left transition " +
                  (ativo
                    ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                    : "border-slate-200 bg-white hover:border-slate-300")
                }
              >
                <div className="text-sm font-semibold text-slate-900">
                  {o.titulo}
                </div>
                <div className="mt-1 text-xs text-slate-500">{o.descricao}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="modelo"
          className="block text-sm font-medium text-slate-700"
        >
          Modelo
        </label>
        <Input
          id="modelo"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
          placeholder={opcao.modeloSugerido}
        />
        <p className="text-xs text-slate-500">
          Deixe em branco pra usar o sugerido ({opcao.modeloSugerido}).
        </p>
      </div>

      {opcao.precisaUrl ? (
        <div className="space-y-2">
          <label
            htmlFor="baseUrl"
            className="block text-sm font-medium text-slate-700"
          >
            URL base do servidor
          </label>
          <Input
            id="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434/v1"
          />
          <p className="text-xs text-slate-500">
            Endereço do servidor compatível com o protocolo OpenAI (Ollama,
            vLLM, LM Studio etc.). Inclua <code>/v1</code> no final.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="apiKey"
          className="block text-sm font-medium text-slate-700"
        >
          Chave de API
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="apiKey"
              type={mostrarChave ? "text" : "password"}
              value={novaChave}
              onChange={(e) => setNovaChave(e.target.value)}
              placeholder={
                temChave
                  ? `Atual: ${chaveAtual ?? "•••"} — digite uma nova pra trocar`
                  : "Cole sua chave aqui"
              }
              autoComplete="off"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setMostrarChave((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              aria-label={mostrarChave ? "Esconder chave" : "Mostrar chave"}
            >
              {mostrarChave ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {temChave
            ? "Já existe uma chave salva. Digite uma nova só se quiser substituir."
            : "Sem chave cadastrada — cadastre uma para o sistema poder gerar fichas com IA."}
        </p>
      </div>

      <div className="flex items-center gap-3 border-t pt-4">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
