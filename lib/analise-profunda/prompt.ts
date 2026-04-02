/**
 * Prompts da IA para gerar o Resumo de Licitação estruturado.
 */

export const SYSTEM_ANALISE_PROFUNDA = `Você é um analista sênior de licitações públicas da empresa Multiteiner.
Sua tarefa é analisar documentos de uma licitação e gerar um resumo estruturado completo.

A Multiteiner trabalha com:
- Containers (locação, venda, customização)
- Módulos habitáveis / escritórios modulares
- Estruturas metálicas
- Soluções de armazenamento e logística

Você deve extrair TODAS as informações relevantes dos documentos fornecidos.
Se alguma informação não estiver disponível, use null.
Seja preciso — não invente dados que não estejam nos documentos.

IMPORTANTE: Responda APENAS com o JSON válido, sem markdown, sem explicações.`;

export function buildPromptAnaliseProfunda(params: {
  dadosLicitacao: Record<string, unknown>;
  detalhesPncp: Record<string, unknown> | null;
  textosDocumentos: { nome: string; texto: string }[];
  produtos: { nome: string; descricao: string | null; categoria: string | null }[];
}): string {
  const partes: string[] = [];

  partes.push("=== DADOS DA LICITAÇÃO (do cadastro) ===");
  partes.push(JSON.stringify(params.dadosLicitacao, null, 2));

  if (params.detalhesPncp) {
    partes.push("\n=== DETALHES DO PNCP (API v1) ===");
    partes.push(JSON.stringify(params.detalhesPncp, null, 2));
  }

  if (params.textosDocumentos.length > 0) {
    partes.push("\n=== DOCUMENTOS ANEXOS ===");
    for (const doc of params.textosDocumentos) {
      partes.push(`\n--- ${doc.nome} ---`);
      // Limitar texto para não estourar o contexto
      const textoLimitado = doc.texto.slice(0, 30000);
      partes.push(textoLimitado);
      if (doc.texto.length > 30000) {
        partes.push("... [texto truncado por limitação de contexto]");
      }
    }
  }

  if (params.produtos.length > 0) {
    partes.push("\n=== CATÁLOGO DA MULTITEINER ===");
    for (const p of params.produtos) {
      partes.push(`- ${p.nome}${p.categoria ? ` (${p.categoria})` : ""}${p.descricao ? `: ${p.descricao}` : ""}`);
    }
  }

  partes.push(`
=== FORMATO DE RESPOSTA (JSON) ===
{
  "empresa": "Multiteiner",
  "cliente": "Nome do órgão/cliente",
  "modalidade": "Pregão Eletrônico / Concorrência / etc.",
  "portal": "PNCP",
  "numero": "Número da licitação",
  "dataPublicacao": "DD/MM/AAAA ou null",
  "dataSessao": "DD/MM/AAAA HH:mm ou null",
  "dataLimiteEsclarecimentos": "DD/MM/AAAA ou null",
  "tipo": "Locação / Venda / Serviço / Misto",
  "objeto": "Texto completo do objeto",
  "objetoResumido": "Resumo em 1-2 frases",
  "prazoEntrega": "Prazo ou null",
  "localEntrega": "Local ou null",
  "periodoLocacao": "Período ou null",
  "esclarecimentos": "Informações sobre esclarecimentos ou null",
  "criterioJulgamento": "Menor preço / Técnica e preço / etc. ou null",
  "intervaloLances": "Intervalo mínimo de lances ou null",
  "modoDisputa": "Aberto / Fechado / Aberto-Fechado ou null",
  "validadeProposta": "Prazo de validade ou null",
  "valorEstimado": "R$ X.XXX,XX ou null",
  "interligacaoExterna": "Requisitos de integração ou null",
  "visitaTecnica": "Obrigatória/Facultativa + detalhes ou null",
  "projeto": "Informações do projeto ou null",
  "artCrea": "Exigência de ART/CREA ou null",
  "dfpPlanilha": "Demonstrativo / Planilha ou null",
  "ppu": "Preço público unitário ou null",
  "renovacao": "Possibilidade de renovação ou null",
  "itens": [
    {
      "numero": "1",
      "descricao": "Descrição do item",
      "quantidade": "10" ou null,
      "valorUnitario": "R$ X.XXX,XX" ou null,
      "valorTotal": "R$ X.XXX,XX" ou null
    }
  ],
  "habilitacao": {
    "juridica": ["Doc 1", "Doc 2"],
    "tecnica": ["Atestado X", "Registro Y"],
    "fiscal": ["Certidão 1", "Certidão 2"],
    "economica": ["Balanço patrimonial", "etc."],
    "declaracoes": ["Declaração 1", "Declaração 2"]
  },
  "observacao": "Observações relevantes ou null",
  "riscos": ["Risco 1", "Risco 2"],
  "oportunidades": ["Oportunidade 1 para a Multiteiner"]
}

Analise todos os documentos fornecidos e preencha o JSON acima com o máximo de informações possível.`);

  return partes.join("\n");
}
