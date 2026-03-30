import { TopBar } from "@/components/layout/TopBar";
import { PncpBuscaClient } from "@/components/pncp/PncpBuscaClient";

export default function PncpPage() {
  return (
    <>
      <TopBar title="Contratos no governo" />
      <div className="flex-1 overflow-auto p-6">
        <PncpBuscaClient />
      </div>
    </>
  );
}
