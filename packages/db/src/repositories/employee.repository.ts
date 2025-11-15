import type { Employee, EmployeeRole, Prisma } from "@prisma/client";
import type { DbClient } from "../client.js";

export async function getActiveEmployees(db: DbClient): Promise<Employee[]> {
  return db.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getEmployeeById(db: DbClient, id: string): Promise<Employee | null> {
  return db.employee.findUnique({ where: { id } });
}

export async function getEmployeesByRole(
  db: DbClient,
  role: EmployeeRole
): Promise<Employee[]> {
  return db.employee.findMany({
    where: { role, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createEmployee(
  db: DbClient,
  data: Prisma.EmployeeCreateInput
): Promise<Employee> {
  return db.employee.create({ data });
}

export async function updateEmployee(
  db: DbClient,
  id: string,
  data: Prisma.EmployeeUpdateInput
): Promise<Employee> {
  return db.employee.update({ where: { id }, data });
}

export async function updateEmployeeWorkload(
  db: DbClient,
  id: string,
  workloadScore: number
): Promise<Employee> {
  return db.employee.update({
    where: { id },
    data: { workloadScore: Math.max(0, Math.min(1, workloadScore)) },
  });
}

