import type { AgentContext, Workflow } from "../types/workflow.js";
import {
  createWorkflowRun,
  updateWorkflowRunStatus,
  logEvent,
  getTasksByStatus,
  getProjectsByStatus,
  getEventsSince,
  type WorkflowType,
  type TaskStatus,
} from "@flao/db";

export interface WeeklyReportInput {
  weekStart?: Date;
  weekEnd?: Date;
}

export interface WeeklyReportOutput {
  completedTasks: number;
  ongoingProjects: number;
  blockedItems: number;
  summary: string;
}

export class WeeklyReportWorkflow implements Workflow<WeeklyReportInput, WeeklyReportOutput> {
  name = "WeeklyReport";

  async run(input: WeeklyReportInput, context: AgentContext): Promise<WeeklyReportOutput> {
    const now = new Date();
    const weekStart = input.weekStart || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = input.weekEnd || now;

    const workflowRun = await createWorkflowRun(context.db, {
      type: "WEEKLY_REPORT" as WorkflowType,
      status: "RUNNING",
      startedAt: new Date(),
      metadata: { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() },
    });

    await logEvent(context.db, "WORKFLOW_TRIGGERED", {
      workflowType: this.name,
      workflowRunId: workflowRun.id,
    });

    try {
      context.logger.info(
        `Starting ${this.name} workflow for period: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`
      );

      // Gather data
      const completedTasks = await getTasksByStatus(context.db, "DONE" as TaskStatus);
      const ongoingProjects = await getProjectsByStatus(context.db, "ACTIVE");
      const blockedTasks = await getTasksByStatus(context.db, "BLOCKED" as TaskStatus);
      const recentEvents = await getEventsSince(context.db, weekStart);

      // Filter completed tasks by date range
      const completedThisWeek = completedTasks.filter((task) => {
        if (!task.updatedAt) return false;
        const updated = new Date(task.updatedAt);
        return updated >= weekStart && updated <= weekEnd;
      });

      // Generate summary
      const summary = await this.generateSummary(
        {
          completedTasks: completedThisWeek.length,
          ongoingProjects: ongoingProjects.length,
          blockedItems: blockedTasks.length,
          recentEvents: recentEvents.length,
        },
        context
      );

      const resultSummary = `Haftalık rapor: ${completedThisWeek.length} task tamamlandı, ${ongoingProjects.length} aktif proje, ${blockedTasks.length} bloklu item.`;

      await updateWorkflowRunStatus(context.db, workflowRun.id, "COMPLETED", resultSummary);

      await logEvent(context.db, "WORKFLOW_COMPLETED", {
        workflowRunId: workflowRun.id,
        status: "COMPLETED",
        summary: resultSummary,
      });

      return {
        completedTasks: completedThisWeek.length,
        ongoingProjects: ongoingProjects.length,
        blockedItems: blockedTasks.length,
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

  private async generateSummary(
    data: {
      completedTasks: number;
      ongoingProjects: number;
      blockedItems: number;
      recentEvents: number;
    },
    context: AgentContext
  ): Promise<string> {
    if (context.llm) {
      try {
        const prompt = `Haftalık rapor özeti oluştur. Türkçe, casual-profesyonel ton. Veriler: ${data.completedTasks} tamamlanan task, ${data.ongoingProjects} aktif proje, ${data.blockedItems} bloklu item, ${data.recentEvents} event. Öncelikler ve öneriler ekle.`;
        return await context.llm.generate({ prompt, temperature: 0.7 });
      } catch (error) {
        context.logger.warn("LLM summary generation failed, using fallback", { error });
      }
    }

    return `Haftalık Özet:
- Tamamlanan Tasklar: ${data.completedTasks}
- Aktif Projeler: ${data.ongoingProjects}
- Bloklu Itemlar: ${data.blockedItems}
- Toplam Event: ${data.recentEvents}

${data.blockedItems > 0 ? "⚠️ Bloklu itemlar var, dikkat edilmesi gerekiyor." : "✅ Blok yok, işler akıcı ilerliyor."}`;
  }
}

