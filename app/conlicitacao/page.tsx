import { TopBar } from "@/components/layout/TopBar";
import { ConlicitacaoImportClient } from "@/components/conlicitacao/ConlicitacaoImportClient";

export default function ConlicitacaoPage() {
  return (
    <>
      <TopBar title="Boletim ConLicitação" />
      <div className="flex-1 overflow-auto p-6">
        <ConlicitacaoImportClient />
      </div>
    </>
  );
}
