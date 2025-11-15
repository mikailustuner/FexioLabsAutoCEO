import type { Agent, AgentContext } from "@flao/core";
import { createTask, type Task } from "@flao/db";

export interface FeatureSpec {
  name: string;
  description: string;
  estimatedHours?: number;
}

export interface PMAgentInput {
  projectId: string;
  features: FeatureSpec[];
}

export interface PMAgentOutput {
  tasksCreated: number;
  taskIds: string[];
  tasks: Task[];
}

export class PMAgent implements Agent<PMAgentInput, PMAgentOutput> {
  name = "PM Agent";

  async run(input: PMAgentInput, context: AgentContext): Promise<PMAgentOutput> {
    context.logger.info(
      `PM Agent creating tasks for project: ${input.projectId}, features: ${input.features.length}`
    );

    const tasks: Task[] = [];
    const taskIds: string[] = [];

    // Break down each feature into tasks
    for (const feature of input.features) {
      const featureTasks = this.breakDownFeature(feature);
      
      // Create tasks in database
      for (const taskData of featureTasks) {
        const task = await createTask(context.db, {
          title: taskData.title,
          description: taskData.description,
          status: "TODO",
          project: { connect: { id: input.projectId } },
          estimateHours: taskData.estimateHours,
        });

        tasks.push(task);
        taskIds.push(task.id);
      }
    }

    context.logger.info(`Created ${tasks.length} tasks for ${input.features.length} features`);

    return {
      tasksCreated: tasks.length,
      taskIds,
      tasks,
    };
  }

  private breakDownFeature(
    feature: FeatureSpec
  ): Array<{ title: string; description: string; estimateHours?: number }> {
    const tasks: Array<{ title: string; description: string; estimateHours?: number }> = [];

    // Standard breakdown pattern
    tasks.push({
      title: `${feature.name} - Tasarım`,
      description: `${feature.name} özelliği için UI/UX tasarımı`,
      estimateHours: (feature.estimatedHours || 16) * 0.3,
    });

    tasks.push({
      title: `${feature.name} - Backend Geliştirme`,
      description: `${feature.name} özelliği için backend API geliştirmesi`,
      estimateHours: (feature.estimatedHours || 16) * 0.4,
    });

    tasks.push({
      title: `${feature.name} - Frontend Geliştirme`,
      description: `${feature.name} özelliği için frontend geliştirmesi`,
      estimateHours: (feature.estimatedHours || 16) * 0.2,
    });

    tasks.push({
      title: `${feature.name} - Test`,
      description: `${feature.name} özelliği için test yazımı ve QA`,
      estimateHours: (feature.estimatedHours || 16) * 0.1,
    });

    return tasks;
  }
}
