import type { DbClient } from "@flao/db";
import type { Logger } from "../logger.js";
import type { LLMClient } from "./llm.js";

export interface IntegrationClients {
  github?: GithubClient;
  calendar?: CalendarClient;
  whatsapp?: WhatsAppClient;
  clickup?: ClickUpClient;
  telegram?: TelegramClient;
}

// Placeholder interfaces - will be properly defined in integration packages
export interface GithubClient {
  getRecentCommitsForRepo(repo: string, since: Date): Promise<unknown[]>;
  createIssue?(repo: string, title: string, body: string): Promise<unknown>;
}

export interface CalendarClient {
  scheduleEvent(title: string, startTime: Date, endTime: Date, attendees?: string[]): Promise<unknown>;
  findAvailableSlot(durationMinutes: number, attendees: string[]): Promise<Date | null>;
}

export interface WhatsAppClient {
  sendMessage(to: string, message: string): Promise<unknown>;
  sendMedia(to: string, mediaUrl: string, mediaType: "image" | "video" | "document" | "audio", caption?: string): Promise<unknown>;
  createGroup(name: string, participants: string[]): Promise<unknown>;
  sendToGroup(groupId: string, message: string): Promise<unknown>;
}

export interface ClickUpClient {
  createTask(listId: string, name: string, description?: string, assignees?: string[], dueDate?: Date, priority?: number): Promise<unknown>;
  updateTask(taskId: string, updates: { name?: string; description?: string; status?: string; assignees?: string[]; dueDate?: Date; priority?: number }): Promise<unknown>;
  getTasks(listId: string, includeClosed?: boolean): Promise<unknown[]>;
  createList(folderId: string, name: string): Promise<unknown>;
  getSpaces(): Promise<unknown[]>;
}

export interface TelegramClient {
  sendMessage(chatId: string | number, text: string, options?: { parse_mode?: "Markdown" | "HTML" }): Promise<unknown>;
  sendMessageWithMarkdown(chatId: string | number, text: string): Promise<unknown>;
  onCommand(command: string, handler: (chatId: string | number, args: string[]) => Promise<void>): void;
  startPolling(): Promise<void>;
  stopPolling(): void;
}

export interface AgentContext {
  db: DbClient;
  logger: Logger;
  integrations: IntegrationClients;
  llm?: LLMClient;
}

export interface Agent<Input, Output> {
  name: string;
  run(input: Input, context: AgentContext): Promise<Output>;
}

