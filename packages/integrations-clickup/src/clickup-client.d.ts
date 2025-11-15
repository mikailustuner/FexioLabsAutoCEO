import type { ClickUpClient } from "@flao/core";
export interface ClickUpTask {
    id: string;
    name: string;
    description?: string;
    status: string;
    assignees: string[];
    dueDate?: Date;
    priority?: number;
    url: string;
    listId: string;
}
export interface ClickUpList {
    id: string;
    name: string;
    folderId?: string;
    spaceId: string;
}
export interface ClickUpSpace {
    id: string;
    name: string;
    color?: string;
}
export declare class MockClickUpClient implements ClickUpClient {
    private apiKey?;
    private teamId?;
    private baseUrl;
    constructor(apiKey?: string, teamId?: string);
    private makeRequest;
    createTask(listId: string, name: string, description?: string, assignees?: string[], dueDate?: Date, priority?: number): Promise<ClickUpTask>;
    updateTask(taskId: string, updates: {
        name?: string;
        description?: string;
        status?: string;
        assignees?: string[];
        dueDate?: Date;
        priority?: number;
    }): Promise<ClickUpTask>;
    getTasks(listId: string, includeClosed?: boolean): Promise<ClickUpTask[]>;
    createList(folderId: string, name: string): Promise<ClickUpList>;
    getSpaces(): Promise<ClickUpSpace[]>;
    private getMockTask;
    private getMockUpdatedTask;
    private getMockTasks;
    private getMockList;
    private getMockSpaces;
}
//# sourceMappingURL=clickup-client.d.ts.map