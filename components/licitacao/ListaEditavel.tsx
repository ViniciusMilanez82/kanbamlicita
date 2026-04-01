"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

type Props = {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
};

export function ListaEditavel({ label, items, onChange, placeholder }: Props) {
  const [novoItem, setNovoItem] = useState("");

  function adicionar() {
    const texto = novoItem.trim();
    if (!texto) return;
    onChange([...items, texto]);
    setNovoItem("");
  }

  function remover(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-1 text-sm bg-slate-50 rounded px-3 py-1.5">{item}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => remover(i)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          placeholder={placeholder ?? "Adicionar item..."}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={adicionar}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
