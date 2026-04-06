import type { PncpContratoListaItem } from "./types";
import type { PncpSearchItem } from "./client";

/**
 * Converte um item da API de busca do PNCP para o formato interno.
 */
export function searchItemToListaItem(item: PncpSearchItem): PncpContratoListaItem {
  const objeto = (item.description ?? "").replace(/\r\n/g, "\n").trim();
  const titulo = item.title ?? "";

  return {
    id: item.id ?? item.numero_controle_pncp ?? `${item.orgao_cnpj}-${item.ano}-${item.numero_sequencial}`,
    titulo: titulo || objeto.slice(0, 120) + (objeto.length > 120 ? "…" : ""),
    orgao: item.orgao_nome ?? "",
    objeto: objeto || titulo,
    uf: item.uf ?? "",
    municipio: item.municipio_nome ?? "",
    valorGlobal: typeof item.valor_global === "number" ? item.valor_global : null,
    dataPublicacao: item.data_publicacao_pncp ?? null,
    categoria: item.tipo_contrato_nome ?? item.tipo_nome ?? "",
    modalidade: item.modalidade_licitacao_nome ?? "",
    esfera: item.esfera_nome ?? "",
    urlPncp: item.item_url ? `https://pncp.gov.br/app${item.item_url}` : null,
    raw: {
      // Mapeia para o formato PncpContratoRaw para compatibilidade com a importação
      numeroControlePNCP: item.numero_controle_pncp,
      objetoContrato: objeto,
      dataPublicacaoPncp: item.data_publicacao_pncp,
      valorGlobal: item.valor_global ?? undefined,
      orgaoEntidade: {
        cnpj: item.orgao_cnpj,
        razaoSocial: item.orgao_nome,
      },
      unidadeOrgao: {
        ufSigla: item.uf,
        municipioNome: item.municipio_nome,
        nomeUnidade: item.unidade_nome,
      },
      categoriaProcesso: {
        nome: item.tipo_contrato_nome,
      },
      tipoContrato: {
        nome: item.tipo_nome,
      },
    },
  };
}

export function parsePalavrasChave(texto: string): string[] {
  return texto
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseUfsCsv(texto: string): string[] {
  return texto
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));
}
