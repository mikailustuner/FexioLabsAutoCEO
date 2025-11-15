export interface ClickUpWebhookPayload {
    event: "taskCreated" | "taskUpdated" | "taskDeleted" | "taskStatusUpdated" | "taskPriorityUpdated" | "taskAssigneeUpdated" | "taskDueDateUpdated";
    task_id: string;
    webhook_id: string;
    event_data: {
        task_id: string;
        task: {
            id: string;
            name: string;
            description?: string;
            status: {
                status: string;
                type: string;
                orderindex: number;
                color: string;
            };
            orderindex: string;
            date_created: string;
            date_updated: string;
            date_closed?: string;
            archived: boolean;
            creator: {
                id: number;
                username: string;
                color?: string;
                email: string;
                profilePicture?: string;
            };
            assignees: Array<{
                id: number;
                username: string;
                color?: string;
                email: string;
                profilePicture?: string;
            }>;
            watchers: Array<{
                id: number;
                username: string;
                color?: string;
                email: string;
                profilePicture?: string;
            }>;
            checklists: unknown[];
            tags: Array<{
                name: string;
                tag_fg: string;
                tag_bg: string;
                creator: number;
            }>;
            parent?: string;
            priority?: {
                id: string;
                priority: string;
                color: string;
                orderindex: string;
            };
            due_date?: string;
            start_date?: string;
            points?: number;
            time_estimate?: number;
            time_spent?: number;
            custom_fields: unknown[];
            dependencies: unknown[];
            linked_tasks: unknown[];
            team_id: string;
            url: string;
            sharing: {
                public: boolean;
                public_share_expires_on?: string;
                public_fields: string[];
                token?: string;
                seo_optimized: boolean;
            };
            permission_level: string;
            list: {
                id: string;
                name: string;
                access: boolean;
            };
            project: {
                id: string;
                name: string;
                hidden: boolean;
                access: boolean;
            };
            folder: {
                id: string;
                name: string;
                hidden: boolean;
                access: boolean;
            };
            space: {
                id: string;
            };
        };
        previous_values?: {
            status?: {
                status: string;
                type: string;
                orderindex: number;
                color: string;
            };
            priority?: {
                id: string;
                priority: string;
                color: string;
                orderindex: string;
            };
            assignees?: Array<{
                id: number;
                username: string;
                color?: string;
                email: string;
                profilePicture?: string;
            }>;
            due_date?: string;
        };
    };
    history_items?: unknown[];
}
//# sourceMappingURL=webhook-types.d.ts.map