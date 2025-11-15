import type { Agent, AgentContext } from "@flao/core";
export interface OpsAgentInput {
    date?: Date;
    taskIds?: string[];
    action?: "collect-standups" | "assign-tasks" | "nudge-late-tasks" | "daily-summary";
}
export interface OpsAgentOutput {
    standupsCollected?: number;
    tasksAssigned?: number;
    nudgesSent?: number;
    summary: string;
    formattedSummary?: string;
}
export declare class OpsAgent implements Agent<OpsAgentInput, OpsAgentOutput> {
    name: string;
    run(input: OpsAgentInput, context: AgentContext): Promise<OpsAgentOutput>;
    private collectStandups;
    private assignTasks;
    private nudgeLateTasks;
    private generateDailySummary;
}
//# sourceMappingURL=ops-agent.d.ts.map