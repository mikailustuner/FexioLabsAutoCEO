import type { Agent, AgentContext } from "@flao/core";
import type { Project, Task } from "@flao/db";
export interface ReleaseAgentInput {
    project: Project;
    version: string;
    tasks: Task[];
}
export interface ReleaseAgentOutput {
    releaseNotes: string;
    version: string;
    changelog: string[];
}
export declare class ReleaseAgent implements Agent<ReleaseAgentInput, ReleaseAgentOutput> {
    name: string;
    run(input: ReleaseAgentInput, context: AgentContext): Promise<ReleaseAgentOutput>;
    private generateReleaseNotesTemplate;
}
//# sourceMappingURL=release-agent.d.ts.map