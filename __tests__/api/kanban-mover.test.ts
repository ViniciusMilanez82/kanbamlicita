import { validateMove, KanbanMoveError } from '@/lib/kanban'
import { db } from '@/lib/db'

// Testamos a lógica de validação (já coberta em kanban.test.ts)
// e a função que executa o move no banco

async function executarMove(input: {
  cardId: string
  colunaDestino: string
  falsoNegativoNivelRisco: string
  motivo?: string
}) {
  validateMove({
    colunaDestino: input.colunaDestino,
    falsoNegativoNivelRisco: input.falsoNegativoNivelRisco,
    motivo: input.motivo,
  })

  // Capturar coluna de origem ANTES de atualizar
  const cardAtual = await db.kanbanCard.findUniqueOrThrow({ where: { id: input.cardId } })
  const colunaOrigem = cardAtual.colunaAtual

  const card = await db.kanbanCard.update({
    where: { id: input.cardId },
    data: { colunaAtual: input.colunaDestino as never },
  })

  await db.kanbanMovimentacao.create({
    data: {
      cardId: input.cardId,
      licitacaoId: card.licitacaoId,
      colunaOrigem,                           // origem correta — capturada pré-update
      colunaDestino: input.colunaDestino as never,
      automatico: false,
      motivo: input.motivo,
    },
  })

  return card
}

describe('mover card — validação integrada', () => {
  afterAll(async () => {
    await db.$disconnect()
  })

  it('rejeita COLUNA_INVALIDA antes de tocar no banco', async () => {
    await expect(
      executarMove({
        cardId: 'qualquer',
        colunaDestino: 'nao_existe',
        falsoNegativoNivelRisco: 'baixo',
      })
    ).rejects.toThrow(KanbanMoveError)
  })

  it('rejeita FALSO_NEGATIVO_BLOQUEIO para descarte com FN alto', async () => {
    await expect(
      executarMove({
        cardId: 'qualquer',
        colunaDestino: 'descartadas',
        falsoNegativoNivelRisco: 'alto',
        motivo: 'Tentando descartar',
      })
    ).rejects.toThrow(KanbanMoveError)
  })
})
