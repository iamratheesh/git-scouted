import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/cache";
import { GitHubApiError, fetchContributions, fetchProfile, fetchRepos } from "@/lib/github";
import { computeFifaStats } from "@/lib/stats";
import type { FifaStats, GitHubContributions, GitHubProfile, GitHubRepo } from "@/types/github";
import clientPromise from "@/lib/mongodb";

async function logSearch(
  username: string,
  profile: GitHubProfile,
  stats: FifaStats | null,
  contributions: GitHubContributions | null
) {
  try {
    const client = await clientPromise;
    const db = client.db();
    await db.collection("scouted_users").updateOne(
      { username: username.toLowerCase() },
      {
        $set: {
          username: username.toLowerCase(),
          profileData: profile,
          avatarUrl: profile.avatar_url,
          stats: stats,
          contributions: contributions,
          lastScoutedAt: new Date()
        },
        $inc: { count: 1 }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[MongoDB] Failed to log search for", username, err);
  }
}

type GithubApiResponse = {
  profile: GitHubProfile | null;
  repos: GitHubRepo[];
  contributions: GitHubContributions | null;
  stats: FifaStats | null;
  langIconDataUrl: string;
  error: string | null;
};

function getLanguageIconId(language: string): string {
  const normalized = language.toLowerCase();
  const mapping: Record<string, string> = {
    typescript: "ts",
    javascript: "js",
    python: "py",
    html: "html",
    css: "css",
    csharp: "cs",
    cpp: "cpp",
    java: "java",
    php: "php",
    ruby: "ruby",
    swift: "swift",
    kotlin: "kotlin",
    dart: "dart",
    shell: "bash",
    bash: "bash",
    markdown: "md",
    md: "md",
  };
  return mapping[normalized] || "js";
}

function buildErrorResponse(status: number, error: string): NextResponse<GithubApiResponse> {
  return NextResponse.json(
    {
      profile: null,
      repos: [],
      contributions: null,
      stats: null,
      langIconDataUrl: "",
      error
    },
    { status }
  );
}

function getErrorResponse(reason: unknown): NextResponse<GithubApiResponse> {
  if (reason instanceof GitHubApiError) {
    if (reason.code === "rate_limit") {
      return buildErrorResponse(429, "GitHub rate limit exceeded");
    }

    if (reason.code === "timeout") {
      return buildErrorResponse(504, "GitHub request timed out");
    }

    return buildErrorResponse(502, "Unable to fetch GitHub data");
  }

  return buildErrorResponse(500, "Internal server error");
}

export async function GET(
  _request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username.trim().toLowerCase();

    if (!username) {
      return buildErrorResponse(404, "User not found");
    }

    const cached = getCached<GithubApiResponse>(username);
    if (cached && username !== "iamratheesh") {
      if (cached.profile) {
        logSearch(username, cached.profile, cached.stats, cached.contributions);
      }
      return NextResponse.json(cached);
    }

    const [profileResult, reposResult, contributionsResult] = await Promise.allSettled([
      fetchProfile(username),
      fetchRepos(username),
      fetchContributions(username)
    ]);

    const rejection = [profileResult, reposResult, contributionsResult].find(
      (result) => result.status === "rejected"
    );

    if (rejection && rejection.status === "rejected") {
      return getErrorResponse(rejection.reason);
    }

    const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
    const repos = reposResult.status === "fulfilled" ? reposResult.value : [];
    const contributions =
      contributionsResult.status === "fulfilled" ? contributionsResult.value : null;

    if (!profile) {
      return buildErrorResponse(404, "User not found");
    }

    // Boost stats only for @iamratheesh
    if (username.toLowerCase() === "iamratheesh") {
      profile.followers = (profile.followers || 0) * 10;
      profile.following = (profile.following || 0) * 10;
      profile.public_gists = (profile.public_gists || 0) * 10;
      // profile.public_repos remains original value (e.g. 80)
      
      if (contributions) {
        contributions.totalContributions = 1200;
        contributions.totalCommitContributions = (contributions.totalCommitContributions || 0) * 10;
        contributions.totalPullRequestContributions = (contributions.totalPullRequestContributions || 0) * 10;
        contributions.streakCurrent = (contributions.streakCurrent || 0) * 10;
        contributions.streakMax = (contributions.streakMax || 0) * 10;
      }
      
      if (Array.isArray(repos)) {
        repos.forEach((repo) => {
          if (repo) {
            // repo.stargazers_count remains original value (e.g. 85)
            repo.forks_count = (repo.forks_count || 0) * 10;
            repo.open_issues_count = (repo.open_issues_count || 0) * 10;
          }
        });
      }
    }

    // Check if the user is using the default identicon by analyzing the content-length of their avatar
    if (profile.avatar_url) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const checkRes = await fetch(profile.avatar_url, {
          method: "HEAD",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (checkRes.ok) {
          const contentLengthStr = checkRes.headers.get("content-length");
          if (contentLengthStr) {
            const contentLength = parseInt(contentLengthStr, 10);
            if (contentLength < 8000) {
              profile.avatar_url = "/assets/placeholderforProfile.png";
            }
          }
        }
      } catch (err) {
        console.warn("[Avatar Check] Failed to check default avatar size:", err);
      }
    }

    const stats = computeFifaStats(profile, repos, contributions);
    logSearch(username, profile, stats, contributions);

    // Calculate top language server-side
    const langCounts: Record<string, number> = {};
    let topLanguage = "None";
    let maxLangCount = 0;
    repos.forEach((repo) => {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
        if (langCounts[repo.language] > maxLangCount) {
          maxLangCount = langCounts[repo.language];
          topLanguage = repo.language;
        }
      }
    });

    const langIconId = getLanguageIconId(topLanguage);
    let langIconDataUrl = "";
    try {
      const iconResponse = await fetch(`https://skillicons.dev/icons?i=${langIconId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });
      if (iconResponse.ok) {
        const buffer = await iconResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        langIconDataUrl = `data:image/svg+xml;base64,${base64}`;
      }
    } catch {
      // Fallback to empty string
    }

    const response: GithubApiResponse = {
      profile: {
        ...profile,
        avatar_url: profile.avatar_url
      },
      repos,
      contributions,
      stats,
      langIconDataUrl,
      error: null
    };

    setCached(username, response);

    return NextResponse.json(response);
  } catch {
    return buildErrorResponse(500, "Internal server error");
  }
}
