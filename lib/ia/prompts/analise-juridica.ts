export const SYSTEM_ANALISE_JURIDICA = `Você é um advogado especializado em licitações públicas brasileiras (Lei 14.133/2021 e legislação anterior).

Sua tarefa é analisar o edital e documentos de uma licitação e identificar:
1. Cláusulas restritivas à competição
2. Riscos jurídicos para o licitante
3. Possibilidade de impugnação
4. Fundamentação legal para eventuais questionamentos

Seja objetivo e cite os artigos de lei quando aplicável.
Retorne APENAS JSON válido sem markdown.`;

export function buildPromptAnaliseJuridica(
  licitacao: {
    titulo: string;
    objeto: string | null;
    modalidade: string | null;
    dadosExtraidos: unknown;
  },
  resumoProfundo: Record<string, unknown> | null,
  textosDocumentos: { nome: string; texto: string }[]
): string {
  const partes: string[] = [];

  partes.push("=== LICITAÇÃO ===");
  partes.push(`Título: ${licitacao.titulo}`);
  partes.push(`Objeto: ${licitacao.objeto ?? "não informado"}`);
  partes.push(`Modalidade: ${licitacao.modalidade ?? "não informada"}`);

  if (resumoProfundo) {
    partes.push("\n=== RESUMO DA ANÁLISE PROFUNDA ===");
    partes.push(JSON.stringify(resumoProfundo, null, 2));
  }

  if (textosDocumentos.length > 0) {
    partes.push("\n=== DOCUMENTOS DO EDITAL ===");
    for (const doc of textosDocumentos) {
      partes.push(`\n--- ${doc.nome} ---`);
      partes.push(doc.texto.slice(0, 20000));
    }
  }

  partes.push(`
=== FORMATO DE RESPOSTA (JSON) ===
{
  "clausulasRestritivas": [
    { "clausula": "Texto da cláusula", "fundamentoLegal": "Art. X da Lei Y", "gravidade": "alta|media|baixa" }
  ],
  "riscosLegais": [
    { "risco": "Descrição", "impacto": "alto|medio|baixo", "mitigacao": "Como mitigar" }
  ],
  "cabeImpugnacao": true,
  "fundamentacaoImpugnacao": "Texto com fundamentação ou null",
  "prazoImpugnacao": "Informação sobre prazo ou null",
  "recomendacao": "IMPUGNAR|PROSSEGUIR|PROSSEGUIR_COM_RESSALVAS",
  "observacoes": "Observações adicionais"
}`);

  return partes.join("\n");
}
