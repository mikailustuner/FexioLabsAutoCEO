import whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { EventEmitter } from "events";
import path from "path";
export class MockWhatsAppClient extends EventEmitter {
    client = null;
    sessionDir;
    isReady = false;
    monitoredGroups = [];
    autoReplyEnabled = false;
    agentContext;
    constructor(sessionDir, monitoredGroups = [], agentContext) {
        super();
        this.sessionDir = sessionDir || path.join(process.cwd(), ".wwebjs_auth");
        this.monitoredGroups = monitoredGroups;
        this.agentContext = agentContext;
    }
    setAgentContext(context) {
        this.agentContext = context;
    }
    async initialize() {
        if (this.client) {
            return;
        }
        this.client = new whatsapp.Client({
            authStrategy: new whatsapp.LocalAuth({
                dataPath: this.sessionDir,
            }),
            puppeteer: {
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            },
        });
        this.client.on("qr", (qr) => {
            console.log("\n[WhatsApp] QR Code oluşturuldu. WhatsApp mobil uygulamanızla tarayın:\n");
            qrcode.generate(qr, { small: true });
            console.log("\n");
            this.emit("qr", qr);
        });
        this.client.on("ready", () => {
            console.log("[WhatsApp] Bağlantı başarılı! WhatsApp hazır.");
            this.isReady = true;
            this.emit("ready");
        });
        this.client.on("authenticated", () => {
            console.log("[WhatsApp] Kimlik doğrulama başarılı!");
        });
        this.client.on("auth_failure", (msg) => {
            console.error("[WhatsApp] Kimlik doğrulama hatası:", msg);
            this.emit("auth_failure", msg);
        });
        this.client.on("disconnected", (reason) => {
            console.log("[WhatsApp] Bağlantı kesildi:", reason);
            this.isReady = false;
            this.emit("disconnected", reason);
        });
        this.client.on("message", async (message) => {
            await this.handleIncomingMessage(message);
        });
        await this.client.initialize();
    }
    async handleIncomingMessage(message) {
        try {
            const contact = await message.getContact();
            const chat = await message.getChat();
            const isGroup = chat.isGroup;
            if (message.fromMe) {
                return;
            }
            const messageEvent = {
                from: contact.id.user,
                body: message.body,
                isGroup,
                groupName: isGroup ? chat.name : undefined,
                timestamp: new Date(message.timestamp * 1000),
                messageId: message.id._serialized,
            };
            this.emit("message", messageEvent);
            if (isGroup) {
                console.log(`[WhatsApp] Grup mesajı (${chat.name}): ${message.body.substring(0, 50)}...`);
            }
            else {
                console.log(`[WhatsApp] Mesaj (${contact.pushname || contact.number}): ${message.body.substring(0, 50)}...`);
            }
            if (this.autoReplyEnabled && isGroup) {
                const groupChat = chat;
                const groupId = groupChat.id._serialized;
                if (this.monitoredGroups.length === 0 || this.monitoredGroups.includes(groupId) || this.monitoredGroups.includes(groupChat.name)) {
                    await this.handleGroupMessageAutoReply(message, groupChat);
                }
            }
        }
        catch (error) {
            console.error("[WhatsApp] Error handling incoming message:", error);
        }
    }
    async handleGroupMessageAutoReply(message, groupChat) {
        const body = message.body.toLowerCase();
        let reply = null;
        if (this.agentContext) {
            try {
                if (body.includes("standup") || body.includes("günlük") || body.includes("bugün")) {
                    const { OpsAgent } = await import("@flao/agents-ops");
                    const opsAgent = new OpsAgent();
                    const result = await opsAgent.run({
                        action: "collect-standups",
                        date: new Date(),
                    }, this.agentContext);
                    reply = `Standup özeti: ${result.summary}`;
                }
                else if (body.includes("task") || body.includes("görev") || body.includes("iş")) {
                    reply = "Task durumunu kontrol ediyorum, kısa süre içinde bilgi vereceğim.";
                }
                else if (body.includes("rapor") || body.includes("report") || body.includes("özet")) {
                    reply = "Rapor hazırlıyorum, birazdan paylaşacağım.";
                }
                else if (body.includes("@flao") || body.includes("flao")) {
                    reply = "Merhaba! Nasıl yardımcı olabilirim? Standup, rapor veya task durumu hakkında bilgi almak için yazabilirsiniz.";
                }
            }
            catch (error) {
                console.error("[WhatsApp] Error in Ops Agent integration:", error);
                reply = "Mesajınızı aldım, işleme alıyorum. Detaylı yanıt için biraz bekleyin.";
            }
        }
        else {
            if (body.includes("@flao") || body.includes("flao") || body.includes("standup") || body.includes("rapor")) {
                reply = "Mesajınızı aldım, işleme alıyorum. Detaylı yanıt için biraz bekleyin.";
            }
        }
        if (reply) {
            await this.sendToGroup(groupChat.id._serialized, reply);
        }
    }
    async sendMessage(to, message) {
        if (!this.isReady || !this.client) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[WhatsApp] Client not ready, using mock data");
                return this.getMockMessage(to, message);
            }
            throw new Error("WhatsApp client is not ready. Please initialize first.");
        }
        try {
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
        }
        catch (error) {
            console.error("[WhatsApp] Error sending message:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[WhatsApp] Falling back to mock data");
                return this.getMockMessage(to, message);
            }
            throw error;
        }
    }
    async sendMedia(to, mediaUrl, mediaType, caption) {
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
                    const imageOptions = { media: mediaUrl };
                    if (caption)
                        imageOptions.caption = caption;
                    sentMessage = await this.client.sendMessage(formattedTo, imageOptions);
                    break;
                }
                case "video": {
                    const videoOptions = { media: mediaUrl };
                    if (caption)
                        videoOptions.caption = caption;
                    sentMessage = await this.client.sendMessage(formattedTo, videoOptions);
                    break;
                }
                case "document": {
                    const docOptions = {
                        media: mediaUrl,
                        filename: caption || "document",
                    };
                    if (caption)
                        docOptions.caption = caption;
                    sentMessage = await this.client.sendMessage(formattedTo, docOptions);
                    break;
                }
                case "audio": {
                    const audioOptions = {
                        media: mediaUrl,
                        mimetype: "audio/mp3",
                    };
                    if (caption)
                        audioOptions.caption = caption;
                    sentMessage = await this.client.sendMessage(formattedTo, audioOptions);
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
        }
        catch (error) {
            console.error("[WhatsApp] Error sending media:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[WhatsApp] Falling back to mock data");
                return this.getMockMediaMessage(to, mediaUrl, mediaType, caption);
            }
            throw error;
        }
    }
    async createGroup(name, participants) {
        if (!this.isReady || !this.client) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[WhatsApp] Client not ready, using mock data");
                return this.getMockGroup(name, participants);
            }
            throw new Error("WhatsApp client is not ready. Please initialize first.");
        }
        try {
            const formattedParticipants = participants.map((p) => {
                const formatted = p.replace(/[+\s-]/g, "");
                return formatted.includes("@") ? formatted : `${formatted}@c.us`;
            });
            const group = await this.client.createGroup(name, formattedParticipants);
            let groupId;
            let groupName = name;
            if (typeof group === "string") {
                groupId = group;
            }
            else {
                groupId = group.gid._serialized;
                const chats = await this.client.getChats();
                const foundGroup = chats.find((chat) => chat.id._serialized === groupId && chat.isGroup);
                if (foundGroup) {
                    groupName = foundGroup.name;
                }
            }
            return {
                id: groupId,
                name: groupName,
                participants: formattedParticipants,
            };
        }
        catch (error) {
            console.error("[WhatsApp] Error creating group:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[WhatsApp] Falling back to mock data");
                return this.getMockGroup(name, participants);
            }
            throw error;
        }
    }
    async sendToGroup(groupId, message) {
        if (!this.isReady || !this.client) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[WhatsApp] Client not ready, using mock data");
                return this.getMockMessage(groupId, message);
            }
            throw new Error("WhatsApp client is not ready. Please initialize first.");
        }
        try {
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
        }
        catch (error) {
            console.error("[WhatsApp] Error sending group message:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[WhatsApp] Falling back to mock data");
                return this.getMockMessage(groupId, message);
            }
            throw error;
        }
    }
    async getGroups() {
        if (!this.isReady || !this.client) {
            return [];
        }
        try {
            const chats = await this.client.getChats();
            const groups = chats.filter((chat) => chat.isGroup);
            return groups.map((group) => ({
                id: group.id._serialized,
                name: group.name,
                participants: group.participants.map((p) => p.id._serialized),
            }));
        }
        catch (error) {
            console.error("[WhatsApp] Error getting groups:", error);
            return [];
        }
    }
    enableAutoReply(groups) {
        this.autoReplyEnabled = true;
        if (groups) {
            this.monitoredGroups = groups;
        }
    }
    disableAutoReply() {
        this.autoReplyEnabled = false;
    }
    setMonitoredGroups(groups) {
        this.monitoredGroups = groups;
    }
    async destroy() {
        if (this.client) {
            await this.client.destroy();
            this.client = null;
            this.isReady = false;
        }
    }
    getReadyState() {
        return this.isReady;
    }
    getMockMessage(to, message) {
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
    getMockMediaMessage(to, mediaUrl, mediaType, caption) {
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
    getMockGroup(name, participants) {
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
//# sourceMappingURL=whatsapp-client.js.map