import { TopBar } from "@/components/layout/TopBar";
import { ProdutosList } from "@/components/catalogo/ProdutosList";

export default function CatalogoPage() {
  return (
    <>
      <TopBar title="Catálogo de Produtos e Serviços" />
      <div className="flex-1 overflow-auto p-6">
        <ProdutosList />
      </div>
    </>
  );
}
