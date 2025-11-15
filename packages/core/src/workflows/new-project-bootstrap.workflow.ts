import type { AgentContext, Workflow } from "../types/workflow.js";
import type { Project } from "@flao/db";
import {
  createWorkflowRun,
  updateWorkflowRunStatus,
  logEvent,
  createProject,
  type WorkflowType,
} from "@flao/db";

// Agent imports - these will be dynamically imported to avoid circular dependencies
// For now, we'll use type-only imports and require the agents to be passed in or imported at runtime

export interface NewProjectBootstrapInput {
  name: string;
  description?: string;
  clientInfo?: {
    name?: string;
    email?: string;
    requirements?: string;
  };
}

export interface NewProjectBootstrapOutput {
  projectId: string;
  project: Project;
  tasksCreated: number;
  summary: string;
}

export class NewProjectBootstrapWorkflow implements Workflow<NewProjectBootstrapInput, NewProjectBootstrapOutput> {
  name = "NewProjectBootstrap";

  async run(input: NewProjectBootstrapInput, context: AgentContext): Promise<NewProjectBootstrapOutput> {
    const workflowRun = await createWorkflowRun(context.db, {
      type: "NEW_PROJECT_BOOTSTRAP" as WorkflowType,
      status: "RUNNING",
      startedAt: new Date(),
      metadata: { input: JSON.parse(JSON.stringify(input)) },
    });

    await logEvent(context.db, "WORKFLOW_TRIGGERED", {
      workflowType: this.name,
      workflowRunId: workflowRun.id,
    });

    try {
      context.logger.info(`Starting ${this.name} workflow for project: ${input.name}`);

      // Step 1: Client Agent - Refine brief
      context.logger.info("Step 1: Client Agent refining brief");
      const clientOutput = await this.runClientAgent(input, context);

      // Step 2: CEO Agent - Validate and prioritize
      context.logger.info("Step 2: CEO Agent validating and prioritizing");
      const ceoOutput = await this.runCEOAgent(
        {
          name: input.name,
          description: clientOutput.refinedDescription,
          goals: clientOutput.goals,
        },
        context
      );

      if (!ceoOutput.approved) {
        throw new Error(`Project not approved by CEO: ${ceoOutput.rationale}`);
      }

      // Step 3: Create project in DB
      const project = await createProject(context.db, {
        name: input.name,
        description: clientOutput.refinedDescription,
        status: "PLANNING",
        priority: ceoOutput.priority,
      });

      await logEvent(context.db, "PROJECT_CREATED", {
        projectId: project.id,
        name: project.name,
        status: project.status,
      });

      // Step 4: Product Agent - Feature breakdown
      context.logger.info("Step 4: Product Agent breaking down features");
      const productOutput = await this.runProductAgent(
        {
          projectId: project.id,
          description: clientOutput.refinedDescription,
          goals: clientOutput.goals,
        },
        context
      );

      // Step 5: CTO Agent - Architecture suggestions
      context.logger.info("Step 5: CTO Agent providing architecture suggestions");
      await this.runCTOAgent(
        {
          projectId: project.id,
          features: productOutput.features,
        },
        context
      );

      // Step 6: PM Agent - Create tasks
      context.logger.info("Step 6: PM Agent creating tasks");
      const pmOutput = await this.runPMAgent(
        {
          projectId: project.id,
          features: productOutput.mvpFeatures,
        },
        context
      );

      // Step 7: Ops Agent - Assign tasks
      context.logger.info("Step 7: Ops Agent assigning tasks");
      await this.runOpsAgent(
        {
          taskIds: pmOutput.taskIds,
        },
        context
      );

      const summary = `Proje oluşturuldu: ${project.name}. ${pmOutput.tasksCreated} task oluşturuldu ve atandı. Öncelik: ${ceoOutput.priority}.`;

      await updateWorkflowRunStatus(context.db, workflowRun.id, "COMPLETED", summary);

      await logEvent(context.db, "WORKFLOW_COMPLETED", {
        workflowRunId: workflowRun.id,
        status: "COMPLETED",
        summary,
      });

      return {
        projectId: project.id,
        project,
        tasksCreated: pmOutput.tasksCreated,
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

  private async runClientAgent(
    input: NewProjectBootstrapInput,
    context: AgentContext
  ): Promise<{ refinedDescription: string; goals: string[] }> {
    // Dynamically import to avoid circular dependencies
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { ClientAgent } = await import("@flao/agents-client");
    const agent = new ClientAgent();
    const result = await agent.run(
      {
        rawBrief: input.description || input.name,
        clientInfo: input.clientInfo,
      },
      context
    );
    return {
      refinedDescription: result.refinedDescription,
      goals: result.goals,
    };
  }

  private async runCEOAgent(
    input: { name: string; description: string; goals: string[] },
    context: AgentContext
  ): Promise<{ approved: boolean; priority: number; rationale: string }> {
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { CEOAgent } = await import("@flao/agents-ceo");
    const agent = new CEOAgent();
    return agent.run(
      {
        name: input.name,
        description: input.description,
        goals: input.goals,
      },
      context
    );
  }

  private async runProductAgent(
    input: { projectId: string; description: string; goals: string[] },
    context: AgentContext
  ): Promise<{ features: Array<{ name: string; description: string; priority: number }>; mvpFeatures: Array<{ name: string; description: string }> }> {
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { ProductAgent } = await import("@flao/agents-product");
    const agent = new ProductAgent();
    const result = await agent.run(
      {
        projectId: input.projectId,
        description: input.description,
        goals: input.goals,
      },
      context
    );
    return {
      features: result.features,
      mvpFeatures: result.mvpFeatures,
    };
  }

  private async runCTOAgent(
    input: { projectId: string; features: Array<{ name: string; description: string }> },
    context: AgentContext
  ): Promise<{ architecture: string; techStack: string[]; constraints: string[] }> {
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { CTOAgent } = await import("@flao/agents-cto");
    const agent = new CTOAgent();
    const result = await agent.run(
      {
        projectId: input.projectId,
        features: input.features,
      },
      context
    );
    return {
      architecture: result.architecture,
      techStack: result.techStack,
      constraints: result.constraints,
    };
  }

  private async runPMAgent(
    input: { projectId: string; features: Array<{ name: string; description: string }> },
    context: AgentContext
  ): Promise<{ tasksCreated: number; taskIds: string[] }> {
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { PMAgent } = await import("@flao/agents-pm");
    const agent = new PMAgent();
    const result = await agent.run(
      {
        projectId: input.projectId,
        features: input.features,
      },
      context
    );
    return {
      tasksCreated: result.tasksCreated,
      taskIds: result.taskIds,
    };
  }

  private async runOpsAgent(
    input: { taskIds: string[] },
    context: AgentContext
  ): Promise<{ assignments: Array<{ taskId: string; employeeId: string }> }> {
    // @ts-ignore - Dynamic import, agent package may not be built yet
    const { OpsAgent } = await import("@flao/agents-ops");
    const agent = new OpsAgent();
    await agent.run(
      {
        taskIds: input.taskIds,
        action: "assign-tasks",
      },
      context
    );
    return {
      assignments: [], // OpsAgent doesn't return assignments in current implementation
    };
  }
}

