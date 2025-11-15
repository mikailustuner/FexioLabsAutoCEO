import type { WhatsAppClient, AgentContext } from "@flao/core";
import whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { EventEmitter } from "events";
import path from "path";

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

export class MockWhatsAppClient extends EventEmitter implements WhatsAppClient {
  private client: whatsapp.Client | null = null;
  private sessionDir?: string;
  private isReady = false;
  private monitoredGroups: string[] = [];
  private autoReplyEnabled = false;
  private agentContext?: AgentContext;

  constructor(sessionDir?: string, monitoredGroups: string[] = [], agentContext?: AgentContext) {
    super();
    this.sessionDir = sessionDir || path.join(process.cwd(), ".wwebjs_auth");
    this.monitoredGroups = monitoredGroups;
    this.agentContext = agentContext;
  }

  setAgentContext(context: AgentContext): void {
    this.agentContext = context;
  }

  async initialize(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = new whatsapp.Client({
      authStrategy: new whatsapp.LocalAuth({
        dataPath: this.sessionDir,
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu"
        ],
        executablePath: process.env.CHROME_BIN || undefined,
      },
    });

    // QR Code event
    this.client.on("qr", (qr) => {
      console.log("\n[WhatsApp] QR Code oluşturuldu. WhatsApp mobil uygulamanızla tarayın:\n");
      qrcode.generate(qr, { small: true });
      console.log("\n");
      this.emit("qr", qr);
    });

    // Ready event
    this.client.on("ready", () => {
      console.log("[WhatsApp] Bağlantı başarılı! WhatsApp hazır.");
      this.isReady = true;
      this.emit("ready");
    });

    // Authentication event
    this.client.on("authenticated", () => {
      console.log("[WhatsApp] Kimlik doğrulama başarılı!");
    });

    // Authentication failure
    this.client.on("auth_failure", (msg) => {
      console.error("[WhatsApp] Kimlik doğrulama hatası:", msg);
      this.emit("auth_failure", msg);
    });

    // Disconnected
    this.client.on("disconnected", (reason) => {
      console.log("[WhatsApp] Bağlantı kesildi:", reason);
      this.isReady = false;
      this.emit("disconnected", reason);
    });

    // Message listener
    this.client.on("message", async (message: whatsapp.Message) => {
      await this.handleIncomingMessage(message);
    });

    // Initialize client
    await this.client.initialize();
  }

  private async handleIncomingMessage(message: whatsapp.Message): Promise<void> {
    try {
      const contact = await message.getContact();
      const chat = await message.getChat();
      const isGroup = chat.isGroup;

      // Skip own messages
      if (message.fromMe) {
        return;
      }

      const messageEvent: WhatsAppMessageEvent = {
        from: contact.id.user,
        body: message.body,
        isGroup,
        groupName: isGroup ? chat.name : undefined,
        timestamp: new Date(message.timestamp * 1000),
        messageId: message.id._serialized,
      };

      // Emit message event
      this.emit("message", messageEvent);

      // Log to console
      if (isGroup) {
        console.log(`[WhatsApp] Grup mesajı (${chat.name}): ${message.body.substring(0, 50)}...`);
      } else {
        console.log(`[WhatsApp] Mesaj (${contact.pushname || contact.number}): ${message.body.substring(0, 50)}...`);
      }

      // Auto-reply for monitored groups
      if (this.autoReplyEnabled && isGroup) {
        const groupChat = chat as whatsapp.GroupChat;
        const groupId = groupChat.id._serialized;

        // Check if this group is monitored
        if (this.monitoredGroups.length === 0 || this.monitoredGroups.includes(groupId) || this.monitoredGroups.includes(groupChat.name)) {
          await this.handleGroupMessageAutoReply(message, groupChat);
        }
      }
    } catch (error) {
      console.error("[WhatsApp] Error handling incoming message:", error);
    }
  }

  private async handleGroupMessageAutoReply(message: whatsapp.Message, groupChat: whatsapp.GroupChat): Promise<void> {
    const body = message.body.toLowerCase();
    let reply: string | null = null;

    // Use Ops Agent if available for intelligent replies
    if (this.agentContext) {
      try {
        // Check for standup-related messages
        if (body.includes("standup") || body.includes("günlük") || body.includes("bugün")) {
          const { OpsAgent } = await import("@flao/agents-ops");
          const opsAgent = new OpsAgent();
          const result = await opsAgent.run(
            {
              action: "collect-standups",
              date: new Date(),
            },
            this.agentContext
          );
          reply = `Standup özeti: ${result.summary}`;
        }
        // Check for task-related messages
        else if (body.includes("task") || body.includes("görev") || body.includes("iş")) {
          reply = "Task durumunu kontrol ediyorum, kısa süre içinde bilgi vereceğim.";
        }
        // Check for report requests
        else if (body.includes("rapor") || body.includes("report") || body.includes("özet")) {
          reply = "Rapor hazırlıyorum, birazdan paylaşacağım.";
        }
        // General mentions
        else if (body.includes("@flao") || body.includes("flao")) {
          reply = "Merhaba! Nasıl yardımcı olabilirim? Standup, rapor veya task durumu hakkında bilgi almak için yazabilirsiniz.";
        }
      } catch (error) {
        console.error("[WhatsApp] Error in Ops Agent integration:", error);
        reply = "Mesajınızı aldım, işleme alıyorum. Detaylı yanıt için biraz bekleyin.";
      }
    } else {
      // Fallback to simple replies
      if (body.includes("@flao") || body.includes("flao") || body.includes("standup") || body.includes("rapor")) {
        reply = "Mesajınızı aldım, işleme alıyorum. Detaylı yanıt için biraz bekleyin.";
      }
    }

    if (reply) {
      await this.sendToGroup(groupChat.id._serialized, reply);
    }
  }

  async sendMessage(to: string, message: string): Promise<WhatsAppMessage> {
    if (!this.isReady || !this.client) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[WhatsApp] Client not ready, using mock data");
        return this.getMockMessage(to, message);
      }
      throw new Error("WhatsApp client is not ready. Please initialize first.");
    }

    try {
      // Format phone number (add country code if needed)
      let formattedTo = to.replace(/[+\s-]/g, "");
      if (!formattedTo.includes("@")) {
        formattedTo = `${formattedTo}@c.us`;
      }

      const sentMessage = await this.client.sendMessage(formattedTo, message);

      return {
        id: sentMessage.id._serialized,
        to: formattedTo,
        message,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("[WhatsApp] Error sending message:", error);
      if (process.env.NODE_ENV === "development") {
        console.warn("[WhatsApp] Falling back to mock data");
        return this.getMockMessage(to, message);
      }
      throw error;
    }
  }

  async sendMedia(
    to: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "document" | "audio",
    caption?: string
  ): Promise<WhatsAppMediaMessage> {
    if (!this.isReady || !this.client) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[WhatsApp] Client not ready, using mock data");
        return this.getMockMediaMessage(to, mediaUrl, mediaType, caption);
      }
      throw new Error("WhatsApp client is not ready. Please initialize first.");
    }

    try {
      let formattedTo = to.replace(/[+\s-]/g, "");
      if (!formattedTo.includes("@")) {
        formattedTo = `${formattedTo}@c.us`;
      }

      let sentMessage;
      switch (mediaType) {
        case "image": {
          const imageOptions: { media: string; caption?: string } = { media: mediaUrl };
          if (caption) imageOptions.caption = caption;
          sentMessage = await this.client.sendMessage(formattedTo, imageOptions as any);
          break;
        }
        case "video": {
          const videoOptions: { media: string; caption?: string } = { media: mediaUrl };
          if (caption) videoOptions.caption = caption;
          sentMessage = await this.client.sendMessage(formattedTo, videoOptions as any);
          break;
        }
        case "document": {
          const docOptions: { media: string; filename: string; caption?: string } = {
            media: mediaUrl,
            filename: caption || "document",
          };
          if (caption) docOptions.caption = caption;
          sentMessage = await this.client.sendMessage(formattedTo, docOptions as any);
          break;
        }
        case "audio": {
          const audioOptions: { media: string; mimetype: string; caption?: string } = {
            media: mediaUrl,
            mimetype: "audio/mp3",
          };
          if (caption) audioOptions.caption = caption;
          sentMessage = await this.client.sendMessage(formattedTo, audioOptions as any);
          break;
        }
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      return {
        id: sentMessage.id._serialized,
        to: formattedTo,
        mediaUrl,
        caption,
        mediaType,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("[WhatsApp] Error sending media:", error);
      if (process.env.NODE_ENV === "development") {
        console.warn("[WhatsApp] Falling back to mock data");
        return this.getMockMediaMessage(to, mediaUrl, mediaType, caption);
      }
      throw error;
    }
  }

  async createGroup(name: string, participants: string[]): Promise<WhatsAppGroup> {
    if (!this.isReady || !this.client) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[WhatsApp] Client not ready, using mock data");
        return this.getMockGroup(name, participants);
      }
      throw new Error("WhatsApp client is not ready. Please initialize first.");
    }

    try {
      // Format participant numbers
      const formattedParticipants = participants.map((p) => {
        const formatted = p.replace(/[+\s-]/g, "");
        return formatted.includes("@") ? formatted : `${formatted}@c.us`;
      });

      const group = await this.client.createGroup(name, formattedParticipants);

      // Handle both string and CreateGroupResult return types
      let groupId: string;
      let groupName: string = name;

      if (typeof group === "string") {
        groupId = group;
      } else {
        groupId = group.gid._serialized;
        // Fetch the group to get the name
        const chats = await this.client.getChats();
        const foundGroup = chats.find((chat) => chat.id._serialized === groupId && chat.isGroup) as whatsapp.GroupChat | undefined;
        if (foundGroup) {
          groupName = foundGroup.name;
        }
      }

      return {
        id: groupId,
        name: groupName,
        participants: formattedParticipants,
      };
    } catch (error) {
      console.error("[WhatsApp] Error creating group:", error);
      if (process.env.NODE_ENV === "development") {
        console.warn("[WhatsApp] Falling back to mock data");
        return this.getMockGroup(name, participants);
      }
      throw error;
    }
  }

  async sendToGroup(groupId: string, message: string): Promise<WhatsAppMessage> {
    if (!this.isReady || !this.client) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[WhatsApp] Client not ready, using mock data");
        return this.getMockMessage(groupId, message);
      }
      throw new Error("WhatsApp client is not ready. Please initialize first.");
    }

    try {
      // Format group ID
      let formattedGroupId = groupId;
      if (!formattedGroupId.includes("@")) {
        formattedGroupId = `${formattedGroupId}@g.us`;
      }

      const sentMessage = await this.client.sendMessage(formattedGroupId, message);

      return {
        id: sentMessage.id._serialized,
        to: formattedGroupId,
        message,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("[WhatsApp] Error sending group message:", error);
      if (process.env.NODE_ENV === "development") {
        console.warn("[WhatsApp] Falling back to mock data");
        return this.getMockMessage(groupId, message);
      }
      throw error;
    }
  }

  // Additional methods for WhatsApp Web.js
  async getGroups(): Promise<WhatsAppGroup[]> {
    if (!this.isReady || !this.client) {
      return [];
    }

    try {
      const chats = await this.client.getChats();
      const groups = chats.filter((chat) => chat.isGroup) as whatsapp.GroupChat[];

      return groups.map((group) => ({
        id: group.id._serialized,
        name: group.name,
        participants: group.participants.map((p) => p.id._serialized),
      }));
    } catch (error) {
      console.error("[WhatsApp] Error getting groups:", error);
      return [];
    }
  }

  enableAutoReply(groups?: string[]): void {
    this.autoReplyEnabled = true;
    if (groups) {
      this.monitoredGroups = groups;
    }
  }

  disableAutoReply(): void {
    this.autoReplyEnabled = false;
  }

  setMonitoredGroups(groups: string[]): void {
    this.monitoredGroups = groups;
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
    }
  }

  getReadyState(): boolean {
    return this.isReady;
  }

  private getMockMessage(to: string, message: string): WhatsAppMessage {
    console.log(`[Mock WhatsApp] Sending message to ${to}:`);
    console.log(message);
    console.log("---");
    return {
      id: `wa-${Date.now()}`,
      to,
      message,
      timestamp: new Date(),
    };
  }

  private getMockMediaMessage(
    to: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "document" | "audio",
    caption?: string
  ): WhatsAppMediaMessage {
    console.log(`[Mock WhatsApp] Sending ${mediaType} to ${to}:`);
    console.log(`Media URL: ${mediaUrl}`);
    if (caption) {
      console.log(`Caption: ${caption}`);
    }
    console.log("---");
    return {
      id: `wa-media-${Date.now()}`,
      to,
      mediaUrl,
      caption,
      mediaType,
      timestamp: new Date(),
    };
  }

  private getMockGroup(name: string, participants: string[]): WhatsAppGroup {
    console.log(`[Mock WhatsApp] Creating group: ${name}`);
    console.log(`Participants: ${participants.join(", ")}`);
    console.log("---");
    return {
      id: `wa-group-${Date.now()}`,
      name,
      participants,
    };
  }
}
