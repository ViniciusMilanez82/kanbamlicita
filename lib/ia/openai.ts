import OpenAI from "openai";
import type { IaProvider } from "./provider";

export class OpenAiProvider implements IaProvider {
  private client: OpenAI;
  readonly modelName: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
    });
    this.modelName = model || process.env.LLM_MODEL || "gpt-4o";
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }
}
