import type { LicitacaoComCard, CardInfo } from "@/types/licitacao";

export type ProximaAcaoResultado = {
  titulo: string;
  descricao: string;
  variante: "info" | "success" | "warning" | "danger";
};

/**
 * Determina a próxima ação sugerida para um card no Kanban.
 * Usa o nome da coluna (dinâmico do banco) para identificar o estágio.
 */
export function getProximaAcao(
  card: CardInfo | null
): ProximaAcaoResultado | null {
  if (!card) {
    return {
      titulo: "Sem card no Kanban",
      descricao: "Esta licitação não está no quadro.",
      variante: "warning",
    };
  }

  if (!card.responsavelId) {
    return {
      titulo: "Definir responsável",
      descricao: "Atribua um analista para acompanhar esta licitação.",
      variante: "warning",
    };
  }

  if (card.urgente) {
    return {
      titulo: "Atenção: card urgente",
      descricao: "Este card foi marcado como urgente e precisa de prioridade.",
      variante: "danger",
    };
  }

  return null;
}

/**
 * Linha curta no card do Kanban.
 */
export function getKanbanCardHint(
  licitacao: LicitacaoComCard
): string | null {
  const { card } = licitacao;
  if (!card) return null;
  if (card.urgente) return "Urgente";
  if (!card.responsavelId) return "Sem responsável";
  return null;
}
