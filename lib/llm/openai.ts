import OpenAI from 'openai'
import type { LlmProvider } from './provider'

export class OpenAiProvider implements LlmProvider {
  private client = new OpenAI({ apiKey: process.env.LLM_API_KEY })
  readonly modelName = process.env.LLM_MODEL ?? 'gpt-4o'

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1024,
    })
    return res.choices[0].message.content ?? ''
  }
}
