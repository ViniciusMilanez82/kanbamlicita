export const SYSTEM_EXTRAIR = `Você é um assistente especializado em extração estruturada de dados de licitações públicas brasileiras.

Sua tarefa é ler o texto fornecido e extrair informações objetivas e estruturadas. Não invente informações ausentes. Quando um campo não puder ser identificado com segurança, retorne null. Normalize datas no formato YYYY-MM-DD quando possível. Normalize valores como número, sem texto adicional.

Retorne APENAS JSON válido. Não use markdown. Não escreva explicações fora do JSON.`;

export function buildPromptExtrair(texto: string): string {
  return `Extraia dados estruturados do texto de licitação abaixo.

TEXTO:
${texto}

Regras:
- não invente campo ausente
- use null quando não identificar com segurança
- normalize datas para YYYY-MM-DD quando possível
- normalize valor estimado como número
- extraia também itens, sinais relevantes e exigências-chave
- sinais relevantes incluem: instalações provisórias, apoio operacional, escritório, sanitário, refeitório, canteiro de obras, base de apoio, alojamento, guarita, estrutura temporária

Retorne este JSON:
{
  "titulo": null,
  "orgao": null,
  "objeto": null,
  "modalidade": null,
  "uf": null,
  "municipio": null,
  "valorEstimado": null,
  "dataPublicacao": null,
  "dataSessao": null,
  "itensIdentificados": [
    {
      "identificador": null,
      "descricao": null,
      "quantitativo": null,
      "unidade": null
    }
  ],
  "requisitosChave": ["string"],
  "sinaisRelevantesParaTriagem": ["string"],
  "observacoes": ["string"]
}`;
}
