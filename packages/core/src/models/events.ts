export interface CommitPushed {
  type: "GITHUB_COMMIT";
  repo: string;
  branch: string;
  commitHash: string;
  author: string;
  message: string;
  timestamp: Date;
}

export interface TaskCreated {
  type: "TASK_CREATED";
  taskId: string;
  projectId: string;
  title: string;
  assigneeId?: string;
}

export interface TaskUpdated {
  type: "TASK_UPDATED";
  taskId: string;
  changes: Record<string, unknown>;
}

export interface TaskCompleted {
  type: "TASK_COMPLETED";
  taskId: string;
  projectId: string;
  completedBy: string;
}

export interface WorkflowTriggered {
  type: "WORKFLOW_TRIGGERED";
  workflowType: string;
  workflowRunId: string;
}

export interface WorkflowCompleted {
  type: "WORKFLOW_COMPLETED";
  workflowRunId: string;
  status: "COMPLETED" | "FAILED";
  summary?: string;
}

export interface StandupSubmitted {
  type: "STANDUP_SUBMITTED";
  employeeId: string;
  projectId?: string;
  date: Date;
}

export interface ProjectCreated {
  type: "PROJECT_CREATED";
  projectId: string;
  name: string;
  status: string;
}

export interface ProjectUpdated {
  type: "PROJECT_UPDATED";
  projectId: string;
  changes: Record<string, unknown>;
}

export type DomainEvent =
  | CommitPushed
  | TaskCreated
  | TaskUpdated
  | TaskCompleted
  | WorkflowTriggered
  | WorkflowCompleted
  | StandupSubmitted
  | ProjectCreated
  | ProjectUpdated;

