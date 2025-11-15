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

interface GitHubApiError {
  message: string;
  documentation_url?: string;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isRateLimit = error instanceof Error && error.message.includes("rate limit");
      
      if (isLastAttempt || !isRateLimit) {
        throw error;
      }
      
      // Exponential backoff for rate limits
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

export class MockGithubClient implements GithubClient {
  private token?: string;
  private baseUrl = "https://api.github.com";

  constructor(token?: string) {
    this.token = token;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "FLAO-Bot",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `token ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as GitHubApiError;
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

    return response.json() as Promise<T>;
  }

  async getRecentCommitsForRepo(repo: string, since: Date): Promise<Commit[]> {
    if (!this.token) {
      console.warn("[GitHub] No token provided, using mock data");
      return this.getMockCommits(repo);
    }

    try {
      // Parse repo format: "owner/repo"
      const [owner, repoName] = repo.split("/");
      if (!owner || !repoName) {
        throw new Error(`Invalid repo format: ${repo}. Expected format: owner/repo`);
      }

      const sinceISO = since.toISOString();
      const endpoint = `/repos/${owner}/${repoName}/commits?since=${sinceISO}&per_page=100`;

      const commits = await retryWithBackoff(() =>
        this.makeRequest<Array<{
          sha: string;
          commit: {
            message: string;
            author: { name: string; email: string; date: string };
          };
          author: { login: string } | null;
          html_url: string;
        }>>(endpoint)
      );

      return commits.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message.split("\n")[0], // First line only
        author: commit.author?.login || commit.commit.author.email,
        date: new Date(commit.commit.author.date),
        url: commit.html_url,
      }));
    } catch (error) {
      console.error("[GitHub] Error fetching commits:", error);
      // Fallback to mock in development
      if (process.env.NODE_ENV === "development") {
        console.warn("[GitHub] Falling back to mock data");
        return this.getMockCommits(repo);
      }
      throw error;
    }
  }

  async createIssue(repo: string, title: string, body: string): Promise<GitHubIssue> {
    if (!this.token) {
      console.warn("[GitHub] No token provided, using mock data");
      return this.getMockIssue(repo, title, body);
    }

    try {
      // Parse repo format: "owner/repo"
      const [owner, repoName] = repo.split("/");
      if (!owner || !repoName) {
        throw new Error(`Invalid repo format: ${repo}. Expected format: owner/repo`);
      }

      const endpoint = `/repos/${owner}/${repoName}/issues`;

      const issue = await retryWithBackoff(() =>
        this.makeRequest<{
          id: number;
          number: number;
          title: string;
          body: string;
          state: "open" | "closed";
          html_url: string;
        }>(endpoint, {
          method: "POST",
          body: JSON.stringify({ title, body }),
        })
      );

      return {
        id: issue.id,
        title: issue.title,
        body: issue.body || "",
        state: issue.state,
        url: issue.html_url,
      };
    } catch (error) {
      console.error("[GitHub] Error creating issue:", error);
      // Fallback to mock in development
      if (process.env.NODE_ENV === "development") {
        console.warn("[GitHub] Falling back to mock data");
        return this.getMockIssue(repo, title, body);
      }
      throw error;
    }
  }

  private getMockCommits(repo: string): Commit[] {
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

  private getMockIssue(repo: string, title: string, body: string): GitHubIssue {
    return {
      id: Math.floor(Math.random() * 10000),
      title,
      body,
      state: "open",
      url: `https://github.com/${repo}/issues/1`,
    };
  }
}

