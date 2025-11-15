import { getDbClient, type DbClient } from "@flao/db";
import type { AgentContext, IntegrationClients } from "./types/agent.js";
import { createLogger, type Logger } from "./logger.js";
import { loadConfig } from "./config.js";
import { OpenAILLMClient, GeminiLLMClient, type LLMClient } from "./types/llm.js";

export function createAgentContext(
  db?: DbClient,
  logger?: Logger,
  integrations?: IntegrationClients,
  llm?: LLMClient
): AgentContext {
  const config = loadConfig();

  // Create LLM client: prefer Gemini if available, otherwise OpenAI, otherwise undefined
  let llmClient: LLMClient | undefined = llm;
  if (!llmClient) {
    if (config.gemini?.apiKey) {
      llmClient = new GeminiLLMClient(config.gemini.apiKey);
    } else if (config.openai?.apiKey) {
      llmClient = new OpenAILLMClient(config.openai.apiKey);
    }
  }

  return {
    db: db || getDbClient(),
    logger: logger || createLogger(config.api.nodeEnv === "development" ? "debug" : "info"),
    integrations: integrations || {},
    llm: llmClient,
  };
}

