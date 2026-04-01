import { TopBar } from "@/components/layout/TopBar";
import { RelatoriosClient } from "@/components/relatorios/RelatoriosClient";

export default function RelatoriosPage() {
  return (
    <>
      <TopBar title="Relatórios" />
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <RelatoriosClient />
      </div>
    </>
  );
}
