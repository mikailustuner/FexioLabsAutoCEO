import type { WorkflowRun, WorkflowType, WorkflowStatus, Prisma } from "@prisma/client";
import type { DbClient } from "../client.js";

export async function createWorkflowRun(
  db: DbClient,
  data: Prisma.WorkflowRunCreateInput
): Promise<WorkflowRun> {
  return db.workflowRun.create({ data });
}

export async function getWorkflowRunById(
  db: DbClient,
  id: string
): Promise<WorkflowRun | null> {
  return db.workflowRun.findUnique({ where: { id } });
}

export async function updateWorkflowRun(
  db: DbClient,
  id: string,
  data: Prisma.WorkflowRunUpdateInput
): Promise<WorkflowRun> {
  return db.workflowRun.update({ where: { id }, data });
}

export async function updateWorkflowRunStatus(
  db: DbClient,
  id: string,
  status: WorkflowStatus,
  resultSummary?: string
): Promise<WorkflowRun> {
  const updateData: Prisma.WorkflowRunUpdateInput = {
    status,
    finishedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
  };

  if (resultSummary) {
    updateData.resultSummary = resultSummary;
  }

  return db.workflowRun.update({ where: { id }, data: updateData });
}

export async function getWorkflowRunsByType(
  db: DbClient,
  type: WorkflowType,
  limit = 10
): Promise<WorkflowRun[]> {
  return db.workflowRun.findMany({
    where: { type },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getRecentWorkflowRuns(
  db: DbClient,
  limit = 20
): Promise<WorkflowRun[]> {
  return db.workflowRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

