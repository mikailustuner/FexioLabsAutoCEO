import { PrismaClient } from "@prisma/client";

export type DbClient = PrismaClient;

let prismaClient: PrismaClient | null = null;

export function getDbClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }
  return prismaClient;
}

export async function disconnectDb(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

