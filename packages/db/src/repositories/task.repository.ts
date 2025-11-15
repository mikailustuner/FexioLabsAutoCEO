import type { Task, TaskStatus, Prisma } from "@prisma/client";
import type { DbClient } from "../client.js";

export async function getTaskById(db: DbClient, id: string): Promise<Task | null> {
  return db.task.findUnique({ where: { id } });
}

export async function getTasksByProject(db: DbClient, projectId: string): Promise<Task[]> {
  return db.task.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: { assignee: true },
  });
}

export async function getTasksByAssignee(db: DbClient, assigneeId: string): Promise<Task[]> {
  return db.task.findMany({
    where: { assigneeId },
    orderBy: [{ dueDate: "asc" }, { status: "asc" }],
    include: { project: true },
  });
}

export async function getTasksByStatus(
  db: DbClient,
  status: TaskStatus
): Promise<Task[]> {
  return db.task.findMany({
    where: { status },
    include: { project: true, assignee: true },
    orderBy: { dueDate: "asc" },
  });
}

export async function createTask(
  db: DbClient,
  data: Prisma.TaskCreateInput
): Promise<Task> {
  return db.task.create({ data });
}

export async function createManyTasks(
  db: DbClient,
  data: Prisma.TaskCreateManyInput[]
): Promise<{ count: number }> {
  return db.task.createMany({ data });
}

export async function updateTask(
  db: DbClient,
  id: string,
  data: Prisma.TaskUpdateInput
): Promise<Task> {
  return db.task.update({ where: { id }, data });
}

export async function updateTaskStatus(
  db: DbClient,
  id: string,
  status: TaskStatus
): Promise<Task> {
  return db.task.update({ where: { id }, data: { status } });
}

export async function assignTask(
  db: DbClient,
  taskId: string,
  assigneeId: string
): Promise<Task> {
  return db.task.update({
    where: { id: taskId },
    data: { assigneeId },
  });
}

