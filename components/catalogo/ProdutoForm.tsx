"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProdutoFormProps {
  onSave: (data: { nome: string; descricao: string; categoria: string; palavrasChave: string[] }) => void;
  onCancel: () => void;
}

export function ProdutoForm({ onSave, onCancel }: ProdutoFormProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [palavras, setPalavras] = useState("");

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500">Nome *</label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Descrição</label>
        <textarea className="w-full rounded border px-3 py-2 text-sm" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Categoria</label>
        <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Palavras-chave (separadas por vírgula)</label>
        <Input value={palavras} onChange={(e) => setPalavras(e.target.value)} placeholder="container, módulo, escritório" />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave({ nome, descricao, categoria, palavrasChave: palavras.split(",").map((p) => p.trim()).filter(Boolean) })} disabled={!nome}>
          Salvar
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
