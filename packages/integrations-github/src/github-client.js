async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            const isLastAttempt = attempt === maxRetries - 1;
            const isRateLimit = error instanceof Error && error.message.includes("rate limit");
            if (isLastAttempt || !isRateLimit) {
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw new Error("Max retries exceeded");
}
export class MockGithubClient {
    token;
    baseUrl = "https://api.github.com";
    constructor(token) {
        this.token = token;
    }
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "FLAO-Bot",
            ...options.headers,
        };
        if (this.token) {
            headers["Authorization"] = `token ${this.token}`;
        }
        const response = await fetch(url, {
            ...options,
            headers,
        });
        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({})));
            const errorMessage = errorData.message || `GitHub API error: ${response.status} ${response.statusText}`;
            if (response.status === 401) {
                throw new Error(`GitHub authentication failed: ${errorMessage}`);
            }
            if (response.status === 403) {
                throw new Error(`GitHub rate limit or permission error: ${errorMessage}`);
            }
            if (response.status === 404) {
                throw new Error(`GitHub resource not found: ${errorMessage}`);
            }
            throw new Error(errorMessage);
        }
        return response.json();
    }
    async getRecentCommitsForRepo(repo, since) {
        if (!this.token) {
            console.warn("[GitHub] No token provided, using mock data");
            return this.getMockCommits(repo);
        }
        try {
            const [owner, repoName] = repo.split("/");
            if (!owner || !repoName) {
                throw new Error(`Invalid repo format: ${repo}. Expected format: owner/repo`);
            }
            const sinceISO = since.toISOString();
            const endpoint = `/repos/${owner}/${repoName}/commits?since=${sinceISO}&per_page=100`;
            const commits = await retryWithBackoff(() => this.makeRequest(endpoint));
            return commits.map((commit) => ({
                sha: commit.sha,
                message: commit.commit.message.split("\n")[0],
                author: commit.author?.login || commit.commit.author.email,
                date: new Date(commit.commit.author.date),
                url: commit.html_url,
            }));
        }
        catch (error) {
            console.error("[GitHub] Error fetching commits:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[GitHub] Falling back to mock data");
                return this.getMockCommits(repo);
            }
            throw error;
        }
    }
    async createIssue(repo, title, body) {
        if (!this.token) {
            console.warn("[GitHub] No token provided, using mock data");
            return this.getMockIssue(repo, title, body);
        }
        try {
            const [owner, repoName] = repo.split("/");
            if (!owner || !repoName) {
                throw new Error(`Invalid repo format: ${repo}. Expected format: owner/repo`);
            }
            const endpoint = `/repos/${owner}/${repoName}/issues`;
            const issue = await retryWithBackoff(() => this.makeRequest(endpoint, {
                method: "POST",
                body: JSON.stringify({ title, body }),
            }));
            return {
                id: issue.id,
                title: issue.title,
                body: issue.body || "",
                state: issue.state,
                url: issue.html_url,
            };
        }
        catch (error) {
            console.error("[GitHub] Error creating issue:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[GitHub] Falling back to mock data");
                return this.getMockIssue(repo, title, body);
            }
            throw error;
        }
    }
    getMockCommits(repo) {
        return [
            {
                sha: "abc123",
                message: "feat: Add new feature",
                author: "developer@example.com",
                date: new Date(),
                url: `https://github.com/${repo}/commit/abc123`,
            },
        ];
    }
    getMockIssue(repo, title, body) {
        return {
            id: Math.floor(Math.random() * 10000),
            title,
            body,
            state: "open",
            url: `https://github.com/${repo}/issues/1`,
        };
    }
}
//# sourceMappingURL=github-client.js.map