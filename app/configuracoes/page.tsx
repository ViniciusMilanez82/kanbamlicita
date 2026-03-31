"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { EmpresaForm } from "@/components/configuracoes/EmpresaForm";
import { ColunasEditor } from "@/components/configuracoes/ColunasEditor";
import { UsuariosTab } from "@/components/configuracoes/UsuariosTab";
import { IaConfigForm } from "@/components/configuracoes/IaConfigForm";
import { ParametrosTab } from "@/components/configuracoes/ParametrosTab";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "empresa", label: "Empresa" },
  { id: "ia", label: "Inteligência Artificial" },
  { id: "colunas", label: "Colunas do Kanban" },
  { id: "usuarios", label: "Usuários" },
  { id: "parametros", label: "Parâmetros" },
];

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "empresa");

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "empresa" && <EmpresaForm />}
      {tab === "ia" && <IaConfigForm />}
      {tab === "colunas" && <ColunasEditor />}
      {tab === "usuarios" && <UsuariosTab />}
      {tab === "parametros" && <ParametrosTab />}
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <>
      <TopBar title="Configurações" />
      <Suspense fallback={<div className="flex-1 p-6">Carregando...</div>}>
        <ConfiguracoesContent />
      </Suspense>
    </>
  );
}
