import { TopBar } from "@/components/layout/TopBar";
import { AtestadosClient } from "@/components/atestados/AtestadosClient";

export default function AtestadosPage() {
  return (
    <>
      <TopBar title="Atestados Técnicos" />
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <AtestadosClient />
      </div>
    </>
  );
}
