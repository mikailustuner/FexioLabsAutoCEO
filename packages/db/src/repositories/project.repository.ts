import type { Project, ProjectStatus, Prisma } from "@prisma/client";
import type { DbClient } from "../client.js";

export async function getProjectById(db: DbClient, id: string): Promise<Project | null> {
  return db.project.findUnique({ where: { id } });
}

export async function getAllProjects(db: DbClient): Promise<Project[]> {
  return db.project.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getProjectsByStatus(
  db: DbClient,
  status: ProjectStatus
): Promise<Project[]> {
  return db.project.findMany({
    where: { status },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function createProject(
  db: DbClient,
  data: Prisma.ProjectCreateInput
): Promise<Project> {
  return db.project.create({ data });
}

export async function updateProject(
  db: DbClient,
  id: string,
  data: Prisma.ProjectUpdateInput
): Promise<Project> {
  return db.project.update({ where: { id }, data });
}

export async function updateProjectStatus(
  db: DbClient,
  id: string,
  status: ProjectStatus
): Promise<Project> {
  return db.project.update({ where: { id }, data: { status } });
}

