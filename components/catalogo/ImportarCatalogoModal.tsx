"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImportarCatalogoModalProps {
  onClose: () => void;
}

export function ImportarCatalogoModal({ onClose }: ImportarCatalogoModalProps) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/produtos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(`${data.importados} produtos importados!`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-2">Importar Catálogo com IA</h3>
        <p className="text-sm text-slate-500 mb-4">
          Cole o texto do seu catálogo, site, ou qualquer descrição dos seus produtos/serviços.
          A IA vai extrair e cadastrar automaticamente.
        </p>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm"
          rows={10}
          placeholder="Cole aqui o texto do catálogo, lista de produtos, página do site..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!texto || mutation.isPending} className="gap-1.5">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {mutation.isPending ? "Extraindo..." : "Importar com IA"}
          </Button>
        </div>
      </div>
    </div>
  );
}
