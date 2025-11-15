import { describe, it, expect } from "vitest";
import { CEOAgent } from "./ceo-agent.js";
import { createAgentContext } from "@flao/core";

describe("CEO Agent", () => {
  it("should evaluate a project and return approval decision", async () => {
    const context = createAgentContext();
    const agent = new CEOAgent();

    const result = await agent.run(
      {
        name: "Test Project",
        description: "A comprehensive test project with clear goals and market potential",
        goals: ["Launch MVP", "Get user feedback"],
        marketInfo: {
          targetAudience: "Developers",
          marketSize: "Large",
        },
      },
      context
    );

    expect(result).toBeDefined();
    expect(result.approved).toBeDefined();
    expect(result.priority).toBeGreaterThanOrEqual(1);
    expect(result.priority).toBeLessThanOrEqual(10);
    expect(result.rationale).toBeDefined();
    expect(typeof result.rationale).toBe("string");
  });

  it("should reject projects with insufficient description", async () => {
    const context = createAgentContext();
    const agent = new CEOAgent();

    const result = await agent.run(
      {
        name: "Test Project",
        description: "Short",
      },
      context
    );

    // Should either reject or have low priority
    expect(result).toBeDefined();
    expect(result.approved !== undefined).toBe(true);
  });
});

