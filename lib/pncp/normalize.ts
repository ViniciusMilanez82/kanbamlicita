import type {
  PncpContratoListaItem,
  PncpContratacaoOficial,
} from "./types";
import type { PncpSearchItem } from "./client";
import { urlEditalPncp } from "./url";

/**
 * Mescla dados do /api/search/ (descoberta por palavra-chave) com o objeto
 * oficial de /api/consulta/v1 (campos completos e estáveis). O oficial é a
 * fonte primária quando disponível; o search é fallback.
 */
export function searchItemToListaItem(
  item: PncpSearchItem,
  oficial?: PncpContratacaoOficial | null
): PncpContratoListaItem {
  const objeto = (oficial?.objetoCompra ?? item.description ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
  const titulo = item.title ?? "";

  const numeroControle =
    oficial?.numeroControlePNCP ??
    item.numero_controle_pncp ??
    `${item.orgao_cnpj}-${item.ano}-${item.numero_sequencial}`;

  const valorEstimado =
    typeof oficial?.valorTotalEstimado === "number"
      ? oficial.valorTotalEstimado
      : null;
  const valorHomologado =
    typeof oficial?.valorTotalHomologado === "number"
      ? oficial.valorTotalHomologado
      : null;
  const valorSearchFallback =
    typeof item.valor_global === "number" ? item.valor_global : null;

  const raw: PncpContratacaoOficial = oficial ?? {
    numeroControlePNCP: item.numero_controle_pncp,
    objetoContrato: objeto,
    objetoCompra: objeto,
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
    categoriaProcesso: { nome: item.tipo_contrato_nome },
    tipoContrato: { nome: item.tipo_nome },
  };

  return {
    id: item.id ?? numeroControle,
    titulo:
      titulo || objeto.slice(0, 120) + (objeto.length > 120 ? "…" : ""),
    orgao: oficial?.orgaoEntidade?.razaoSocial ?? item.orgao_nome ?? "",
    objeto: objeto || titulo,
    uf: oficial?.unidadeOrgao?.ufSigla ?? item.uf ?? "",
    municipio:
      oficial?.unidadeOrgao?.municipioNome ?? item.municipio_nome ?? "",
    valorEstimado,
    valorHomologado,
    valorGlobal: valorEstimado ?? valorSearchFallback,
    dataPublicacao:
      oficial?.dataPublicacaoPncp ?? item.data_publicacao_pncp ?? null,
    dataAberturaProposta: oficial?.dataAberturaProposta ?? null,
    dataEncerramentoProposta: oficial?.dataEncerramentoProposta ?? null,
    modalidadeId: oficial?.modalidadeId ?? null,
    modalidadeNome:
      oficial?.modalidadeNome ?? item.modalidade_licitacao_nome ?? "",
    modoDisputaNome: oficial?.modoDisputaNome ?? null,
    situacaoId: oficial?.situacaoCompraId ?? null,
    situacaoNome: oficial?.situacaoCompraNome ?? item.situacao_nome ?? null,
    tipoInstrumentoConvocatorioNome:
      oficial?.tipoInstrumentoConvocatorioNome ?? null,
    srp: oficial?.srp === true,
    amparoLegalCodigo: oficial?.amparoLegal?.codigo ?? null,
    amparoLegalNome: oficial?.amparoLegal?.nome ?? null,
    processo: oficial?.processo ?? null,
    numeroCompra: oficial?.numeroCompra ?? null,
    informacaoComplementar: oficial?.informacaoComplementar ?? null,
    linkSistemaOrigem:
      typeof oficial?.linkSistemaOrigem === "string" &&
      oficial.linkSistemaOrigem.startsWith("http")
        ? oficial.linkSistemaOrigem
        : null,
    urlPncp: urlEditalPncp(numeroControle),
    raw,
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
