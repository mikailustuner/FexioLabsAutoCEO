import type { Agent, AgentContext } from "@flao/core";
import {
  getActiveEmployees,
  getStandupsByDate,
  createStandup,
  getTasksByAssignee,
  assignTask,
  updateEmployeeWorkload,
  getTasksByStatus,
  getAllProjects,
} from "@flao/db";

export interface OpsAgentInput {
  date?: Date;
  taskIds?: string[];
  action?: "collect-standups" | "assign-tasks" | "nudge-late-tasks" | "daily-summary";
}

export interface OpsAgentOutput {
  standupsCollected?: number;
  tasksAssigned?: number;
  nudgesSent?: number;
  summary: string;
  formattedSummary?: string; // Markdown formatted summary for Telegram
}

export class OpsAgent implements Agent<OpsAgentInput, OpsAgentOutput> {
  name = "Ops Agent";

  async run(input: OpsAgentInput, context: AgentContext): Promise<OpsAgentOutput> {
    context.logger.info(`Ops Agent running action: ${input.action || "collect-standups"}`);

    const action = input.action || "collect-standups";

    switch (action) {
      case "collect-standups":
        return this.collectStandups(input.date || new Date(), context);
      case "assign-tasks":
        return this.assignTasks(input.taskIds || [], context);
      case "nudge-late-tasks":
        return this.nudgeLateTasks(context);
      case "daily-summary":
        return this.generateDailySummary(input.date || new Date(), context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async collectStandups(date: Date, context: AgentContext): Promise<OpsAgentOutput> {
    const employees = await getActiveEmployees(context.db);
    const existingStandups = await getStandupsByDate(context.db, date);

    const existingEmployeeIds = new Set(existingStandups.map((s) => s.employeeId));
    const employeesWithoutStandup = employees.filter((e) => !existingEmployeeIds.has(e.id));

    // For now, we'll create placeholder standups for employees who haven't submitted
    // In a real scenario, this would prompt employees or read from Slack
    let standupsCreated = 0;

    for (const employee of employeesWithoutStandup) {
      // Create a placeholder standup (in real scenario, this would come from employee input)
      await createStandup(context.db, {
        employee: { connect: { id: employee.id } },
        date,
        yesterday: "Standup henüz girilmedi",
        today: "Standup bekleniyor",
        blockers: null,
      });
      standupsCreated++;
    }

    const totalStandups = existingStandups.length + standupsCreated;

    return {
      standupsCollected: totalStandups,
      summary: `Toplam ${totalStandups} standup toplandı. ${standupsCreated > 0 ? `${standupsCreated} yeni standup oluşturuldu.` : "Tüm ekip standup'ını tamamlamış."}`,
    };
  }

  private async assignTasks(taskIds: string[], context: AgentContext): Promise<OpsAgentOutput> {
    if (taskIds.length === 0) {
      return {
        tasksAssigned: 0,
        summary: "Atanacak task yok.",
      };
    }

    const employees = await getActiveEmployees(context.db);
    const developers = employees.filter(
      (e) => e.role === "DEVELOPER" || e.role === "DESIGNER" || e.role === "QA"
    );

    if (developers.length === 0) {
      return {
        tasksAssigned: 0,
        summary: "Atama yapılabilecek developer bulunamadı.",
      };
    }

    // Simple round-robin assignment based on workload
    const sortedByWorkload = developers.sort((a, b) => a.workloadScore - b.workloadScore);

    let assignedCount = 0;
    for (let i = 0; i < taskIds.length; i++) {
      const employee = sortedByWorkload[i % sortedByWorkload.length];
      try {
        await assignTask(context.db, taskIds[i], employee.id);
        
        // Update workload
        const newWorkload = Math.min(1.0, employee.workloadScore + 0.1);
        await updateEmployeeWorkload(context.db, employee.id, newWorkload);
        
        assignedCount++;
      } catch (error) {
        context.logger.warn(`Failed to assign task ${taskIds[i]}`, { error });
      }
    }

    return {
      tasksAssigned: assignedCount,
      summary: `${assignedCount} task atandı. İş yükü dengelendi.`,
    };
  }

  private async nudgeLateTasks(context: AgentContext): Promise<OpsAgentOutput> {
    const employees = await getActiveEmployees(context.db);
    const now = new Date();
    let nudgesSent = 0;

    for (const employee of employees) {
      const tasks = await getTasksByAssignee(context.db, employee.id);
      const lateTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate) < now && task.status !== "DONE";
      });

      if (lateTasks.length > 0) {
        const taskList = lateTasks.map((t) => `- ${t.title}`).join("\n");
        const message = `Merhaba ${employee.name}, birkaç task planlanan tarihin gerisine düşmüş durumda:\n\n${taskList}\n\nDestek gerekiyorsa söyle, birlikte çözelim.`;

        try {
          // Log the nudge (in real scenario, this could be sent via Telegram, WhatsApp, or email)
          context.logger.info(`Would send nudge to ${employee.name}: ${message}`);
          nudgesSent++;
        } catch (error) {
          context.logger.warn(`Failed to send nudge to ${employee.name}`, { error });
        }
      }
    }

    return {
      nudgesSent,
      summary: `${nudgesSent} geç kalan task için hatırlatma gönderildi.`,
    };
  }

  private async generateDailySummary(date: Date, context: AgentContext): Promise<OpsAgentOutput> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get completed tasks today
    const allTasks = await context.db.task.findMany({
      where: {
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        assignee: true,
        project: true,
      },
    });

    const completedToday = allTasks.filter((t) => t.status === "DONE");
    const startedToday = allTasks.filter(
      (t) => t.status === "IN_PROGRESS" && new Date(t.updatedAt) >= startOfDay
    );

    // Get pending and blocked tasks
    const pendingTasks = await getTasksByStatus(context.db, "TODO");
    const blockedTasks = await getTasksByStatus(context.db, "BLOCKED");
    const inProgressTasks = await getTasksByStatus(context.db, "IN_PROGRESS");

    // Get standups for the day
    const standups = await getStandupsByDate(context.db, date);

    // Get active projects
    const activeProjects = await getAllProjects(context.db);
    const activeProjectsCount = activeProjects.filter(
      (p) => p.status === "ACTIVE" || p.status === "PLANNING"
    ).length;

    // Format summary
    const dateStr = date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let summary = `📊 *Günlük Özet - ${dateStr}*\n\n`;

    // Completed tasks
    summary += `✅ *Tamamlanan Tasklar* (${completedToday.length})\n`;
    if (completedToday.length > 0) {
      completedToday.slice(0, 10).forEach((task) => {
        const assigneeName = task.assignee?.name || "Atanmamış";
        summary += `• ${task.title} - ${assigneeName}\n`;
      });
      if (completedToday.length > 10) {
        summary += `... ve ${completedToday.length - 10} task daha\n`;
      }
    } else {
      summary += `Bugün tamamlanan task yok.\n`;
    }
    summary += `\n`;

    // Started tasks
    if (startedToday.length > 0) {
      summary += `🚀 *Başlatılan Tasklar* (${startedToday.length})\n`;
      startedToday.slice(0, 5).forEach((task) => {
        const assigneeName = task.assignee?.name || "Atanmamış";
        summary += `• ${task.title} - ${assigneeName}\n`;
      });
      summary += `\n`;
    }

    // Pending tasks - getTasksByStatus includes assignee, but TypeScript doesn't know
    summary += `📋 *Bekleyen Tasklar* (${pendingTasks.length})\n`;
    if (pendingTasks.length > 0) {
      pendingTasks.slice(0, 5).forEach((task) => {
        const taskWithAssignee = task as typeof task & { assignee?: { name: string } | null };
        const assigneeName = taskWithAssignee.assignee?.name || "Atanmamış";
        summary += `• ${task.title} - ${assigneeName}\n`;
      });
      if (pendingTasks.length > 5) {
        summary += `... ve ${pendingTasks.length - 5} task daha\n`;
      }
    } else {
      summary += `Bekleyen task yok.\n`;
    }
    summary += `\n`;

    // Blocked tasks
    if (blockedTasks.length > 0) {
      summary += `🚫 *Bloke Tasklar* (${blockedTasks.length})\n`;
      blockedTasks.slice(0, 5).forEach((task) => {
        const taskWithAssignee = task as typeof task & { assignee?: { name: string } | null };
        const assigneeName = taskWithAssignee.assignee?.name || "Atanmamış";
        summary += `• ${task.title} - ${assigneeName}\n`;
      });
      summary += `\n`;
    }

    // In progress tasks
    summary += `⚙️ *Devam Eden Tasklar* (${inProgressTasks.length})\n`;
    if (inProgressTasks.length > 0) {
      inProgressTasks.slice(0, 5).forEach((task) => {
        const taskWithAssignee = task as typeof task & { assignee?: { name: string } | null };
        const assigneeName = taskWithAssignee.assignee?.name || "Atanmamış";
        summary += `• ${task.title} - ${assigneeName}\n`;
      });
      if (inProgressTasks.length > 5) {
        summary += `... ve ${inProgressTasks.length - 5} task daha\n`;
      }
    }
    summary += `\n`;

    // Standups
    summary += `👥 *Standup'lar* (${standups.length})\n`;
    if (standups.length > 0) {
      const employeesWithStandup = new Set(standups.map((s) => s.employeeId));
      summary += `${employeesWithStandup.size} kişi standup'ını tamamlamış.\n`;
    } else {
      summary += `Bugün standup girilmemiş.\n`;
    }
    summary += `\n`;

    // Active projects
    summary += `📁 *Aktif Projeler*: ${activeProjectsCount}\n`;

    // Summary text (plain)
    const plainSummary = `Günlük özet: ${completedToday.length} task tamamlandı, ${pendingTasks.length} bekleyen, ${blockedTasks.length} bloke, ${inProgressTasks.length} devam ediyor. ${standups.length} standup toplandı.`;

    return {
      summary: plainSummary,
      formattedSummary: summary,
    };
  }
}
