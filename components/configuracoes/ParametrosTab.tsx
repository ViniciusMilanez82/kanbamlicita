"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ParametrosGeraisSubTab } from "./ParametrosGeraisSubTab";
import { CriteriosScoreSubTab } from "./CriteriosScoreSubTab";
import { RegrasAderenciaSubTab } from "./RegrasAderenciaSubTab";

const SUB_TABS = [
  { id: "gerais", label: "Parâmetros gerais" },
  { id: "score", label: "Critérios de score" },
  { id: "aderencia", label: "Regras de aderência" },
];

export function ParametrosTab() {
  const [subTab, setSubTab] = useState("gerais");

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Configure os parâmetros estratégicos que orientam a captação, qualificação e análise de licitações.
      </p>

      <div className="flex gap-1 mb-6 border-b">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              subTab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "gerais" && <ParametrosGeraisSubTab />}
      {subTab === "score" && <CriteriosScoreSubTab />}
      {subTab === "aderencia" && <RegrasAderenciaSubTab />}
    </div>
  );
}
