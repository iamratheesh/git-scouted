import type { GitHubContributions, GitHubProfile, GitHubRepo } from "@/types/github";

type GitHubRestProfileResponse = {
  login?: unknown;
  name?: unknown;
  avatar_url?: unknown;
  bio?: unknown;
  company?: unknown;
  followers?: unknown;
  public_repos?: unknown;
  created_at?: unknown;
  following?: unknown;
  public_gists?: unknown;
};

type GitHubRestRepoResponse = {
  name?: unknown;
  language?: unknown;
  stargazers_count?: unknown;
  forks_count?: unknown;
  fork?: unknown;
  open_issues_count?: unknown;
};

type GitHubGraphQLResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions?: unknown;
          weeks?: Array<{
            contributionDays?: Array<{
              contributionCount?: unknown;
              date?: unknown;
            }>;
          }>;
        };
        totalCommitContributions?: unknown;
        totalPullRequestContributions?: unknown;
      } | null;
    } | null;
  };
  errors?: Array<{ message?: string }>;
};

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const REQUEST_TIMEOUT_MS = 15_000;

type GitHubErrorCode = "rate_limit" | "timeout" | "network";

export class GitHubApiError extends Error {
  readonly status: number;
  readonly code: GitHubErrorCode;

  constructor(message: string, status: number, code: GitHubErrorCode) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.code = code;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeUsername(username: string): string | null {
  const value = username.trim();
  if (!value) {
    return null;
  }

  if (!/^[A-Za-z0-9-]+$/.test(value) || value.startsWith("-") || value.endsWith("-")) {
    return null;
  }

  return value;
}

function createAuthHeaders(): HeadersInit | null {
  const token = process.env.GITHUB_TOKEN;
  if (!isNonEmptyString(token)) {
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function buildProfile(
  profile: GitHubRestProfileResponse,
  starredCount: number,
  orgs: string[]
): GitHubProfile {
  return {
    login: toNullableString(profile.login) ?? "",
    name: toNullableString(profile.name),
    avatar_url: toNullableString(profile.avatar_url) ?? "",
    bio: toNullableString(profile.bio),
    company: toNullableString(profile.company),
    followers: toNumber(profile.followers),
    public_repos: toNumber(profile.public_repos),
    created_at: toNullableString(profile.created_at) ?? "",
    following: toNumber(profile.following),
    public_gists: toNumber(profile.public_gists),
    starredCount,
    orgs
  };
}

function buildRepo(repo: GitHubRestRepoResponse): GitHubRepo {
  return {
    name: toNullableString(repo.name) ?? "",
    language: toNullableString(repo.language),
    stargazers_count: toNumber(repo.stargazers_count),
    forks_count: toNumber(repo.forks_count),
    fork: repo.fork === true,
    open_issues_count: toNumber(repo.open_issues_count)
  };
}

async function requestJson<T>(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; json: T | null; timedOut: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });

    const json = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, json, timedOut: false };
  } catch {
    return {
      ok: false,
      status: 0,
      json: null,
      timedOut: controller.signal.aborted
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getErrorMessage(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function isRateLimitResponse(status: number, body: unknown): boolean {
  if (status === 429) {
    return true;
  }

  if (status !== 403) {
    return false;
  }

  const message = getErrorMessage(
    typeof body === "object" && body !== null && "message" in body ? (body as { message?: unknown }).message : null
  );

  return message.includes("rate limit");
}

function isGraphQLRateLimitResponse(result: { status: number; json: GitHubGraphQLResponse | null }): boolean {
  const message = getErrorMessage(result.json?.errors?.[0]?.message);
  return result.status === 429 || message.includes("rate limit") || message.includes("secondary rate limit");
}

export async function fetchOrgs(username: string): Promise<string[]> {
  const sanitizedUsername = sanitizeUsername(username);
  const headers = createAuthHeaders();

  if (!sanitizedUsername || !headers) {
    return [];
  }

  const url = `${GITHUB_API_BASE_URL}/users/${encodeURIComponent(sanitizedUsername)}/orgs`;
  const result = await requestJson<Array<{ login: string }>>(url, { headers, method: "GET" });

  if (result.ok && Array.isArray(result.json)) {
    return result.json
      .filter((org) => org && typeof org === "object" && typeof org.login === "string")
      .map((org) => org.login);
  }

  return [];
}

export async function fetchStarredCount(username: string): Promise<number> {
  const sanitizedUsername = sanitizeUsername(username);
  const headers = createAuthHeaders();

  if (!sanitizedUsername || !headers) {
    return 0;
  }

  const url = `${GITHUB_API_BASE_URL}/users/${encodeURIComponent(sanitizedUsername)}/starred?per_page=1`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { headers, method: "GET", signal: controller.signal });
    if (!response.ok) {
      return 0;
    }

    const linkHeader = response.headers.get("Link");
    if (linkHeader) {
      const match = linkHeader.match(/page=(\d+)>; rel="last"/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    const json = await response.json();
    return Array.isArray(json) ? json.length : 0;
  } catch {
    return 0;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchProfile(username: string): Promise<GitHubProfile | null> {
  const sanitizedUsername = sanitizeUsername(username);
  const headers = createAuthHeaders();

  if (!sanitizedUsername || !headers) {
    return null;
  }

  const url = `${GITHUB_API_BASE_URL}/users/${encodeURIComponent(sanitizedUsername)}`;
  const result = await requestJson<GitHubRestProfileResponse>(url, { headers, method: "GET" });

  if (result.timedOut) {
    throw new GitHubApiError("GitHub request timed out", 504, "timeout");
  }

  if (result.status === 404) {
    return null;
  }

  if (isRateLimitResponse(result.status, result.json)) {
    throw new GitHubApiError("GitHub rate limit exceeded", 429, "rate_limit");
  }

  if (!result.ok) {
    throw new GitHubApiError("Failed to fetch GitHub profile", result.status || 502, "network");
  }

  if (!result.json || !isNonEmptyString(result.json.login) || !isNonEmptyString(result.json.avatar_url)) {
    return null;
  }

  const [orgs, starredCount] = await Promise.all([
    fetchOrgs(sanitizedUsername),
    fetchStarredCount(sanitizedUsername)
  ]);

  return buildProfile(result.json, starredCount, orgs);
}

export async function fetchRepos(username: string): Promise<GitHubRepo[]> {
  const sanitizedUsername = sanitizeUsername(username);
  const headers = createAuthHeaders();

  if (!sanitizedUsername || !headers) {
    return [];
  }

  const url = `${GITHUB_API_BASE_URL}/users/${encodeURIComponent(sanitizedUsername)}/repos?per_page=100&sort=updated`;
  const result = await requestJson<GitHubRestRepoResponse[]>(url, { headers, method: "GET" });

  if (result.timedOut) {
    throw new GitHubApiError("GitHub request timed out", 504, "timeout");
  }

  if (isRateLimitResponse(result.status, result.json)) {
    throw new GitHubApiError("GitHub rate limit exceeded", 429, "rate_limit");
  }

  if (result.status === 404) {
    return [];
  }

  if (!result.ok || !Array.isArray(result.json)) {
    throw new GitHubApiError("Failed to fetch GitHub repositories", result.status || 502, "network");
  }

  return result.json
    .filter((repo): repo is GitHubRestRepoResponse => repo !== null && typeof repo === "object")
    .map(buildRepo);
}

export async function fetchContributions(username: string): Promise<GitHubContributions | null> {
  const sanitizedUsername = sanitizeUsername(username);
  const headers = createAuthHeaders();

  if (!sanitizedUsername || !headers) {
    return null;
  }

  const now = new Date();
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 1);

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
          totalCommitContributions
          totalPullRequestContributions
        }
      }
    }
  `;

  const result = await requestJson<GitHubGraphQLResponse>(GITHUB_GRAPHQL_URL, {
    headers,
    method: "POST",
    body: JSON.stringify({
      query,
      variables: {
        login: sanitizedUsername,
        from: from.toISOString(),
        to: now.toISOString()
      }
    })
  });

  if (result.timedOut) {
    throw new GitHubApiError("GitHub request timed out", 504, "timeout");
  }

  if (isGraphQLRateLimitResponse(result)) {
    throw new GitHubApiError("GitHub rate limit exceeded", 429, "rate_limit");
  }

  if (!result.ok || !result.json) {
    throw new GitHubApiError("Failed to fetch GitHub contributions", result.status || 502, "network");
  }

  if (result.json.errors?.length) {
    return null;
  }

  const contributionsCollection = result.json.data?.user?.contributionsCollection;
  if (!contributionsCollection?.contributionCalendar) {
    return null;
  }

  // Calculate streaks
  const days: Array<{ contributionCount: number; date: string }> = [];
  const weeks = contributionsCollection.contributionCalendar.weeks || [];
  for (const week of weeks) {
    if (week.contributionDays) {
      for (const day of week.contributionDays) {
        if (day && typeof day === "object") {
          days.push({
            contributionCount: toNumber(day.contributionCount),
            date: toNullableString(day.date) ?? ""
          });
        }
      }
    }
  }

  days.sort((a, b) => a.date.localeCompare(b.date));

  let maxStreak = 0;
  let tempStreak = 0;
  for (const day of days) {
    if (day.contributionCount > 0) {
      tempStreak++;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  let currentStreak = 0;
  let lastActiveIdx = -1;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) {
      lastActiveIdx = i;
      break;
    }
  }

  if (lastActiveIdx !== -1) {
    const lastActiveDate = new Date(days[lastActiveIdx].date);
    const today = new Date();
    lastActiveDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      let streak = 0;
      for (let i = lastActiveIdx; i >= 0; i--) {
        if (days[i].contributionCount > 0) {
          streak++;
        } else {
          break;
        }
      }
      currentStreak = streak;
    }
  }

  return {
    totalContributions: toNumber(contributionsCollection.contributionCalendar.totalContributions),
    totalCommitContributions: toNumber(contributionsCollection.totalCommitContributions),
    totalPullRequestContributions: toNumber(contributionsCollection.totalPullRequestContributions),
    streakCurrent: currentStreak,
    streakMax: maxStreak
  };
}

export async function fetchGitHubProfile(username: string): Promise<GitHubProfile | null> {
  return fetchProfile(username);
}
