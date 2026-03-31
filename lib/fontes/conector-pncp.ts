import type { Conector, FonteConfig, ResultadoConector } from "./types";
import { buscarContratosPncp } from "@/lib/pncp/client";
import { searchItemToListaItem } from "@/lib/pncp/normalize";

export class ConectorPncp implements Conector {
  async *buscar(fonte: FonteConfig): AsyncGenerator<ResultadoConector[]> {
    const tamanhoPagina = fonte.parametros.tamanhoPagina ?? 50;
    const paginasMaximas = fonte.parametros.paginasMaximas ?? 3;
    const palavrasChave = fonte.filtros.palavrasChave?.join(" ") ?? "";
    const ufs = fonte.filtros.ufs ?? [];

    for (let pagina = 1; pagina <= paginasMaximas; pagina++) {
      const resposta = await buscarContratosPncp({
        palavrasChave,
        uf: ufs,
        pagina,
        tamanhoPagina,
      });

      if (resposta.items.length === 0) break;

      const resultados: ResultadoConector[] = resposta.items.map((item) => {
        const normalizado = searchItemToListaItem(item);
        return {
          identificadorExterno: `pncp:${item.numero_controle_pncp}`,
          dados: {
            titulo: normalizado.titulo,
            orgao: normalizado.orgao,
            objeto: normalizado.objeto,
            modalidade: normalizado.modalidade ?? undefined,
            uf: normalizado.uf,
            municipio: normalizado.municipio,
            valorEstimado: normalizado.valorGlobal ?? undefined,
            dataPublicacao: normalizado.dataPublicacao ?? undefined,
            linkOrigem: normalizado.urlPncp ?? undefined,
          },
          dadosBrutos: item as unknown as Record<string, unknown>,
        };
      });

      yield resultados;

      if (resposta.items.length < tamanhoPagina) break;
    }
  }
}
