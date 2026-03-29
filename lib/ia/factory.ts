import type { IaProvider } from "./provider";

let instance: IaProvider | null = null;

export function getIaProvider(): IaProvider {
  if (!instance) {
    const provider = process.env.LLM_PROVIDER ?? "anthropic";
    if (provider === "openai") {
      const { OpenAiProvider } = require("./openai");
      instance = new OpenAiProvider();
    } else {
      const { AnthropicProvider } = require("./anthropic");
      instance = new AnthropicProvider();
    }
  }
  return instance;
}

export function setIaProvider(p: IaProvider) {
  instance = p;
}

export function resetIaProvider() {
  instance = null;
}
