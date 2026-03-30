import Anthropic from "@anthropic-ai/sdk";
import type { IaProvider } from "./provider";

export class AnthropicProvider implements IaProvider {
  private client: Anthropic;
  readonly modelName: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY,
    });
    this.modelName = model || process.env.LLM_MODEL || "claude-sonnet-4-20250514";
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content[0];
    return block.type === "text" ? block.text : "";
  }
}
