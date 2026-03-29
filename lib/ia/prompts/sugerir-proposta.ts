export const SYSTEM_PROPOSTA = `Você é um especialista em propostas para licitações públicas brasileiras.
Ajude a montar uma proposta competitiva baseada nos dados disponíveis.
Retorne APENAS JSON válido, sem markdown.`;

export function buildPromptProposta(
  licitacao: { titulo: string; objeto: string | null; dadosExtraidos: unknown },
  produtos: { nome: string; descricao: string | null }[],
  empresa: { nome: string; segmento: string | null }
): string {
  return `Sugira os elementos para uma proposta para esta licitação.

EMPRESA: ${empresa.nome} (${empresa.segmento ?? "geral"})

PRODUTOS DISPONÍVEIS:
${produtos.map((p) => `- ${p.nome}: ${p.descricao ?? ""}`).join("\n")}

LICITAÇÃO:
- Título: ${licitacao.titulo}
- Objeto: ${licitacao.objeto ?? "não informado"}
- Dados: ${JSON.stringify(licitacao.dadosExtraidos ?? {})}

Retorne este JSON:
{
  "produtosSugeridos": [{"nome": "...", "justificativa": "..."}],
  "pontosFortes": ["ponto 1"],
  "documentacaoNecessaria": ["documento 1"],
  "estrategia": "resumo da estratégia em 2-3 frases",
  "cuidados": ["cuidado 1"]
}`;
}
