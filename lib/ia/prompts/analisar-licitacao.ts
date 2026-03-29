export const SYSTEM_ANALISAR = `Você é um consultor comercial especializado em licitações.
Sua tarefa é analisar se uma licitação é relevante para os produtos/serviços da empresa.
Retorne APENAS JSON válido, sem markdown.`;

export function buildPromptAnalisar(
  licitacao: { titulo: string; objeto: string | null; observacoes: string | null; dadosExtraidos: unknown },
  produtos: { nome: string; descricao: string | null; categoria: string | null }[],
  empresa: { nome: string; descricao: string | null; segmento: string | null }
): string {
  return `Analise se esta licitação é relevante para a empresa.

EMPRESA:
- Nome: ${empresa.nome}
- Segmento: ${empresa.segmento ?? "não informado"}
- Descrição: ${empresa.descricao ?? "não informada"}

PRODUTOS/SERVIÇOS DA EMPRESA:
${produtos.map((p) => `- ${p.nome}: ${p.descricao ?? "sem descrição"} (${p.categoria ?? "sem categoria"})`).join("\n")}

LICITAÇÃO:
- Título: ${licitacao.titulo}
- Objeto: ${licitacao.objeto ?? "não informado"}
- Observações: ${licitacao.observacoes ?? "nenhuma"}
- Dados extraídos: ${JSON.stringify(licitacao.dadosExtraidos ?? {})}

Retorne este JSON:
{
  "relevancia": "alta" | "media" | "baixa" | "nenhuma",
  "justificativa": "explicação em 2-3 frases",
  "produtosRelacionados": ["nome do produto 1", "nome do produto 2"],
  "oportunidades": ["oportunidade identificada 1"],
  "riscos": ["risco identificado 1"],
  "recomendacao": "AVANCAR" | "ACOMPANHAR" | "DESCARTAR",
  "proximosPassos": ["passo 1", "passo 2"]
}`;
}
