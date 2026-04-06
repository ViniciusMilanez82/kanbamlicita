import { TopBar } from "@/components/layout/TopBar";
import { InteligenciaClient } from "@/components/inteligencia/InteligenciaClient";

export default function InteligenciaPage() {
  return (
    <>
      <TopBar title="Inteligencia Competitiva" />
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <InteligenciaClient />
      </div>
    </>
  );
}
