import { AnthropicProvider } from './anthropic'
import { OpenAiProvider } from './openai'
import type { LlmProvider } from './provider'

let _provider: LlmProvider | null = null

export function getLlmProvider(): LlmProvider {
  if (_provider) return _provider
  const p = process.env.LLM_PROVIDER ?? 'anthropic'
  _provider = p === 'openai' ? new OpenAiProvider() : new AnthropicProvider()
  return _provider
}

/** Permite trocar o provider em testes */
export function setLlmProvider(provider: LlmProvider): void {
  _provider = provider
}

/** Reseta o singleton (útil em testes) */
export function resetLlmProvider(): void {
  _provider = null
}
