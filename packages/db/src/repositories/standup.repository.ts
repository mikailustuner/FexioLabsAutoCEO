import type { StandupEntry, Prisma } from "@prisma/client";
import type { DbClient } from "../client.js";

export async function createStandup(
  db: DbClient,
  data: Prisma.StandupEntryCreateInput
): Promise<StandupEntry> {
  return db.standupEntry.create({ data });
}

export async function getStandupsByDate(
  db: DbClient,
  date: Date
): Promise<StandupEntry[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return db.standupEntry.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      employee: true,
      project: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getStandupsByEmployee(
  db: DbClient,
  employeeId: string,
  limit = 10
): Promise<StandupEntry[]> {
  return db.standupEntry.findMany({
    where: { employeeId },
    orderBy: { date: "desc" },
    take: limit,
    include: { project: true },
  });
}

export async function getStandupsByProject(
  db: DbClient,
  projectId: string,
  limit = 20
): Promise<StandupEntry[]> {
  return db.standupEntry.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
    take: limit,
    include: { employee: true },
  });
}

