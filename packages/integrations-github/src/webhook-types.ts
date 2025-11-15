export interface GitHubWebhookPushPayload {
  ref: string;
  repository: {
    name: string;
    full_name: string;
    html_url: string;
  };
  commits: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    timestamp: string;
    url: string;
  }>;
  pusher: {
    name: string;
    email: string;
  };
}

export interface GitHubWebhookPullRequestPayload {
  action: "opened" | "closed" | "merged";
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: "open" | "closed";
    merged: boolean;
    user: {
      login: string;
    };
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
  };
  repository: {
    name: string;
    full_name: string;
  };
}

