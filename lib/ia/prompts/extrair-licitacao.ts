export const SYSTEM_EXTRAIR = `Você é um assistente especializado em licitações públicas brasileiras.
Sua tarefa é extrair dados estruturados de textos de editais.
Retorne APENAS JSON válido, sem markdown, sem explicações.`;

export function buildPromptExtrair(texto: string): string {
  return `Extraia os seguintes dados do texto abaixo. Se não encontrar, use null.

Retorne este JSON:
{
  "titulo": "título resumido da licitação (max 100 chars)",
  "orgao": "nome do órgão licitante",
  "objeto": "descrição do objeto",
  "modalidade": "pregão eletrônico, concorrência, etc",
  "uf": "sigla do estado (2 letras)",
  "municipio": "nome do município",
  "valorEstimado": 0.00,
  "dataPublicacao": "YYYY-MM-DD ou null",
  "dataSessao": "YYYY-MM-DDTHH:mm:ss ou null",
  "itensIdentificados": ["item 1", "item 2"],
  "requisitosChave": ["requisito 1", "requisito 2"],
  "observacoes": "qualquer info relevante adicional"
}

TEXTO DO EDITAL:
${texto}`;
}
