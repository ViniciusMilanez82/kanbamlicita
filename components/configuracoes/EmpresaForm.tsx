"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function EmpresaForm() {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [segmento, setSegmento] = useState("");

  const { data: empresa } = useQuery({
    queryKey: ["empresa"],
    queryFn: () => fetch("/api/empresa").then((r) => r.json()),
  });

  useEffect(() => {
    if (empresa) {
      setNome(empresa.nome ?? "");
      setDescricao(empresa.descricao ?? "");
      setSegmento(empresa.segmento ?? "");
    }
  }, [empresa]);

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, segmento }),
      }).then((r) => r.json()),
    onSuccess: () => toast.success("Empresa atualizada!"),
  });

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-slate-500">
        Essas informações são usadas pela IA para analisar licitações em relação ao seu negócio.
      </p>
      <div>
        <label className="text-xs font-medium text-slate-500">Nome da Empresa</label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Descrição</label>
        <textarea className="w-full rounded border px-3 py-2 text-sm" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que sua empresa faz, quais serviços oferece..." />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Segmento</label>
        <Input value={segmento} onChange={(e) => setSegmento(e.target.value)} placeholder="Ex: Construção civil, TI, Saúde..." />
      </div>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        Salvar
      </Button>
    </div>
  );
}
