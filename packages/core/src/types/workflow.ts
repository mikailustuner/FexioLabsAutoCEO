import type { AgentContext } from "./agent.js";

export type { AgentContext } from "./agent.js";

export interface WorkflowStep<Input, Output> {
  name: string;
  execute(input: Input, context: AgentContext): Promise<Output>;
}

export interface Workflow<I, O> {
  name: string;
  run(initialInput: I, context: AgentContext): Promise<O>;
}

