import type { TelegramClient } from "@flao/core";
import TelegramBot from "node-telegram-bot-api";
import { EventEmitter } from "events";

export interface TelegramMessage {
  chatId: string | number;
  text: string;
  messageId?: number;
  timestamp: Date;
}

export class MockTelegramClient extends EventEmitter implements TelegramClient {
  private bot: TelegramBot | null = null;
  private botToken?: string;
  private isPolling = false;
  private commandHandlers: Map<string, (chatId: string | number, args: string[]) => Promise<void>> = new Map();

  constructor(botToken?: string) {
    super();
    this.botToken = botToken;

    if (botToken) {
      this.bot = new TelegramBot(botToken, { polling: false });
      this.setupBotHandlers();
    } else if (process.env.NODE_ENV === "development") {
      console.warn("[Telegram] No bot token provided, Telegram client will use mock mode");
    }
  }

  private setupBotHandlers(): void {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
      const chatId = msg.chat.id;
      await this.sendMessage(
        chatId,
        "Merhaba! FLAO bot'una hoş geldiniz. 🤖\n\n" +
          "Kullanılabilir komutlar:\n" +
          "/help - Yardım menüsü\n" +
          "/summary veya /ozet - Günlük özet\n" +
          "/summary [tarih] - Belirli bir tarih için özet (örn: /summary 2024-01-15)"
      );
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg: TelegramBot.Message) => {
      const chatId = msg.chat.id;
      await this.sendMessage(
        chatId,
        "📋 *FLAO Bot Komutları*\n\n" +
          "/start - Bot'u başlat\n" +
          "/help - Bu yardım mesajını göster\n" +
          "/summary veya /ozet - Bugünün özeti\n" +
          "/summary [tarih] - Belirli bir tarih için özet\n\n" +
          "Örnek: /summary 2024-01-15",
        { parse_mode: "Markdown" }
      );
    });

    // Handle /summary and /ozet commands
    this.bot.onText(/\/(summary|ozet)(?:\s+(.+))?/, async (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
      const chatId = msg.chat.id;
      const dateArg = match?.[2]; // Optional date argument

      // Emit event for command handler
      this.emit("summary-request", { chatId, date: dateArg });
    });

    // Handle generic commands
    this.bot.on("message", async (msg: TelegramBot.Message) => {
      if (!msg.text || !msg.text.startsWith("/")) return;

      const parts = msg.text.split(" ");
      const command = parts[0].substring(1); // Remove leading /
      const args = parts.slice(1);

      const handler = this.commandHandlers.get(command);
      if (handler) {
        try {
          await handler(msg.chat.id, args);
        } catch (error) {
          console.error(`[Telegram] Error handling command /${command}:`, error);
          await this.sendMessage(msg.chat.id, "Komut işlenirken bir hata oluştu.");
        }
      }
    });

    // Handle errors
    this.bot.on("error", (error: Error) => {
      console.error("[Telegram] Bot error:", error);
      this.emit("error", error);
    });
  }

  async sendMessage(
    chatId: string | number,
    text: string,
    options?: { parse_mode?: "Markdown" | "HTML" }
  ): Promise<TelegramMessage> {
    if (!this.botToken) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Telegram] No bot token, using mock data");
        return this.getMockMessage(chatId, text);
      }
      throw new Error("Telegram bot token is required");
    }

    if (!this.bot) {
      throw new Error("Telegram bot is not initialized");
    }

    try {
      const sentMessage = await this.bot.sendMessage(chatId, text, {
        parse_mode: options?.parse_mode,
      });

      return {
        chatId,
        text,
        messageId: sentMessage.message_id,
        timestamp: new Date(sentMessage.date * 1000),
      };
    } catch (error) {
      console.error("[Telegram] Error sending message:", error);
      if (process.env.NODE_ENV === "development") {
        console.warn("[Telegram] Falling back to mock data");
        return this.getMockMessage(chatId, text);
      }
      throw error;
    }
  }

  async sendMessageWithMarkdown(chatId: string | number, text: string): Promise<TelegramMessage> {
    return this.sendMessage(chatId, text, { parse_mode: "Markdown" });
  }

  onCommand(command: string, handler: (chatId: string | number, args: string[]) => Promise<void>): void {
    this.commandHandlers.set(command.toLowerCase(), handler);
  }

  async startPolling(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    if (!this.botToken) {
      console.warn("[Telegram] No bot token, cannot start polling");
      return;
    }

    try {
      // If bot exists, stop it first
      if (this.bot) {
        try {
          this.bot.stopPolling();
        } catch {
          // Ignore errors when stopping
        }
      }

      // Recreate bot with polling enabled
      this.bot = new TelegramBot(this.botToken, { polling: true });
      this.setupBotHandlers();

      this.isPolling = true;
      console.log("[Telegram] Bot polling started");
      this.emit("polling-started");
    } catch (error) {
      console.error("[Telegram] Error starting polling:", error);
      throw error;
    }
  }

  stopPolling(): void {
    if (!this.bot || !this.isPolling) {
      return;
    }

    this.bot.stopPolling();
    this.isPolling = false;
    console.log("[Telegram] Bot polling stopped");
    this.emit("polling-stopped");
  }

  private getMockMessage(chatId: string | number, text: string): TelegramMessage {
    console.log(`[Mock Telegram] Sending message to ${chatId}:`);
    console.log(text);
    console.log("---");
    return {
      chatId,
      text,
      timestamp: new Date(),
    };
  }
}

