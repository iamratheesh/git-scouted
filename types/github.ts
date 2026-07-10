export interface GitHubProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  followers: number;
  public_repos: number;
  created_at: string;
  following: number;
  public_gists: number;
  starredCount: number;
  orgs: string[];
}

export interface GitHubRepo {
  name: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  open_issues_count: number;
}

export interface GitHubContributions {
  totalContributions: number;
  totalCommitContributions: number;
  totalPullRequestContributions: number;
  streakCurrent: number;
  streakMax: number;
}

export interface FifaStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  overall: number;
}
