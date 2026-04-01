import type { Conector, FonteConfig, ResultadoConector } from "./types";
import { buscarContratosPncp } from "@/lib/pncp/client";
import { searchItemToListaItem } from "@/lib/pncp/normalize";

// Tipos de documento do PNCP buscados separadamente
const TIPOS_DOCUMENTO_PNCP = ["contrato", "empenho", "ata"];

export class ConectorPncp implements Conector {
  async *buscar(fonte: FonteConfig): AsyncGenerator<ResultadoConector[]> {
    const tamanhoPagina = fonte.parametros.tamanhoPagina ?? 50;
    const paginasMaximas = fonte.parametros.paginasMaximas ?? 3;
    const palavrasChave = fonte.filtros.palavrasChave ?? [];
    const ufs = fonte.filtros.ufs ?? [];
    const tiposDocumento = fonte.filtros.tiposDocumento ?? TIPOS_DOCUMENTO_PNCP;

    const idsJaVistos = new Set<string>();
    const ufsSet = new Set(ufs.map((u: string) => u.toUpperCase()));

    // Iterar por cada tipo de documento (contrato, empenho, ata)
    for (const tipoDoc of tiposDocumento) {
      // Dentro de cada tipo, buscar cada palavra-chave separadamente
      for (const palavra of palavrasChave.length > 0 ? palavrasChave : [""]) {
        for (let pagina = 1; pagina <= paginasMaximas; pagina++) {
          const resposta = await buscarContratosPncp({
            palavrasChave: palavra,
            uf: ufs,
            pagina,
            tamanhoPagina,
            tipoDocumento: tipoDoc,
          });

          if (resposta.items.length === 0) break;

          // Filtrar por UF no lado do cliente (garantia extra)
          const itemsFiltrados = ufsSet.size > 0
            ? resposta.items.filter((item) => ufsSet.has((item.uf ?? "").toUpperCase()))
            : resposta.items;

          const resultados: ResultadoConector[] = [];

          for (const item of itemsFiltrados) {
            // Deduplicar entre tipos/palavras-chave
            if (idsJaVistos.has(item.numero_controle_pncp)) continue;
            idsJaVistos.add(item.numero_controle_pncp);

            const normalizado = searchItemToListaItem(item);
            resultados.push({
              identificadorExterno: `pncp:${item.numero_controle_pncp}`,
              dados: {
                titulo: normalizado.titulo,
                orgao: normalizado.orgao,
                objeto: normalizado.objeto,
                modalidade: `${normalizado.modalidade ?? tipoDoc.toUpperCase()}`,
                uf: normalizado.uf,
                municipio: normalizado.municipio,
                valorEstimado: normalizado.valorGlobal ?? undefined,
                dataPublicacao: normalizado.dataPublicacao ?? undefined,
                linkOrigem: normalizado.urlPncp ?? undefined,
              },
              dadosBrutos: { ...item as unknown as Record<string, unknown>, _tipoDocumento: tipoDoc },
            });
          }

          if (resultados.length > 0) yield resultados;

          if (resposta.items.length < tamanhoPagina) break;
        }
      }
    }
  }
}
