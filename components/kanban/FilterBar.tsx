"use client";

import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export interface Filtros {
  busca: string;
  uf: string;
  modalidade: string;
  urgente: "todos" | "sim" | "nao";
}

interface FilterBarProps {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  ufs: string[];
  modalidades: string[];
}

export function FilterBar({ filtros, onChange, ufs, modalidades }: FilterBarProps) {
  const temFiltroAtivo =
    filtros.busca || filtros.uf || filtros.modalidade || filtros.urgente !== "todos";

  function limpar() {
    onChange({ busca: "", uf: "", modalidade: "", urgente: "todos" });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Busca por texto */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por cidade, edital, boletim, órgão, objeto..."
          value={filtros.busca}
          onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
          className="pl-8"
        />
      </div>

      {/* UF */}
      <select
        className="rounded-md border bg-white px-2.5 py-2 text-sm text-slate-600"
        value={filtros.uf}
        onChange={(e) => onChange({ ...filtros, uf: e.target.value })}
      >
        <option value="">Todos os estados</option>
        {ufs.map((uf) => (
          <option key={uf} value={uf}>{uf}</option>
        ))}
      </select>

      {/* Modalidade */}
      {modalidades.length > 0 && (
        <select
          className="rounded-md border bg-white px-2.5 py-2 text-sm text-slate-600"
          value={filtros.modalidade}
          onChange={(e) => onChange({ ...filtros, modalidade: e.target.value })}
        >
          <option value="">Todas as modalidades</option>
          {modalidades.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      )}

      {/* Urgente */}
      <select
        className="rounded-md border bg-white px-2.5 py-2 text-sm text-slate-600"
        value={filtros.urgente}
        onChange={(e) => onChange({ ...filtros, urgente: e.target.value as Filtros["urgente"] })}
      >
        <option value="todos">Urgência: todos</option>
        <option value="sim">Só urgentes</option>
        <option value="nao">Não urgentes</option>
      </select>

      {/* Limpar filtros */}
      {temFiltroAtivo && (
        <button
          onClick={limpar}
          className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" /> Limpar
        </button>
      )}
    </div>
  );
}
