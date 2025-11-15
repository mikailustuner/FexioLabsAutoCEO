import { describe, it, expect, beforeEach } from "vitest";
import { getDbClient } from "../client.js";
import { getActiveEmployees, createEmployee } from "./employee.repository.js";

describe("Employee Repository", () => {
  const db = getDbClient();

  beforeEach(async () => {
    // Clean up test data if needed
    // In a real test, you'd use a test database
  });

  it("should get active employees", async () => {
    const employees = await getActiveEmployees(db);
    expect(Array.isArray(employees)).toBe(true);
  });

  it("should create an employee", async () => {
    const employee = await createEmployee(db, {
      name: "Test Employee",
      role: "DEVELOPER",
      email: `test-${Date.now()}@example.com`,
      isActive: true,
    });

    expect(employee).toBeDefined();
    expect(employee.name).toBe("Test Employee");
    expect(employee.role).toBe("DEVELOPER");
  });
});

