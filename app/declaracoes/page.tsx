import { TopBar } from "@/components/layout/TopBar";
import { DeclaracoesClient } from "@/components/declaracoes/DeclaracoesClient";

export default function DeclaracoesPage() {
  return (
    <>
      <TopBar title="Declarações" />
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <DeclaracoesClient />
      </div>
    </>
  );
}
