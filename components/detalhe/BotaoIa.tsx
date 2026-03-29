"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BotaoIaProps {
  licitacaoId: string;
  tipo: "triagem" | "analise" | "proposta" | "generico";
  label: string;
  onResult: (result: Record<string, unknown>) => void;
}

export function BotaoIa({ licitacaoId, tipo, label, onResult }: BotaoIaProps) {
  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/ia/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licitacaoId, tipo }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: (data) => {
      toast.success("Análise IA concluída!");
      onResult(data.respostaJson ?? { resposta: data.resposta });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="gap-1.5"
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
      )}
      {label}
    </Button>
  );
}
