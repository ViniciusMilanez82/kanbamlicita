"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";

interface CampoEditavelProps {
  label: string;
  valor: string | null;
  onSave: (valor: string) => void;
  multiline?: boolean;
}

export function CampoEditavel({ label, valor, onSave, multiline }: CampoEditavelProps) {
  const [editando, setEditando] = useState(false);
  const [temp, setTemp] = useState(valor ?? "");

  function salvar() {
    onSave(temp);
    setEditando(false);
  }

  function cancelar() {
    setTemp(valor ?? "");
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="mb-3">
        <label className="text-xs font-medium text-slate-500">{label}</label>
        {multiline ? (
          <textarea
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            rows={3}
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            autoFocus
          />
        ) : (
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            autoFocus
          />
        )}
        <div className="mt-1 flex gap-1">
          <button onClick={salvar} className="text-green-600 hover:text-green-800">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={cancelar} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group mb-3">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="flex items-start gap-1">
        <p className="text-sm text-slate-800">{valor || "—"}</p>
        <button
          onClick={() => setEditando(true)}
          className="invisible text-slate-400 hover:text-slate-600 group-hover:visible"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
