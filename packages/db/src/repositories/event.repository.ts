import type { EventLog, EventType, Prisma } from "@prisma/client";
import type { DbClient } from "../client.js";

export async function logEvent(
  db: DbClient,
  type: EventType,
  payload: Record<string, unknown>
): Promise<EventLog> {
  return db.eventLog.create({
    data: {
      type,
      payload: payload as Prisma.JsonObject,
    },
  });
}

export async function getEventsByType(
  db: DbClient,
  type: EventType,
  limit = 50
): Promise<EventLog[]> {
  return db.eventLog.findMany({
    where: { type },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getRecentEvents(
  db: DbClient,
  limit = 100
): Promise<EventLog[]> {
  return db.eventLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getEventsSince(
  db: DbClient,
  since: Date,
  type?: EventType
): Promise<EventLog[]> {
  return db.eventLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

