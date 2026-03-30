export const SYSTEM_PROPOSTA = `Você é um especialista em estratégia comercial e estruturação de propostas para licitações públicas brasileiras.

Sua função é sugerir uma linha de proposta competitiva e realista com base nos dados disponíveis, sem inventar exigências que não apareçam no material.

Você deve:
- sugerir apenas produtos/serviços compatíveis com a empresa;
- considerar participação total, parcial, por lote ou por parceria;
- destacar pontos fortes concretos;
- alertar sobre riscos documentais, técnicos e comerciais;
- evitar generalidades.

Retorne APENAS JSON válido. Não use markdown. Não escreva explicações fora do JSON.`;

export function buildPromptProposta(
  licitacao: { titulo: string; objeto: string | null; observacoes?: string | null; dadosExtraidos: unknown },
  produtos: { nome: string; descricao: string | null; categoria?: string | null }[],
  empresa: { nome: string; descricao?: string | null; segmento: string | null },
  analisePrevia?: unknown
): string {
  const catalogoJson = JSON.stringify(
    produtos.map((p) => ({ nome: p.nome, descricao: p.descricao, categoria: (p as Record<string, unknown>).categoria })),
    null,
    2
  );

  const analiseBlock = analisePrevia
    ? `\nANÁLISE PRÉVIA:\n${JSON.stringify(analisePrevia, null, 2)}`
    : "";

  return `Monte uma sugestão de proposta para a licitação abaixo.

EMPRESA:
- Nome: ${empresa.nome}
- Segmento: ${empresa.segmento ?? "não informado"}
- Descrição: ${empresa.descricao ?? "não informada"}

CATÁLOGO DE PRODUTOS/SERVIÇOS:
${catalogoJson}

LICITAÇÃO:
- Título: ${licitacao.titulo}
- Objeto: ${licitacao.objeto ?? "não informado"}
- Observações: ${licitacao.observacoes ?? "nenhuma"}
- Dados extraídos: ${JSON.stringify(licitacao.dadosExtraidos ?? {})}
${analiseBlock}

Tarefa:
Sugira como a empresa poderia estruturar uma proposta competitiva, considerando:
- participação total ou parcial
- lotes/itens prioritários, se existirem
- produtos/serviços mais aderentes
- diferenciais competitivos
- documentação e cuidados
- estratégia comercial resumida

Retorne este JSON:
{
  "tipoParticipacaoSugerida": "TOTAL|PARCIAL|POR_LOTE|PARCERIA|SUBFORNECIMENTO|NAO_RECOMENDADO",
  "produtosSugeridos": [
    { "nome": "string", "motivo": "string" }
  ],
  "lotesOuItensPrioritarios": [
    { "identificador": "string", "motivo": "string" }
  ],
  "pontosFortes": ["string"],
  "documentacaoNecessaria": ["string"],
  "estrategia": "texto de 2 a 4 frases",
  "cuidados": ["string"],
  "proximoMovimentoComercial": ["string"]
}`;
}
