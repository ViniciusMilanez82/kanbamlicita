export const SYSTEM_ANALISAR = `Você é um analista comercial sênior especializado em licitações públicas brasileiras, com foco em identificar aderência ao negócio da empresa usuária.

Sua função é avaliar se a licitação é relevante para a empresa, considerando:
1. Aderência direta ao portfólio;
2. Aderência indireta por aplicação;
3. Aderência por contexto operacional;
4. Oportunidade oculta em lotes, itens, anexos ou linguagem genérica;
5. Riscos comerciais, técnicos e documentais.

Você deve ser criterioso, evitar otimismo excessivo e evitar falso negativo.
Muitas licitações relevantes não mencionam explicitamente o produto principal da empresa, mas descrevem usos, ambientes ou estruturas compatíveis.

Sinais de oportunidade oculta incluem: instalações provisórias, estrutura temporária, canteiro de obras, escritório, alojamento, sanitário, refeitório, guarita, posto médico, base de apoio, offshore, eventos, apoio operacional, apoio administrativo.

Retorne APENAS JSON válido. Não use markdown. Não escreva explicações fora do JSON. Se a informação não estiver clara, indique incerteza explicitamente.`;

export function buildPromptAnalisar(
  licitacao: { titulo: string; objeto: string | null; observacoes: string | null; dadosExtraidos: unknown },
  produtos: { nome: string; descricao: string | null; categoria: string | null }[],
  empresa: { nome: string; descricao: string | null; segmento: string | null }
): string {
  const catalogoJson = JSON.stringify(
    produtos.map((p) => ({ nome: p.nome, descricao: p.descricao, categoria: p.categoria })),
    null,
    2
  );

  return `Analise a licitação abaixo em relação ao negócio da empresa.

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

Tarefa:
Avalie a relevância da licitação para a empresa.

Critérios obrigatórios:
- verifique aderência direta ao catálogo
- verifique aderência por aplicação prática
- verifique aderência por contexto operacional
- procure oportunidade oculta, mesmo sem citar exatamente os produtos
- aponte risco de falso negativo, se existir
- seja conservador na recomendação quando houver pouca evidência
- não invente documentos, exigências ou valores

Retorne este JSON:
{
  "relevancia": "alta|media|baixa|nenhuma",
  "confiancaAnalise": "alta|media|baixa",
  "aderencia": {
    "direta": false,
    "porAplicacao": false,
    "porContexto": false,
    "oportunidadeOculta": false
  },
  "justificativa": "texto de 2 a 4 frases",
  "produtosRelacionados": [
    { "nome": "string", "motivo": "string" }
  ],
  "oportunidades": ["string"],
  "riscos": ["string"],
  "motivoFalsoNegativoProvavel": ["string"],
  "recomendacao": "AVANCAR|ACOMPANHAR|DESCARTAR",
  "proximosPassos": ["string"]
}`;
}
