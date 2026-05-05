"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ConfiguracoesTabs, type AbaConfig } from "@/components/configuracoes/Tabs";
import { AbaModeloIA } from "@/components/configuracoes/AbaModeloIA";
import { AbaColunasKanban } from "@/components/configuracoes/AbaColunasKanban";

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<AbaConfig>("ia");

  return (
    <>
      <TopBar title="Configurações" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <ConfiguracoesTabs ativa={aba} onChange={setAba} />
          <div className="pt-6">
            {aba === "ia" ? <AbaModeloIA /> : <AbaColunasKanban />}
          </div>
        </div>
      </div>
    </>
  );
}
