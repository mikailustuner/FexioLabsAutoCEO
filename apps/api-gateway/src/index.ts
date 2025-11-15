import Fastify from "fastify";
import dotenv from "dotenv";
import QRCode from "qrcode";
import { createAgentContext } from "@flao/core";
import { loadConfig } from "@flao/core";
import {
  NewProjectBootstrapWorkflow,
  DailyStandupWorkflow,
  WeeklyReportWorkflow,
  ReleasePreparationWorkflow,
} from "@flao/core";
import {
  NewProjectRequestSchema,
  DailyStandupRequestSchema,
  WeeklyReportRequestSchema,
  ReleasePrepRequestSchema,
} from "@flao/shared-types";
import { logEvent } from "@flao/db";
import { MockGithubClient } from "@flao/integrations-github";
import { MockCalendarClient } from "@flao/integrations-calendar";
import { MockWhatsAppClient } from "@flao/integrations-whatsapp";
import { MockClickUpClient } from "@flao/integrations-clickup";
import { MockTelegramClient } from "@flao/integrations-telegram";
import { OpsAgent } from "@flao/agents-ops";

// Load environment variables
dotenv.config();

const config = loadConfig();

const fastify = Fastify({
  logger: true,
});

// Create WhatsApp client first (before context to avoid circular dependency)
const whatsappClient = new MockWhatsAppClient(
  config.whatsapp?.sessionDir,
  config.whatsapp?.monitoredGroups || []
);

// Create Telegram client
const telegramClient = new MockTelegramClient(config.telegram?.botToken);

// Create agent context with integrations
const context = createAgentContext(
  undefined, // db will be created by context
  undefined, // logger will be created by context
  {
    github: new MockGithubClient(config.github?.token),
    calendar: new MockCalendarClient(
      config.calendar?.googleClientId,
      config.calendar?.googleClientSecret,
      config.calendar?.googleRefreshToken
    ),
    whatsapp: whatsappClient,
    clickup: new MockClickUpClient(config.clickup?.apiKey, config.clickup?.teamId),
    telegram: telegramClient,
  }
);

// Set agent context in WhatsApp client for Ops Agent integration
whatsappClient.setAgentContext(context);

// Configure and initialize WhatsApp client (optional - requires Chrome/Chromium)
if (config.whatsapp?.autoReplyEnabled) {
  whatsappClient.enableAutoReply(config.whatsapp?.monitoredGroups);
}

// Only initialize WhatsApp if explicitly enabled or if Chrome is available
// WhatsApp requires Chrome/Chromium to run, so we make it optional
const shouldInitializeWhatsApp = config.whatsapp?.enabled !== false;
if (shouldInitializeWhatsApp) {
  whatsappClient.initialize().catch((err) => {
    console.warn("[API Gateway] WhatsApp client initialization failed (optional feature):", err.message);
    console.warn("[API Gateway] The application will continue without WhatsApp support.");
    console.warn("[API Gateway] To enable WhatsApp: Install Chrome/Chromium or set WHATSAPP_ENABLED=false to disable.");
  });
} else {
  console.log("[API Gateway] WhatsApp client is disabled (WHATSAPP_ENABLED=false)");
}

// Setup Telegram command handlers
telegramClient.on("summary-request", async ({ chatId, date }) => {
  try {
    const opsAgent = new OpsAgent();
    const targetDate = date ? new Date(date) : new Date();
    const result = await opsAgent.run(
      {
        action: "daily-summary",
        date: targetDate,
      },
      context
    );

    const summaryText = result.formattedSummary || result.summary;
    await telegramClient.sendMessageWithMarkdown(chatId, summaryText);
  } catch (error) {
    console.error("[API Gateway] Error generating daily summary:", error);
    await telegramClient.sendMessage(
      chatId,
      "Özet oluşturulurken bir hata oluştu. Lütfen tekrar deneyin."
    );
  }
});

// Start Telegram polling if token is available
if (config.telegram?.botToken) {
  telegramClient.startPolling().catch((err) => {
    console.error("[API Gateway] Failed to start Telegram polling:", err);
  });
}

// Health check
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// WhatsApp QR code endpoint (JSON - for API access)
fastify.get("/whatsapp/qr", async () => {
  return new Promise((resolve) => {
    let qrCode = "";
    const handler = (qr: string) => {
      qrCode = qr;
      whatsappClient.off("qr", handler);
      resolve({ qr: qrCode });
    };
    whatsappClient.on("qr", handler);
    
    // If already ready, return status
    if (whatsappClient.getReadyState()) {
      resolve({ status: "ready", message: "WhatsApp is already connected" });
      return;
    }
    
    // Timeout after 30 seconds
    setTimeout(() => {
      whatsappClient.off("qr", handler);
      if (!qrCode) {
        resolve({ error: "QR code timeout. Please try again." });
      }
    }, 30000);
  });
});

// WhatsApp QR code HTML page (for displaying QR code in browser)
fastify.get("/whatsapp/qr-page", async (request, reply) => {
  // If already ready, show success message
  if (whatsappClient.getReadyState()) {
    return reply.type("text/html").send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp QR Code - FLAO</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          .success {
            color: #25D366;
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          h1 { color: #333; margin: 0 0 1rem 0; }
          p { color: #666; margin: 0.5rem 0; }
          .refresh-btn {
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
          }
          .refresh-btn:hover { background: #5568d3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>WhatsApp Bağlandı!</h1>
          <p>WhatsApp başarıyla bağlandı. Bu sayfayı kapatabilirsiniz.</p>
          <button class="refresh-btn" onclick="location.reload()">Yenile</button>
        </div>
      </body>
      </html>
    `);
  }

  return new Promise((resolve) => {
    let qrCode = "";
    const handler = async (qr: string) => {
      qrCode = qr;
      whatsappClient.off("qr", handler);
      
      try {
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(qr, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        });

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>WhatsApp QR Code - FLAO</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta http-equiv="refresh" content="5">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 450px;
              }
              h1 { color: #333; margin: 0 0 1rem 0; }
              p { color: #666; margin: 0.5rem 0; line-height: 1.6; }
              .qr-code {
                margin: 1.5rem 0;
                padding: 1rem;
                background: #f5f5f5;
                border-radius: 8px;
              }
              .qr-code img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
              }
              .instructions {
                background: #e3f2fd;
                padding: 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                text-align: left;
              }
              .instructions ol {
                margin: 0.5rem 0;
                padding-left: 1.5rem;
              }
              .instructions li {
                margin: 0.5rem 0;
                color: #555;
              }
              .status {
                color: #666;
                font-size: 0.9rem;
                margin-top: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>WhatsApp QR Kod</h1>
              <p>QR kodu WhatsApp mobil uygulamanızla tarayın</p>
              <div class="qr-code">
                <img src="${qrDataUrl}" alt="WhatsApp QR Code">
              </div>
              <div class="instructions">
                <strong>Nasıl bağlanılır:</strong>
                <ol>
                  <li>WhatsApp mobil uygulamanızı açın</li>
                  <li>Ayarlar → Bağlı Cihazlar → Cihaz Bağla</li>
                  <li>QR kodu tarayın</li>
                </ol>
              </div>
              <p class="status">Bu sayfa otomatik olarak yenileniyor...</p>
            </div>
          </body>
          </html>
        `;
        
        resolve(reply.type("text/html").send(html));
      } catch (error) {
        resolve(reply.code(500).send({ error: "QR code generation failed" }));
      }
    };
    
    whatsappClient.on("qr", handler);
    
    // If QR code is already available, trigger handler
    // Otherwise wait for QR event
    
    // Timeout after 30 seconds
    setTimeout(() => {
      whatsappClient.off("qr", handler);
      if (!qrCode) {
        resolve(reply.type("text/html").send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>WhatsApp QR Code - FLAO</title>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                text-align: center;
                max-width: 400px;
              }
              h1 { color: #333; }
              p { color: #666; }
              button {
                margin-top: 1rem;
                padding: 0.75rem 1.5rem;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>QR Kod Zaman Aşımı</h1>
              <p>QR kod oluşturulamadı. Lütfen tekrar deneyin.</p>
              <button onclick="location.reload()">Yeniden Dene</button>
            </div>
          </body>
          </html>
        `));
      }
    }, 30000);
  });
});

// WhatsApp status endpoint
fastify.get("/whatsapp/status", async () => {
  return {
    ready: whatsappClient.getReadyState(),
    timestamp: new Date().toISOString(),
  };
});

// Daily summary endpoint
fastify.post("/workflows/daily-summary", async (request) => {
  try {
    const body = request.body as { date?: string; chatIds?: (string | number)[] };
    const targetDate = body.date ? new Date(body.date) : new Date();
    const chatIds = body.chatIds || config.telegram?.chatIds || [];

    const opsAgent = new OpsAgent();
    const result = await opsAgent.run(
      {
        action: "daily-summary",
        date: targetDate,
      },
      context
    );

    // Send to Telegram if chat IDs are provided
    if (chatIds.length > 0 && telegramClient) {
      const summaryText = result.formattedSummary || result.summary;
      for (const chatId of chatIds) {
        try {
          await telegramClient.sendMessageWithMarkdown(chatId, summaryText);
        } catch (error) {
          context.logger.warn(`Failed to send summary to Telegram chat ${chatId}`, { error });
        }
      }
    }

    return {
      success: true,
      summary: result.summary,
      formattedSummary: result.formattedSummary,
      date: targetDate.toISOString(),
    };
  } catch (error) {
    context.logger.error("Error generating daily summary", error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: "Failed to generate daily summary",
    };
  }
});

// Webhook routes
fastify.post("/webhooks/github", async (request) => {
  const payload = request.body as Record<string, unknown>;
  
  await logEvent(context.db, "GITHUB_COMMIT", payload);
  
  context.logger.info("GitHub webhook received", { type: payload.action || "push" });
  
  // In a real scenario, you might trigger workflows based on webhook type
  return { received: true };
});

// WhatsApp webhook - GET for verification, POST for messages
fastify.get("/webhooks/whatsapp", async (request, reply) => {
  const query = request.query as { "hub.mode"?: string; "hub.verify_token"?: string; "hub.challenge"?: string };
  
  // WhatsApp webhook verification
  const verifyToken = (config.whatsapp as { verifyToken?: string } | undefined)?.verifyToken;
  if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === verifyToken) {
    return reply.send(query["hub.challenge"]);
  }
  
  return reply.code(403).send("Forbidden");
});

fastify.post("/webhooks/whatsapp", async (request) => {
  const payload = request.body as Record<string, unknown>;
  
  // Determine event type based on payload
  const entry = payload.entry as Array<{ changes?: Array<{ value?: { messages?: unknown } }> }> | undefined;
  const eventType = entry?.[0]?.changes?.[0]?.value?.messages ? "WHATSAPP_MESSAGE" : "WHATSAPP_MESSAGE";
  await logEvent(context.db, eventType as any, payload);
  
  context.logger.info("WhatsApp webhook received", { payload });
  
  // In a real scenario, process incoming messages and respond
  // Could trigger Ops Agent for notifications or task updates
  return { received: true };
});

// ClickUp webhook
fastify.post("/webhooks/clickup", async (request) => {
  const payload = request.body as Record<string, unknown>;
  
  // Determine event type based on ClickUp event
  let eventType = "CLICKUP_TASK_UPDATED";
  if (payload.event === "taskCreated") {
    eventType = "CLICKUP_TASK_CREATED";
  } else if (payload.event === "taskStatusUpdated") {
    eventType = "CLICKUP_TASK_STATUS_CHANGED";
  }
  
  await logEvent(context.db, eventType as any, payload);
  
  context.logger.info("ClickUp webhook received", { event: payload.event });
  
  // In a real scenario, sync task updates with internal Task model
  // Could trigger PM Agent or Ops Agent for task status changes
  return { received: true };
});

// Workflow routes
fastify.post("/workflows/new-project", async (request) => {
  const body = NewProjectRequestSchema.parse(request.body);
  
  const workflow = new NewProjectBootstrapWorkflow();
  const result = await workflow.run(
    {
      name: body.name,
      description: body.description,
      clientInfo: body.clientInfo,
    },
    context
  );
  
  return result;
});

fastify.post("/workflows/daily-standup/run", async (request) => {
  const body = DailyStandupRequestSchema.parse(request.body || {});
  
  const workflow = new DailyStandupWorkflow();
  const result = await workflow.run(
    {
      date: body.date ? new Date(body.date) : undefined,
    },
    context
  );
  
  return result;
});

fastify.post("/workflows/weekly-report/run", async (request) => {
  const body = WeeklyReportRequestSchema.parse(request.body || {});
  
  const workflow = new WeeklyReportWorkflow();
  const result = await workflow.run(
    {
      weekStart: body.weekStart ? new Date(body.weekStart) : undefined,
      weekEnd: body.weekEnd ? new Date(body.weekEnd) : undefined,
    },
    context
  );
  
  return result;
});

fastify.post("/workflows/release-prep", async (request) => {
  const body = ReleasePrepRequestSchema.parse(request.body);
  
  const workflow = new ReleasePreparationWorkflow();
  const result = await workflow.run(
    {
      projectId: body.projectId,
      version: body.version,
    },
    context
  );
  
  return result;
});

// Start server
const start = async () => {
  try {
    const port = config.api.port;
    await fastify.listen({ port, host: "0.0.0.0" });
    context.logger.info(`API Gateway started on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

