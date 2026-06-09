import { classificarStatus, type BoletimRow } from "./types";

/** Separa "Campo Mourão - PR" em município e UF. */
export function parseCidadeUf(cidade: string): {
  municipio: string | null;
  uf: string | null;
} {
  const t = (cidade ?? "").trim();
  if (!t) return { municipio: null, uf: null };
  const m = t.match(/^(.*?)\s*-\s*([A-Za-z]{2})$/);
  if (m) return { municipio: m[1].trim() || null, uf: m[2].toUpperCase() };
  return { municipio: t, uf: null };
}

/** Converte "R$ 532.600,00" em 532600.00. */
export function parseValorBR(valor: string): number | null {
  if (!valor) return null;
  const limpo = valor.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;
  // formato brasileiro: '.' separa milhar, ',' separa decimal
  const normalizado = limpo.replace(/\./g, "").replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrai a data (e hora) de campos como:
 * "Prazo: 19/06/2026, 13:59", "Abertura: 08/06/2026, 08:00",
 * "Documento: 13/06/2026, 00:00".
 */
export function parseDataDMY(texto: string): Date | null {
  if (!texto) return null;
  const m = texto.match(
    /(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/
  );
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  const d = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    hh ? Number(hh) : 0,
    min ? Number(min) : 0
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

const MESES: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  "março": 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

/**
 * A coluna data_publicacao vem em texto livre e bagunçado, ex.:
 * "02 de Junho Rio Grande do Sul", "28 de Maio". Tentamos extrair uma data;
 * quando não há ano, usamos o ano de referência.
 */
export function parseDataPublicacao(
  texto: string,
  anoRef = new Date().getFullYear()
): Date | null {
  if (!texto) return null;
  const dmy = parseDataDMY(texto);
  if (dmy) return dmy;
  const m = texto
    .toLowerCase()
    .match(/(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de\s+(\d{4}))?/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2]];
  if (mes === undefined) return null;
  const ano = m[3] ? Number(m[3]) : anoRef;
  const d = new Date(ano, mes, dia);
  return Number.isNaN(d.getTime()) ? null : d;
}

const MODALIDADE_PREFIXO: Record<string, string> = {
  PE: "Pregão Eletrônico",
  PP: "Pregão Presencial",
  PR: "Pregão",
  CR: "Concorrência",
  CC: "Concorrência",
  TP: "Tomada de Preços",
  CV: "Convite",
  DL: "Dispensa de Licitação",
  IN: "Inexigibilidade",
  LE: "Leilão",
  RDC: "RDC",
};

/** Deduz a modalidade a partir do prefixo do edital (ex.: "PE/63/2026"). */
export function modalidadeDoEdital(edital: string): string | null {
  if (!edital) return null;
  const m = edital.trim().toUpperCase().match(/^([A-Z]+)/);
  if (!m) return null;
  return MODALIDADE_PREFIXO[m[1]] ?? null;
}

/** Escolhe o primeiro site válido e o transforma em URL navegável. */
export function primeiroSiteValido(...sites: string[]): string | null {
  for (const raw of sites) {
    const s = (raw ?? "").trim();
    if (!s) continue;
    if (/^https?:\/\//i.test(s)) return s;
    // ex.: "www.licitacoes-e.com.br" → "https://www.licitacoes-e.com.br"
    if (/^[\w.-]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
  }
  return null;
}

/** Identificador estável para deduplicação dentro da fonte ConLicitação. */
export function dedupIdBoletim(row: BoletimRow): string {
  const conlic = (row.conlicitacao ?? "").trim();
  if (conlic) return `conlicitacao:${conlic}`;
  const edital = (row.edital ?? "").trim();
  const cidade = (row.cidade ?? "").trim();
  const base = `${edital}|${cidade}`.trim();
  return base !== "|"
    ? `conlicitacao:${base}`
    : `conlicitacao:${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type LicitacaoBoletim = {
  dedupId: string;
  titulo: string;
  orgao: string | null;
  objeto: string | null;
  modalidade: string | null;
  uf: string | null;
  municipio: string | null;
  valorEstimado: number | null;
  dataPublicacao: Date | null;
  dataSessao: Date | null;
  processo: string | null;
  numeroCompra: string | null;
  informacaoComplementar: string | null;
  linkSistemaOrigem: string | null;
  observacoes: string;
};

/**
 * Transforma uma linha do boletim nos campos de uma `Licitacao`.
 * Mantém o texto original importante em `informacaoComplementar` e o resto
 * deve ser guardado em `dadosExtraidos` pelo chamador.
 */
export function montarLicitacaoBoletim(row: BoletimRow): LicitacaoBoletim {
  const { municipio, uf } = parseCidadeUf(row.cidade);
  const objeto = (row.objeto ?? "").trim() || null;
  const unidade = (row.unidade ?? "").trim() || null;
  const edital = (row.edital ?? "").trim();
  const conlic = (row.conlicitacao ?? "").trim();
  const status = classificarStatus(row.status);

  const titulo =
    (objeto ?? unidade ?? edital ?? "Licitação ConLicitação").slice(0, 500) ||
    "Licitação ConLicitação";

  // informações extras úteis para a análise (texto longo)
  const partesInfo = [
    (row.sintese ?? "").trim(),
    (row.observacao ?? "").trim(),
  ].filter(Boolean);
  const informacaoComplementar = partesInfo.length
    ? partesInfo.join("\n\n")
    : null;

  // observação curta de origem
  const partesObs = [
    `Importado do boletim ConLicitação${conlic ? ` (nº ${conlic})` : ""}.`,
  ];
  if (status === "CONFERIR")
    partesObs.push("Triagem: CONFERIR — revisar antes de decidir.");
  if (row.motivo?.trim()) partesObs.push(`Motivo da triagem: ${row.motivo.trim()}.`);
  if (edital) partesObs.push(`Edital: ${edital}.`);

  return {
    dedupId: dedupIdBoletim(row),
    titulo,
    orgao: unidade,
    objeto,
    modalidade: modalidadeDoEdital(edital),
    uf,
    municipio,
    valorEstimado: parseValorBR(row.valor_estimado),
    dataPublicacao: parseDataPublicacao(row.data_publicacao),
    dataSessao: parseDataDMY(row.datas),
    processo: (row.processo ?? "").trim() || null,
    numeroCompra: edital || null,
    informacaoComplementar,
    linkSistemaOrigem: primeiroSiteValido(row.site1, row.site2),
    observacoes: partesObs.join(" "),
  };
}
