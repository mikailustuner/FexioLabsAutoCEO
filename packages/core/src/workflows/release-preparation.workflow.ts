import type { AgentContext, Workflow } from "../types/workflow.js";
import {
  createWorkflowRun,
  updateWorkflowRunStatus,
  logEvent,
  getProjectById,
  getTasksByProject,
  type WorkflowType,
  type Project,
  type Task,
} from "@flao/db";

export interface ReleasePreparationInput {
  projectId: string;
  version: string;
}

export interface ReleasePreparationOutput {
  projectId: string;
  version: string;
  qualityAssessment: string;
  releaseNotes: string;
}

export class ReleasePreparationWorkflow
  implements Workflow<ReleasePreparationInput, ReleasePreparationOutput>
{
  name = "ReleasePreparation";

  async run(
    input: ReleasePreparationInput,
    context: AgentContext
  ): Promise<ReleasePreparationOutput> {
    const workflowRun = await createWorkflowRun(context.db, {
      type: "RELEASE_PREP" as WorkflowType,
      status: "RUNNING",
      startedAt: new Date(),
      metadata: { projectId: input.projectId, version: input.version },
    });

    await logEvent(context.db, "WORKFLOW_TRIGGERED", {
      workflowType: this.name,
      workflowRunId: workflowRun.id,
    });

    try {
      context.logger.info(
        `Starting ${this.name} workflow for project: ${input.projectId}, version: ${input.version}`
      );

      const project = await getProjectById(context.db, input.projectId);
      if (!project) {
        throw new Error(`Project not found: ${input.projectId}`);
      }

      const tasks = await getTasksByProject(context.db, input.projectId);

      // Step 1: QA Agent - Quality assessment
      context.logger.info("Step 1: QA Agent assessing quality");
      const qaOutput = await this.runQAAgent({ project, tasks }, context);

      // Step 2: Release Agent - Generate release notes
      context.logger.info("Step 2: Release Agent generating release notes");
      const releaseOutput = await this.runReleaseAgent(
        { project, version: input.version, tasks },
        context
      );

      const resultSummary = `Release hazırlığı tamamlandı: ${project.name} v${input.version}.`;

      await updateWorkflowRunStatus(context.db, workflowRun.id, "COMPLETED", resultSummary);

      await logEvent(context.db, "WORKFLOW_COMPLETED", {
        workflowRunId: workflowRun.id,
        status: "COMPLETED",
        summary: resultSummary,
      });

      return {
        projectId: input.projectId,
        version: input.version,
        qualityAssessment: qaOutput.assessment,
        releaseNotes: releaseOutput.releaseNotes,
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

  private async runQAAgent(
    input: { project: { id: string; name: string }; tasks: unknown[] },
    context: AgentContext
  ): Promise<{ assessment: string }> {
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { QAAgent } = await import("@flao/agents-qa");
    const agent = new QAAgent();
    const result = await agent.run(
      {
        project: input.project as Project,
        tasks: input.tasks as Task[],
      },
      context
    );
    return {
      assessment: result.assessment,
    };
  }

  private async runReleaseAgent(
    input: {
      project: { id: string; name: string };
      version: string;
      tasks: unknown[];
    },
    context: AgentContext
  ): Promise<{ releaseNotes: string }> {
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { ReleaseAgent } = await import("@flao/agents-release");
    const agent = new ReleaseAgent();
    const result = await agent.run(
      {
        project: input.project as Project,
        version: input.version,
        tasks: input.tasks as Task[],
      },
      context
    );
    return {
      releaseNotes: result.releaseNotes,
    };
  }
}

