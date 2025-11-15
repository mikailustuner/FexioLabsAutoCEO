export class MockClickUpClient {
    apiKey;
    teamId;
    baseUrl = "https://api.clickup.com/api/v2";
    constructor(apiKey, teamId) {
        this.apiKey = apiKey;
        this.teamId = teamId;
    }
    async makeRequest(endpoint, options = {}) {
        if (!this.apiKey) {
            throw new Error("ClickUp API key is required");
        }
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            "Authorization": this.apiKey,
            "Content-Type": "application/json",
            ...options.headers,
        };
        const response = await fetch(url, {
            ...options,
            headers,
        });
        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({})));
            const errorMsg = errorData.err || `ClickUp API error: ${response.status} ${response.statusText}`;
            if (response.status === 401) {
                throw new Error(`ClickUp authentication failed: ${errorMsg}`);
            }
            if (response.status === 403) {
                throw new Error(`ClickUp permission error: ${errorMsg}`);
            }
            if (response.status === 429) {
                throw new Error(`ClickUp rate limit exceeded: ${errorMsg}`);
            }
            throw new Error(errorMsg);
        }
        return response.json();
    }
    async createTask(listId, name, description, assignees, dueDate, priority) {
        if (!this.apiKey) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] No API key, using mock data");
                return this.getMockTask(listId, name, description, assignees, dueDate, priority);
            }
            throw new Error("ClickUp API key is required");
        }
        try {
            const body = {
                name,
            };
            if (description) {
                body.description = description;
            }
            if (assignees && assignees.length > 0) {
                body.assignees = assignees;
            }
            if (dueDate) {
                body.due_date = dueDate.getTime();
            }
            if (priority !== undefined) {
                body.priority = priority;
            }
            const response = await this.makeRequest(`/list/${listId}/task`, {
                method: "POST",
                body: JSON.stringify(body),
            });
            return {
                id: response.id,
                name: response.name,
                description: response.description,
                status: response.status.status,
                assignees: response.assignees.map((a) => a.email),
                dueDate: response.due_date ? new Date(parseInt(response.due_date)) : undefined,
                priority: response.priority ? parseInt(response.priority.id) : undefined,
                url: response.url,
                listId: response.list.id,
            };
        }
        catch (error) {
            console.error("[ClickUp] Error creating task:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] Falling back to mock data");
                return this.getMockTask(listId, name, description, assignees, dueDate, priority);
            }
            throw error;
        }
    }
    async updateTask(taskId, updates) {
        if (!this.apiKey) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] No API key, using mock data");
                return this.getMockUpdatedTask(taskId, updates);
            }
            throw new Error("ClickUp API key is required");
        }
        try {
            const body = {};
            if (updates.name) {
                body.name = updates.name;
            }
            if (updates.description !== undefined) {
                body.description = updates.description;
            }
            if (updates.status) {
                body.status = updates.status;
            }
            if (updates.assignees) {
                body.assignees = updates.assignees;
            }
            if (updates.dueDate) {
                body.due_date = updates.dueDate.getTime();
            }
            if (updates.priority !== undefined) {
                body.priority = updates.priority;
            }
            const response = await this.makeRequest(`/task/${taskId}`, {
                method: "PUT",
                body: JSON.stringify(body),
            });
            return {
                id: response.id,
                name: response.name,
                description: response.description,
                status: response.status.status,
                assignees: response.assignees.map((a) => a.email),
                dueDate: response.due_date ? new Date(parseInt(response.due_date)) : undefined,
                priority: response.priority ? parseInt(response.priority.id) : undefined,
                url: response.url,
                listId: response.list.id,
            };
        }
        catch (error) {
            console.error("[ClickUp] Error updating task:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] Falling back to mock data");
                return this.getMockUpdatedTask(taskId, updates);
            }
            throw error;
        }
    }
    async getTasks(listId, includeClosed = false) {
        if (!this.apiKey) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] No API key, using mock data");
                return this.getMockTasks(listId);
            }
            throw new Error("ClickUp API key is required");
        }
        try {
            const params = new URLSearchParams();
            if (includeClosed) {
                params.append("include_closed", "true");
            }
            const response = await this.makeRequest(`/list/${listId}/task?${params.toString()}`);
            return response.tasks.map((task) => ({
                id: task.id,
                name: task.name,
                description: task.description,
                status: task.status.status,
                assignees: task.assignees.map((a) => a.email),
                dueDate: task.due_date ? new Date(parseInt(task.due_date)) : undefined,
                priority: task.priority ? parseInt(task.priority.id) : undefined,
                url: task.url,
                listId: task.list.id,
            }));
        }
        catch (error) {
            console.error("[ClickUp] Error fetching tasks:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] Falling back to mock data");
                return this.getMockTasks(listId);
            }
            throw error;
        }
    }
    async createList(folderId, name) {
        if (!this.apiKey) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] No API key, using mock data");
                return this.getMockList(folderId, name);
            }
            throw new Error("ClickUp API key is required");
        }
        try {
            const response = await this.makeRequest(`/folder/${folderId}/list`, {
                method: "POST",
                body: JSON.stringify({ name }),
            });
            return {
                id: response.id,
                name: response.name,
                folderId: response.folder?.id,
                spaceId: response.space.id,
            };
        }
        catch (error) {
            console.error("[ClickUp] Error creating list:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] Falling back to mock data");
                return this.getMockList(folderId, name);
            }
            throw error;
        }
    }
    async getSpaces() {
        if (!this.apiKey || !this.teamId) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] No API key or team ID, using mock data");
                return this.getMockSpaces();
            }
            throw new Error("ClickUp API key and team ID are required");
        }
        try {
            const response = await this.makeRequest(`/team/${this.teamId}/space`);
            return response.spaces.map((space) => ({
                id: space.id,
                name: space.name,
                color: space.color,
            }));
        }
        catch (error) {
            console.error("[ClickUp] Error fetching spaces:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[ClickUp] Falling back to mock data");
                return this.getMockSpaces();
            }
            throw error;
        }
    }
    getMockTask(listId, name, description, assignees, dueDate, priority) {
        console.log(`[Mock ClickUp] Creating task in list ${listId}: ${name}`);
        if (description) {
            console.log(`  Description: ${description}`);
        }
        if (assignees && assignees.length > 0) {
            console.log(`  Assignees: ${assignees.join(", ")}`);
        }
        if (dueDate) {
            console.log(`  Due Date: ${dueDate.toISOString()}`);
        }
        if (priority) {
            console.log(`  Priority: ${priority}`);
        }
        console.log("---");
        return {
            id: `clickup-task-${Date.now()}`,
            name,
            description,
            status: "to do",
            assignees: assignees || [],
            dueDate,
            priority,
            url: `https://app.clickup.com/t/${Date.now()}`,
            listId,
        };
    }
    getMockUpdatedTask(taskId, updates) {
        console.log(`[Mock ClickUp] Updating task ${taskId}:`);
        console.log(JSON.stringify(updates, null, 2));
        console.log("---");
        return {
            id: taskId,
            name: updates.name || "Updated Task",
            description: updates.description,
            status: updates.status || "to do",
            assignees: updates.assignees || [],
            dueDate: updates.dueDate,
            priority: updates.priority,
            url: `https://app.clickup.com/t/${taskId}`,
            listId: "mock-list-id",
        };
    }
    getMockTasks(listId) {
        console.log(`[Mock ClickUp] Fetching tasks from list ${listId}`);
        console.log("---");
        return [
            {
                id: "clickup-task-1",
                name: "Sample Task",
                description: "This is a sample task",
                status: "in progress",
                assignees: [],
                url: "https://app.clickup.com/t/1",
                listId,
            },
        ];
    }
    getMockList(folderId, name) {
        console.log(`[Mock ClickUp] Creating list in folder ${folderId}: ${name}`);
        console.log("---");
        return {
            id: `clickup-list-${Date.now()}`,
            name,
            folderId,
            spaceId: "mock-space-id",
        };
    }
    getMockSpaces() {
        console.log(`[Mock ClickUp] Fetching spaces`);
        console.log("---");
        return [
            {
                id: "clickup-space-1",
                name: "FLAO Workspace",
                color: "#7b68ee",
            },
        ];
    }
}
//# sourceMappingURL=clickup-client.js.map