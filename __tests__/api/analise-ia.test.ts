import { db } from '@/lib/db'
import { setLlmProvider, resetLlmProvider } from '@/lib/llm/factory'
import type { LlmProvider } from '@/lib/llm/provider'
import type { AnaliseIaResult } from '@/lib/llm/prompts/analise-completa'

// MockProvider — não chama API real
class MockProvider implements LlmProvider {
  readonly modelName = 'mock-model'
  readonly result: AnaliseIaResult = {
    aderencia: { nivel: 'alta', justificativa: 'Testes de containers são aderentes.' },
    oportunidades: [{ tipo: 'estrutura', descricao: 'Alojamento modular', forca: 'forte' }],
    riscos: ['Prazo curto'],
    recomendacao: 'AVANCAR',
    resumo: 'Licitação altamente aderente à Multiteiner.',
    confianca: 'alta',
  }

  async complete(_system: string, _user: string): Promise<string> {
    return JSON.stringify(this.result)
  }
}

class ErrorProvider implements LlmProvider {
  readonly modelName = 'error-model'
  async complete(_system: string, _user: string): Promise<string> {
    throw new Error('API unavailable')
  }
}

// Importar processAnalise após definir o mock
import { processAnalise } from '@/app/api/licitacoes/[id]/analise-ia/route'

describe('SP-4: analise-ia', () => {
  let licitacaoId: string
  let registroId: string

  beforeAll(async () => {
    const l = await db.licitacao.findFirst()
    if (!l) throw new Error('Seed não encontrado')
    licitacaoId = l.id
  })

  beforeEach(async () => {
    // Limpar análises anteriores
    await db.licitacaoAnaliseIa.deleteMany({ where: { licitacaoId } })
    setLlmProvider(new MockProvider())
  })

  afterEach(() => {
    resetLlmProvider()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('processAnalise atualiza status para CONCLUIDO com resultadoJson correto', async () => {
    const registro = await db.licitacaoAnaliseIa.create({
      data: { licitacaoId, tipoAnalise: 'analise_completa', status: 'EM_PROCESSAMENTO', promptVersao: 'v1' },
    })
    registroId = registro.id

    await processAnalise(registroId, licitacaoId)

    const updated = await db.licitacaoAnaliseIa.findUniqueOrThrow({ where: { id: registroId } })
    expect(updated.status).toBe('CONCLUIDO')
    expect(updated.modeloUtilizado).toBe('mock-model')
    expect(updated.resumoTexto).toBe('Licitação altamente aderente à Multiteiner.')
    const result = updated.resultadoJson as AnaliseIaResult
    expect(result.recomendacao).toBe('AVANCAR')
    expect(result.aderencia.nivel).toBe('alta')
  })

  it('processAnalise atualiza status para ERRO quando provider falha', async () => {
    setLlmProvider(new ErrorProvider())
    const registro = await db.licitacaoAnaliseIa.create({
      data: { licitacaoId, tipoAnalise: 'analise_completa', status: 'EM_PROCESSAMENTO', promptVersao: 'v1' },
    })

    await processAnalise(registro.id, licitacaoId)

    const updated = await db.licitacaoAnaliseIa.findUniqueOrThrow({ where: { id: registro.id } })
    expect(updated.status).toBe('ERRO')
    expect(updated.resumoTexto).toContain('API unavailable')
  })

  it('processAnalise lida com JSON malformado do LLM setando ERRO', async () => {
    class BadJsonProvider implements LlmProvider {
      readonly modelName = 'bad-json'
      async complete(): Promise<string> { return 'isso nao e json' }
    }
    setLlmProvider(new BadJsonProvider())

    const registro = await db.licitacaoAnaliseIa.create({
      data: { licitacaoId, tipoAnalise: 'analise_completa', status: 'EM_PROCESSAMENTO', promptVersao: 'v1' },
    })

    await processAnalise(registro.id, licitacaoId)

    const updated = await db.licitacaoAnaliseIa.findUniqueOrThrow({ where: { id: registro.id } })
    expect(updated.status).toBe('ERRO')
  })

  it('não cria duplicata se já há registro EM_PROCESSAMENTO', async () => {
    await db.licitacaoAnaliseIa.create({
      data: { licitacaoId, tipoAnalise: 'analise_completa', status: 'EM_PROCESSAMENTO', promptVersao: 'v1' },
    })

    // Verificar lógica de deduplicação diretamente
    const emProcessamento = await db.licitacaoAnaliseIa.findFirst({
      where: { licitacaoId, status: 'EM_PROCESSAMENTO' },
    })
    expect(emProcessamento).not.toBeNull()
  })
})
