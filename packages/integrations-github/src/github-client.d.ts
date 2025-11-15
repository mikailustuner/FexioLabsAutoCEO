import type { GithubClient } from "@flao/core";
export interface Commit {
    sha: string;
    message: string;
    author: string;
    date: Date;
    url: string;
}
export interface GitHubIssue {
    id: number;
    title: string;
    body: string;
    state: "open" | "closed";
    url: string;
}
export declare class MockGithubClient implements GithubClient {
    private token?;
    private baseUrl;
    constructor(token?: string);
    private makeRequest;
    getRecentCommitsForRepo(repo: string, since: Date): Promise<Commit[]>;
    createIssue(repo: string, title: string, body: string): Promise<GitHubIssue>;
    private getMockCommits;
    private getMockIssue;
}
//# sourceMappingURL=github-client.d.ts.map