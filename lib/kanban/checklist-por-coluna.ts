/**
 * Sugestões padrão de checklist por nome de coluna do Kanban.
 * Como as colunas são dinâmicas (vêm do banco), mapeamos pelo nome.
 */
const CHECKLIST_PADRAO: Record<string, string[]> = {
  Captação: [
    "Objeto e órgão alinhados à estratégia comercial?",
    "Data de sessão e prazo compatíveis com capacidade de resposta?",
  ],
  Qualificação: [
    "Documentação mínima (edital/TR) disponível ou link válido?",
    "Definir responsável e prioridade (urgente?) no card.",
  ],
  Análise: [
    "Preencher análise manual e/ou rodar IA.",
    "Calcular score, faixa e valor capturável.",
    "Registrar risco de falso negativo quando aplicável.",
  ],
  Proposta: [
    "Itens exigidos no edital conferidos (habilitação, técnica, preço)?",
    "Prazo de entrega interno definido.",
  ],
  Disputa: [
    "Acompanhar publicações e impugnações até a sessão.",
    "Registrar resultado assim que divulgado.",
  ],
  "Pós-resultado": [
    "Arquivar documentação e lições aprendidas.",
    "Registrar motivo se perdeu.",
  ],
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * Mescla checklist salvo (JSON) com padrões.
 * Chaves são nomes de coluna (ex: "Captação", "Análise").
 */
export function mergeChecklistPorColuna(
  stored: unknown
): Record<string, string[]> {
  const defaults = { ...CHECKLIST_PADRAO };
  if (!stored || typeof stored !== "object") {
    return defaults;
  }
  const s = stored as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const [col, padrao] of Object.entries(defaults)) {
    const v = s[col];
    if (isStringArray(v)) {
      out[col] = v.map((x) => x.trim()).filter(Boolean);
    } else {
      out[col] = [...padrao];
    }
  }
  // Include extra columns from stored that aren't in defaults
  for (const [col, v] of Object.entries(s)) {
    if (!(col in out) && isStringArray(v)) {
      out[col] = v.map((x) => x.trim()).filter(Boolean);
    }
  }
  return out;
}

export function getChecklistItensColuna(
  colunaNome: string | null | undefined,
  stored: unknown
): string[] {
  if (!colunaNome) return [];
  const merged = mergeChecklistPorColuna(stored);
  return merged[colunaNome] ?? [];
}
