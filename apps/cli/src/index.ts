#!/usr/bin/env node

import dotenv from "dotenv";
import { createAgentContext } from "@flao/core";
import { loadConfig } from "@flao/core";
import {
  NewProjectBootstrapWorkflow,
  DailyStandupWorkflow,
  WeeklyReportWorkflow,
} from "@flao/core";
import { MockGithubClient } from "@flao/integrations-github";
import { MockCalendarClient } from "@flao/integrations-calendar";
import { MockWhatsAppClient } from "@flao/integrations-whatsapp";
import { MockClickUpClient } from "@flao/integrations-clickup";
import { MockTelegramClient } from "@flao/integrations-telegram";

// Load environment variables
dotenv.config();

const config = loadConfig();

// Create agent context
// Create WhatsApp client first (before context to avoid circular dependency)
const whatsappClient = new MockWhatsAppClient(
  config.whatsapp?.sessionDir,
  config.whatsapp?.monitoredGroups || []
);

// Create Telegram client
const telegramClient = new MockTelegramClient(config.telegram?.botToken);

const context = createAgentContext(
  undefined,
  undefined,
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

// Configure and initialize WhatsApp client
if (config.whatsapp?.autoReplyEnabled) {
  whatsappClient.enableAutoReply(config.whatsapp?.monitoredGroups);
}
whatsappClient.initialize().catch((err) => {
  console.error("[CLI] Failed to initialize WhatsApp client:", err);
});

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "simulate:new-project": {
        context.logger.info("Running new project simulation...");
        
        const workflow = new NewProjectBootstrapWorkflow();
        const result = await workflow.run(
          {
            name: "Yeni Mobil Uygulama",
            description: "Kullanıcıların sosyal medya içeriklerini paylaşabileceği bir mobil uygulama. MVP olarak temel paylaşım ve profil özellikleri içermeli.",
            clientInfo: {
              name: "Test Müşteri",
              email: "test@example.com",
              requirements: "React Native, backend API, kullanıcı kimlik doğrulama",
            },
          },
          context
        );
        
        console.log("\n✅ Proje oluşturuldu!");
        console.log(`Project ID: ${result.projectId}`);
        console.log(`Tasks Created: ${result.tasksCreated}`);
        console.log(`Summary: ${result.summary}\n`);
        break;
      }

      case "run:daily-standup": {
        context.logger.info("Running daily standup workflow...");
        
        const workflow = new DailyStandupWorkflow();
        const result = await workflow.run({}, context);
        
        console.log("\n✅ Daily standup completed!");
        console.log(`Standups Collected: ${result.standupsCollected}`);
        console.log(`Summary:\n${result.summary}\n`);
        break;
      }

      case "run:weekly-report": {
        context.logger.info("Running weekly report workflow...");
        
        const workflow = new WeeklyReportWorkflow();
        const result = await workflow.run({}, context);
        
        console.log("\n✅ Weekly report generated!");
        console.log(`Completed Tasks: ${result.completedTasks}`);
        console.log(`Ongoing Projects: ${result.ongoingProjects}`);
        console.log(`Blocked Items: ${result.blockedItems}`);
        console.log(`Summary:\n${result.summary}\n`);
        break;
      }

      default:
        console.log(`
FLAO CLI

Usage:
  flao simulate:new-project    Run new project bootstrap workflow
  flao run:daily-standup       Trigger daily standup workflow
  flao run:weekly-report       Generate weekly report

Examples:
  pnpm dev:cli simulate:new-project
  pnpm dev:cli run:daily-standup
  pnpm dev:cli run:weekly-report
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    // Cleanup
    await context.db.$disconnect();
  }
}

main();

