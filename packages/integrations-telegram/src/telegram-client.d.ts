import type { TelegramClient } from "@flao/core";
import { EventEmitter } from "events";
export interface TelegramMessage {
    chatId: string | number;
    text: string;
    messageId?: number;
    timestamp: Date;
}
export declare class MockTelegramClient extends EventEmitter implements TelegramClient {
    private bot;
    private botToken?;
    private isPolling;
    private commandHandlers;
    constructor(botToken?: string);
    private setupBotHandlers;
    sendMessage(chatId: string | number, text: string, options?: {
        parse_mode?: "Markdown" | "HTML";
    }): Promise<TelegramMessage>;
    sendMessageWithMarkdown(chatId: string | number, text: string): Promise<TelegramMessage>;
    onCommand(command: string, handler: (chatId: string | number, args: string[]) => Promise<void>): void;
    startPolling(): Promise<void>;
    stopPolling(): void;
    private getMockMessage;
}
//# sourceMappingURL=telegram-client.d.ts.map