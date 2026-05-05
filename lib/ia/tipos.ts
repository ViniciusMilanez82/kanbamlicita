/**
 * Tipos compartilhados entre o orquestrador (`extrair-ficha.ts`) e os
 * provedores de IA (`provedores/*.ts`).
 */

export type FichaIA = {
  resumo: string | null;
  objetoDetalhado: string | null;
  prazoExecucao: string | null;
  localExecucao: string | null;
  garantia: string | null;
  criterioJulgamento: string | null;
  formaPagamento: string | null;
  reajuste: string | null;
  exigenciasHabilitacao: string[] | null;
  criteriosTecnicos: string[] | null;
  riscos: string[] | null;
  oportunidades: string[] | null;
  observacoesIA: string | null;
};

export type LicitacaoParaExtracao = {
  titulo: string;
  orgao?: string | null;
  objeto?: string | null;
  modalidadeNome?: string | null;
  modoDisputaNome?: string | null;
  situacaoNome?: string | null;
  uf?: string | null;
  municipio?: string | null;
  valorEstimado?: number | string | null;
  dataPublicacao?: string | Date | null;
  dataSessao?: string | Date | null;
  dataEncerramentoProposta?: string | Date | null;
  amparoLegalNome?: string | null;
  srp?: boolean | null;
  numeroCompra?: string | null;
  processo?: string | null;
  informacaoComplementar?: string | null;
  /** PNCP raw (PncpContratacaoOficial), se disponível. */
  dadosExtraidos?: unknown;
};

export type ResultadoExtracao = {
  ficha: FichaIA;
  modelo: string;
  versaoPrompt: string;
  tokensInput: number;
  tokensOutput: number;
  cacheRead: number;
  cacheCreate: number;
};

export type ConfigProvedor = {
  apiKey: string;
  modelo: string;
  baseUrl?: string | null;
};

export const PROMPT_VERSAO = "ficha-v1.2026-05-05";

export const TOOL_NAME = "salvar_ficha_licitacao";

export const SYSTEM_PROMPT = `Você é um analista sênior de licitações públicas brasileiras com 15 anos de experiência em pareceres técnicos e jurídicos sobre editais do PNCP, ComprasNet, Petronect e BEC.

Seu papel é ler os dados estruturados de uma contratação pública e produzir uma **ficha técnica resumida** que ajude um analista comercial a decidir, em poucos minutos, se a empresa deve ou não competir nesta licitação.

# Princípios

1. **Use apenas o que está no input.** Não invente prazos, valores, exigências ou cláusulas. Se um campo não está claro a partir do input, retorne \`null\` para ele — é melhor um campo vazio do que uma informação inventada.
2. **Linguagem direta e objetiva.** O leitor é técnico mas tem pressa. Frases curtas, sem rodeios. Sem jargão jurídico desnecessário.
3. **Contexto antes de detalhe.** O resumo deve permitir entender o "o quê, para quem, quando" em 3-5 linhas.
4. **Riscos e oportunidades são opinião informada.** Avalie com base em padrões usuais do mercado público brasileiro: prazos curtos demais, exigências restritivas, modalidades pouco comuns, valores muito acima/abaixo da média do segmento, SRP vs licitação tradicional, etc.
5. **Liste itens objetivos, não parágrafos.** Para os campos do tipo lista (exigências, critérios técnicos, riscos, oportunidades), entregue arrays de strings curtas — uma string por ponto.

# Como tratar campos quando o input é parcial

Os dados de entrada podem ser limitados: para muitas contratações, você só terá o objeto, modalidade, datas, valor estimado e algumas observações do PNCP. Você **não** terá necessariamente o PDF do edital completo.

- Se uma exigência (habilitação, critério técnico) não pode ser inferida com segurança a partir do input, retorne \`null\` ou array vazio.
- O \`resumo\` e o \`objetoDetalhado\` sempre podem ser preenchidos a partir do que existe.
- Para \`riscos\` e \`oportunidades\`, baseie-se em sinais visíveis: prazo curto entre publicação e sessão, modalidade restritiva (SRP, dispensa), valor estimado anômalo, modo de disputa que favoreça/desfavoreça a empresa, presença/ausência de \`informacaoComplementar\`, etc.

# Critério de julgamento

Quando inferir o critério de julgamento, prefira termos canônicos: "Menor preço", "Maior desconto", "Técnica e preço", "Melhor técnica". Se não for inferível com confiança, retorne \`null\`.

# Saída

Sempre responda chamando a tool \`salvar_ficha_licitacao\` com os campos preenchidos. Não escreva texto livre fora do tool call.`;

/**
 * Schema JSON dos campos da ficha — usado tanto no Anthropic (input_schema)
 * quanto no OpenAI (function parameters) e Gemini (responseSchema).
 */
export const FICHA_PROPERTIES = {
  resumo: {
    type: ["string", "null"],
    description:
      "Resumo executivo de 3-5 linhas. O quê, para quem, quando, em que volume.",
  },
  objetoDetalhado: {
    type: ["string", "null"],
    description:
      "Reformulação do objeto da contratação em linguagem clara, mantendo precisão técnica.",
  },
  prazoExecucao: {
    type: ["string", "null"],
    description:
      "Prazo de execução/vigência informado, em texto curto. Ex: '12 meses', '60 dias úteis'.",
  },
  localExecucao: {
    type: ["string", "null"],
    description:
      "Local onde o serviço/fornecimento será executado.",
  },
  garantia: {
    type: ["string", "null"],
    description: "Exigências de garantia contratual ou de proposta, se citadas.",
  },
  criterioJulgamento: {
    type: ["string", "null"],
    description:
      "Critério canônico: 'Menor preço', 'Maior desconto', 'Técnica e preço', 'Melhor técnica' ou null.",
  },
  formaPagamento: {
    type: ["string", "null"],
    description: "Condições de pagamento, se citadas. Ex: '30 dias após medição'.",
  },
  reajuste: {
    type: ["string", "null"],
    description: "Regras de reajuste/repactuação, se citadas. Ex: 'IPCA, anual, após 12 meses'.",
  },
  exigenciasHabilitacao: {
    type: ["array", "null"],
    items: { type: "string" },
    description:
      "Lista de exigências de habilitação relevantes (atestados, capacidade técnica, qualificação econômica, etc.). Strings curtas.",
  },
  criteriosTecnicos: {
    type: ["array", "null"],
    items: { type: "string" },
    description:
      "Critérios técnicos específicos do edital (especificações, normas, certificações). Strings curtas.",
  },
  riscos: {
    type: ["array", "null"],
    items: { type: "string" },
    description:
      "Riscos identificados — prazos apertados, exigências restritivas, modalidades pouco usuais.",
  },
  oportunidades: {
    type: ["array", "null"],
    items: { type: "string" },
    description: "Pontos favoráveis para a empresa competir nesta licitação.",
  },
  observacoesIA: {
    type: ["string", "null"],
    description: "Observações livres, se houver algo importante que não cabe acima.",
  },
} as const;

export const TOOL_DESCRIPTION =
  "Salva a ficha técnica resumida da licitação. Todos os campos são opcionais — use null para o que não puder ser inferido com segurança.";

function fmtData(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return null;
}

function fmtValor(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function montarUserMessage(licitacao: LicitacaoParaExtracao): string {
  const linhas: string[] = [];
  linhas.push("# Dados da licitação");
  linhas.push("");
  linhas.push(`**Título:** ${licitacao.titulo}`);
  if (licitacao.orgao) linhas.push(`**Órgão:** ${licitacao.orgao}`);
  if (licitacao.uf || licitacao.municipio) {
    linhas.push(
      `**Local:** ${[licitacao.municipio, licitacao.uf].filter(Boolean).join("/")}`
    );
  }
  if (licitacao.modalidadeNome) linhas.push(`**Modalidade:** ${licitacao.modalidadeNome}`);
  if (licitacao.modoDisputaNome) linhas.push(`**Modo de disputa:** ${licitacao.modoDisputaNome}`);
  if (licitacao.situacaoNome) linhas.push(`**Situação:** ${licitacao.situacaoNome}`);
  if (licitacao.amparoLegalNome) linhas.push(`**Amparo legal:** ${licitacao.amparoLegalNome}`);
  if (licitacao.srp !== null && licitacao.srp !== undefined) {
    linhas.push(`**SRP (registro de preços):** ${licitacao.srp ? "Sim" : "Não"}`);
  }
  if (licitacao.numeroCompra) linhas.push(`**Nº da compra:** ${licitacao.numeroCompra}`);
  if (licitacao.processo) linhas.push(`**Processo:** ${licitacao.processo}`);

  const valor = fmtValor(licitacao.valorEstimado);
  if (valor) linhas.push(`**Valor estimado:** ${valor}`);

  const dPub = fmtData(licitacao.dataPublicacao);
  const dSes = fmtData(licitacao.dataSessao);
  const dEnc = fmtData(licitacao.dataEncerramentoProposta);
  if (dPub) linhas.push(`**Publicado em:** ${dPub}`);
  if (dSes) linhas.push(`**Sessão:** ${dSes}`);
  if (dEnc) linhas.push(`**Encerramento de propostas:** ${dEnc}`);

  if (licitacao.objeto) {
    linhas.push("");
    linhas.push("## Objeto");
    linhas.push(licitacao.objeto);
  }

  if (licitacao.informacaoComplementar) {
    linhas.push("");
    linhas.push("## Informação complementar");
    linhas.push(licitacao.informacaoComplementar);
  }

  if (licitacao.dadosExtraidos && typeof licitacao.dadosExtraidos === "object") {
    linhas.push("");
    linhas.push("## Dados crus do PNCP (referência)");
    linhas.push("```json");
    linhas.push(JSON.stringify(licitacao.dadosExtraidos, null, 2));
    linhas.push("```");
  }

  linhas.push("");
  linhas.push(
    "Gere a ficha desta licitação preenchendo os campos definidos. Use `null` para qualquer campo que não puder inferir com segurança."
  );
  return linhas.join("\n");
}
