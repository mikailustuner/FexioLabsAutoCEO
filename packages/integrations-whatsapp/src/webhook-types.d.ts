export interface WhatsAppWebhookPayload {
    object: "whatsapp_business_account";
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: "whatsapp";
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: {
                        name: string;
                    };
                    wa_id: string;
                }>;
                messages?: Array<{
                    from: string;
                    id: string;
                    timestamp: string;
                    type: "text" | "image" | "video" | "document" | "audio";
                    text?: {
                        body: string;
                    };
                    image?: {
                        caption?: string;
                        mime_type: string;
                        sha256: string;
                        id: string;
                    };
                    video?: {
                        caption?: string;
                        mime_type: string;
                        sha256: string;
                        id: string;
                    };
                    document?: {
                        caption?: string;
                        filename: string;
                        mime_type: string;
                        sha256: string;
                        id: string;
                    };
                    audio?: {
                        mime_type: string;
                        sha256: string;
                        id: string;
                    };
                }>;
                statuses?: Array<{
                    id: string;
                    status: "sent" | "delivered" | "read" | "failed";
                    timestamp: string;
                    recipient_id: string;
                }>;
            };
            field: "messages";
        }>;
    }>;
}
//# sourceMappingURL=webhook-types.d.ts.map