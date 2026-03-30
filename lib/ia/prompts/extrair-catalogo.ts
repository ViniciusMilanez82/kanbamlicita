export const SYSTEM_CATALOGO = `Você é um assistente especializado em extrair produtos e serviços de catálogos empresariais, com foco em posterior cruzamento com oportunidades de licitação.

Sua tarefa é transformar o texto do catálogo em uma lista estruturada de itens comercializáveis. Não invente produtos ausentes. Quando houver ambiguidade, use a descrição mais fiel ao texto.

Retorne APENAS JSON válido. Não use markdown. Não escreva explicações fora do JSON.`;

export function buildPromptCatalogo(texto: string): string {
  return `Extraia os produtos e serviços do texto abaixo.

TEXTO DO CATÁLOGO:
${texto}

Regras:
- separar produtos/serviços em itens distintos
- gerar palavras-chave úteis para cruzamento com licitações
- manter linguagem objetiva
- não inventar itens
- se o catálogo for genérico, extrair o que for comercialmente ofertável
- aplicações úteis para cruzamento incluem: apoio operacional, apoio administrativo, alojamento, refeitório, escritório de obra, sanitário, evento, offshore, canteiro de obras

Retorne este JSON:
{
  "itens": [
    {
      "nome": "nome do produto/serviço",
      "descricao": "descrição breve",
      "tipo": "PRODUTO|SERVICO|SOLUCAO",
      "categoria": "categoria sugerida",
      "aplicacoes": ["aplicação 1", "aplicação 2"],
      "palavrasChave": ["palavra1", "palavra2"]
    }
  ]
}`;
}
