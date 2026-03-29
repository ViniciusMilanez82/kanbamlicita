"use client";

import { Input } from "@/components/ui/input";

interface FilterBarProps {
  busca: string;
  onBuscaChange: (v: string) => void;
}

export function FilterBar({ busca, onBuscaChange }: FilterBarProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <Input
        placeholder="Buscar por título, órgão ou objeto..."
        value={busca}
        onChange={(e) => onBuscaChange(e.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
