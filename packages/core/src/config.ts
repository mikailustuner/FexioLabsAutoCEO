import { z } from "zod";

const configSchema = z.object({
  database: z.object({
    url: z.string().url(),
  }),
  openai: z
    .object({
      apiKey: z.string().optional(),
    })
    .optional(),
  gemini: z
    .object({
      apiKey: z.string().optional(),
    })
    .optional(),
  github: z
    .object({
      token: z.string().optional(),
      webhookSecret: z.string().optional(),
    })
    .optional(),
  calendar: z
    .object({
      googleClientId: z.string().optional(),
      googleClientSecret: z.string().optional(),
      googleRefreshToken: z.string().optional(),
    })
    .optional(),
  whatsapp: z
    .object({
      sessionDir: z.string().optional(),
      monitoredGroups: z.array(z.string()).optional(),
      autoReplyEnabled: z.boolean().optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
  clickup: z
    .object({
      apiKey: z.string().optional(),
      teamId: z.string().optional(),
    })
    .optional(),
  telegram: z
    .object({
      botToken: z.string().optional(),
      chatIds: z.array(z.union([z.string(), z.number()])).optional(),
    })
    .optional(),
  api: z.object({
    port: z.coerce.number().default(3000),
    nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const rawConfig = {
    database: {
      url: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/flao",
    },
    openai: process.env.OPENAI_API_KEY
      ? {
          apiKey: process.env.OPENAI_API_KEY,
        }
      : undefined,
    gemini: process.env.GEMINI_API_KEY
      ? {
          apiKey: process.env.GEMINI_API_KEY,
        }
      : undefined,
    github: {
      token: process.env.GITHUB_TOKEN,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    },
    calendar: {
      googleClientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      googleRefreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
    },
    whatsapp: {
      sessionDir: process.env.WHATSAPP_SESSION_DIR,
      monitoredGroups: process.env.WHATSAPP_MONITORED_GROUPS
        ? process.env.WHATSAPP_MONITORED_GROUPS.split(",").map((g) => g.trim())
        : undefined,
      autoReplyEnabled: process.env.WHATSAPP_AUTO_REPLY_ENABLED === "true",
      enabled: process.env.WHATSAPP_ENABLED !== "false", // Default to true, set to "false" to disable
    },
    clickup: {
      apiKey: process.env.CLICKUP_API_KEY,
      teamId: process.env.CLICKUP_TEAM_ID,
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatIds: process.env.TELEGRAM_CHAT_IDS
        ? process.env.TELEGRAM_CHAT_IDS.split(",").map((id) => {
            const numId = Number(id.trim());
            return isNaN(numId) ? id.trim() : numId;
          })
        : undefined,
    },
    api: {
      port: process.env.PORT || "3000",
      nodeEnv: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
    },
  };

  return configSchema.parse(rawConfig);
}

