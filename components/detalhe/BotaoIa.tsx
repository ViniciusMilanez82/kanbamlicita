"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BotaoIaProps {
  licitacaoId: string;
  tipo: "triagem" | "analise" | "proposta" | "generico";
  label: string;
  onResult: (result: {
    tipo: string;
    resposta: string;
    respostaJson: Record<string, unknown> | null;
    modelo: string;
    acaoId: string;
  }) => void;
  disabled?: boolean;
}

export function BotaoIa({ licitacaoId, tipo, label, onResult, disabled }: BotaoIaProps) {
  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/ia/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licitacaoId, tipo }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao analisar");
      return data;
    },
    onSuccess: (data) => {
      onResult({
        tipo,
        resposta: data.resposta ?? "",
        respostaJson: data.respostaJson ?? null,
        modelo: data.modelo ?? "",
        acaoId: data.id ?? "",
      });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending || disabled}
      className="gap-1.5"
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
      )}
      {mutation.isPending ? "Analisando..." : label}
    </Button>
  );
}
