import { TopBar } from "@/components/layout/TopBar";
import { PetronectBuscaClient } from "@/components/petronect/PetronectBuscaClient";

export default function PetronectPage() {
  return (
    <>
      <TopBar title="Oportunidades Petronect" />
      <div className="flex-1 overflow-auto p-6">
        <PetronectBuscaClient />
      </div>
    </>
  );
}
