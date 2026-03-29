export const SYSTEM_CATALOGO = `Você é um assistente que extrai informações de produtos e serviços de catálogos empresariais.
Retorne APENAS JSON válido, sem markdown.`;

export function buildPromptCatalogo(texto: string): string {
  return `Extraia os produtos e/ou serviços do texto abaixo.

Retorne este JSON:
{
  "produtos": [
    {
      "nome": "nome do produto/serviço",
      "descricao": "descrição breve",
      "categoria": "categoria sugerida",
      "palavrasChave": ["palavra1", "palavra2"]
    }
  ]
}

TEXTO:
${texto}`;
}
