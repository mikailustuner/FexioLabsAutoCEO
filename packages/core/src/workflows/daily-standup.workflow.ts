import type { AgentContext, Workflow } from "../types/workflow.js";
import { createWorkflowRun, updateWorkflowRunStatus, logEvent, type WorkflowType } from "@flao/db";

export interface DailyStandupInput {
  date?: Date;
}

export interface DailyStandupOutput {
  standupsCollected: number;
  summary: string;
}

export class DailyStandupWorkflow implements Workflow<DailyStandupInput, DailyStandupOutput> {
  name = "DailyStandup";

  async run(input: DailyStandupInput, context: AgentContext): Promise<DailyStandupOutput> {
    const date = input.date || new Date();
    const workflowRun = await createWorkflowRun(context.db, {
      type: "DAILY_STANDUP" as WorkflowType,
      status: "RUNNING",
      startedAt: new Date(),
      metadata: { date: date.toISOString() },
    });

    await logEvent(context.db, "WORKFLOW_TRIGGERED", {
      workflowType: this.name,
      workflowRunId: workflowRun.id,
    });

    try {
      context.logger.info(`Starting ${this.name} workflow for date: ${date.toISOString()}`);

      // Step 1: Ops Agent collects standups
      context.logger.info("Step 1: Ops Agent collecting standups");
      const opsOutput = await this.runOpsAgent({ date }, context);

      // Step 2: Generate summary
      const summary = await this.generateSummary(opsOutput, context);

      const resultSummary = `Toplam ${opsOutput.standupsCollected} standup toplandı.`;

      await updateWorkflowRunStatus(context.db, workflowRun.id, "COMPLETED", resultSummary);

      await logEvent(context.db, "WORKFLOW_COMPLETED", {
        workflowRunId: workflowRun.id,
        status: "COMPLETED",
        summary: resultSummary,
      });

      return {
        standupsCollected: opsOutput.standupsCollected,
        summary,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      context.logger.error(`Workflow ${this.name} failed`, error instanceof Error ? error : undefined);

      await updateWorkflowRunStatus(context.db, workflowRun.id, "FAILED", errorMessage);

      await logEvent(context.db, "WORKFLOW_COMPLETED", {
        workflowRunId: workflowRun.id,
        status: "FAILED",
        summary: errorMessage,
      });

      throw error;
    }
  }

  private async runOpsAgent(
    input: { date: Date },
    context: AgentContext
  ): Promise<{ standupsCollected: number }> {
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { OpsAgent } = await import("@flao/agents-ops");
    const agent = new OpsAgent();
    const result = await agent.run(
      {
        date: input.date,
        action: "collect-standups",
      },
      context
    );
    return {
      standupsCollected: result.standupsCollected || 0,
    };
  }

  private async generateSummary(
    opsOutput: { standupsCollected: number },
    context: AgentContext
  ): Promise<string> {
    if (opsOutput.standupsCollected === 0) {
      return "Bugün henüz standup toplanmadı. Ekip üyelerinden standup bekleniyor.";
    }

    // Use LLM if available, otherwise return a simple summary
    if (context.llm) {
      try {
        const prompt = `Bugün ${opsOutput.standupsCollected} standup toplandı. Türkçe, casual-profesyonel bir tonla günlük standup özeti oluştur. Özet şunları içermeli: tamamlanan işler, devam eden işler, bloklar.`;
        return await context.llm.generate({ prompt, temperature: 0.7 });
      } catch (error) {
        context.logger.warn("LLM summary generation failed, using fallback", { error });
      }
    }

    return `Özet: Bugün ${opsOutput.standupsCollected} standup toplandı. Detaylar için veritabanını kontrol edin.`;
  }
}

