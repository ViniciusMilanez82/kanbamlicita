import type { PncpContratoListaItem, PncpContratoRaw } from "./types";

function idContrato(c: PncpContratoRaw): string {
  return (
    c.numeroControlePNCP ||
    c.numeroControlePncpCompra ||
    `${c.orgaoEntidade?.cnpj ?? "?"}-${c.processo ?? Date.now()}`
  );
}

export function toListaItem(c: PncpContratoRaw): PncpContratoListaItem {
  const objeto = (c.objetoContrato ?? "").replace(/\r\n/g, "\n").trim();
  const orgao = c.orgaoEntidade?.razaoSocial ?? "";
  return {
    id: idContrato(c),
    titulo: objeto.slice(0, 120) + (objeto.length > 120 ? "…" : "") || idContrato(c),
    orgao,
    objeto: objeto || orgao,
    uf: c.unidadeOrgao?.ufSigla ?? "",
    municipio: c.unidadeOrgao?.municipioNome ?? "",
    valorGlobal: typeof c.valorGlobal === "number" ? c.valorGlobal : null,
    dataPublicacao: c.dataPublicacaoPncp ?? null,
    categoria: c.categoriaProcesso?.nome ?? c.tipoContrato?.nome ?? "",
    raw: c,
  };
}

/** Filtro local: UFs (OR) e palavras-chave no texto (OR entre termos). */
export function filtrarContratos(
  itens: PncpContratoListaItem[],
  ufs: string[],
  termos: string[]
): PncpContratoListaItem[] {
  let out = itens;

  const ufsOk = ufs.map((u) => u.trim().toUpperCase()).filter(Boolean);
  if (ufsOk.length > 0) {
    out = out.filter((i) => ufsOk.includes(i.uf.toUpperCase()));
  }

  const kw = termos
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 1);
  if (kw.length > 0) {
    out = out.filter((i) => {
      const blob = `${i.objeto} ${i.orgao} ${i.categoria}`.toLowerCase();
      return kw.some((k) => blob.includes(k));
    });
  }

  return out;
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
