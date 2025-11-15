import { describe, it, expect } from "vitest";
import { NewProjectBootstrapWorkflow } from "./new-project-bootstrap.workflow.js";
import { createAgentContext } from "../context.js";

describe("NewProjectBootstrapWorkflow", () => {
  it("should have correct name", () => {
    const workflow = new NewProjectBootstrapWorkflow();
    expect(workflow.name).toBe("NewProjectBootstrap");
  });

  // Note: Full integration test would require a test database
  // This is a basic structure test
  it("should be instantiable", () => {
    const workflow = new NewProjectBootstrapWorkflow();
    expect(workflow).toBeDefined();
    expect(typeof workflow.run).toBe("function");
  });
});

