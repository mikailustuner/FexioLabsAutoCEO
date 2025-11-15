import type { Agent, AgentContext } from "@flao/core";
import type { Project, Task } from "@flao/db";
export interface QAAgentInput {
    project: Project;
    tasks: Task[];
}
export interface QAAgentOutput {
    assessment: string;
    testSuggestions: string[];
    qualityScore: number;
    readyForRelease: boolean;
}
export declare class QAAgent implements Agent<QAAgentInput, QAAgentOutput> {
    name: string;
    run(input: QAAgentInput, context: AgentContext): Promise<QAAgentOutput>;
}
//# sourceMappingURL=qa-agent.d.ts.map