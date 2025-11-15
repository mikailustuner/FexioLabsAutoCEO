import type { WhatsAppClient, AgentContext } from "@flao/core";
import { EventEmitter } from "events";
export interface WhatsAppMessage {
    id: string;
    to: string;
    message: string;
    timestamp: Date;
}
export interface WhatsAppMediaMessage {
    id: string;
    to: string;
    mediaUrl: string;
    caption?: string;
    mediaType: "image" | "video" | "document" | "audio";
    timestamp: Date;
}
export interface WhatsAppGroup {
    id: string;
    name: string;
    participants: string[];
}
export interface WhatsAppMessageEvent {
    from: string;
    body: string;
    isGroup: boolean;
    groupName?: string;
    timestamp: Date;
    messageId: string;
}
export declare class MockWhatsAppClient extends EventEmitter implements WhatsAppClient {
    private client;
    private sessionDir?;
    private isReady;
    private monitoredGroups;
    private autoReplyEnabled;
    private agentContext?;
    constructor(sessionDir?: string, monitoredGroups?: string[], agentContext?: AgentContext);
    setAgentContext(context: AgentContext): void;
    initialize(): Promise<void>;
    private handleIncomingMessage;
    private handleGroupMessageAutoReply;
    sendMessage(to: string, message: string): Promise<WhatsAppMessage>;
    sendMedia(to: string, mediaUrl: string, mediaType: "image" | "video" | "document" | "audio", caption?: string): Promise<WhatsAppMediaMessage>;
    createGroup(name: string, participants: string[]): Promise<WhatsAppGroup>;
    sendToGroup(groupId: string, message: string): Promise<WhatsAppMessage>;
    getGroups(): Promise<WhatsAppGroup[]>;
    enableAutoReply(groups?: string[]): void;
    disableAutoReply(): void;
    setMonitoredGroups(groups: string[]): void;
    destroy(): Promise<void>;
    getReadyState(): boolean;
    private getMockMessage;
    private getMockMediaMessage;
    private getMockGroup;
}
//# sourceMappingURL=whatsapp-client.d.ts.map