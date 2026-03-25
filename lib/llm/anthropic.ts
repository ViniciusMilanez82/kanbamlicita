import Anthropic from '@anthropic-ai/sdk'
import type { LlmProvider } from './provider'

export class AnthropicProvider implements LlmProvider {
  private client = new Anthropic({ apiKey: process.env.LLM_API_KEY })
  readonly modelName = process.env.LLM_MODEL ?? 'claude-3-5-sonnet-20241022'

  async complete(system: string, user: string): Promise<string> {
    const msg = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const block = msg.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type from Anthropic')
    return block.text
  }
}
