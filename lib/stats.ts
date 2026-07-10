import type { FifaStats, GitHubContributions, GitHubProfile, GitHubRepo } from "@/types/github";

const BASE_SCORE = 50;
const MAX_SCORE = 99;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return BASE_SCORE;
  }
  return Math.max(BASE_SCORE, Math.min(MAX_SCORE, Math.round(value)));
}

function countDistinctLanguages(repos: GitHubRepo[]): number {
  const languages = new Set<string>();
  for (const repo of repos) {
    if (repo.language !== null) {
      languages.add(repo.language);
    }
  }
  return languages.size;
}

function sumRepoStars(repos: GitHubRepo[]): number {
  let total = 0;
  for (const repo of repos) {
    total += typeof repo.stargazers_count === "number" && Number.isFinite(repo.stargazers_count) 
      ? repo.stargazers_count 
      : 0;
  }
  return total;
}

function sumRepoForks(repos: GitHubRepo[]): number {
  let total = 0;
  for (const repo of repos) {
    total += typeof repo.forks_count === "number" && Number.isFinite(repo.forks_count) 
      ? repo.forks_count 
      : 0;
  }
  return total;
}

function sumRepoOpenIssues(repos: GitHubRepo[]): number {
  let total = 0;
  for (const repo of repos) {
    total += typeof repo.open_issues_count === "number" && Number.isFinite(repo.open_issues_count) 
      ? repo.open_issues_count 
      : 0;
  }
  return total;
}

function toSafeCount(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getAccountAgeYears(createdAt: string): number {
  if (!createdAt) return 1;
  try {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.round((diffDays / 365) * 10) / 10);
  } catch {
    return 1;
  }
}

export function computeFifaStats(
  profile: GitHubProfile,
  repos: GitHubRepo[],
  contributions: GitHubContributions | null
): FifaStats {
  const totalStars = sumRepoStars(repos);
  const totalForks = sumRepoForks(repos);
  const totalOpenIssues = sumRepoOpenIssues(repos);
  const distinctLanguages = countDistinctLanguages(repos);
  
  const safeContributions = contributions ?? {
    totalContributions: 0,
    totalCommitContributions: 0,
    totalPullRequestContributions: 0,
    streakCurrent: 0,
    streakMax: 0
  };

  // Extract variables
  const commits = toSafeCount(safeContributions.totalCommitContributions);
  const currentStreak = toSafeCount(safeContributions.streakCurrent);
  const maxStreak = toSafeCount(safeContributions.streakMax);
  const prs = toSafeCount(safeContributions.totalPullRequestContributions);
  const orgsCount = Array.isArray(profile.orgs) ? profile.orgs.length : 0;
  const gists = toSafeCount(profile.public_gists);
  const reposCount = toSafeCount(profile.public_repos);
  const following = toSafeCount(profile.following);
  const followers = toSafeCount(profile.followers);
  const accountAgeYears = getAccountAgeYears(profile.created_at);
  const annualContribs = toSafeCount(safeContributions.totalContributions);

  // Signature Modifiers
  const consistencyRatio = maxStreak > 0 ? (currentStreak / maxStreak) : 0;
  const totalReposCount = repos.length;
  const originalRepos = repos.filter((r) => !r.fork).length;
  const codePurity = totalReposCount > 0 ? (originalRepos / totalReposCount) : 1;
  const socialRatio = following > 0 ? (followers / following) : followers;
  const cappedSocialRatio = Math.min(2, socialRatio);

  // 1. PAC (Pace / Agility): Saturation speed modulated by active streak consistency
  const paceBase = 1 - Math.exp(-commits / 250);
  const pace = clampScore(BASE_SCORE + 49 * paceBase * (0.7 + 0.3 * consistencyRatio));

  // 2. SHO (Shooting / Precision): Star-burst accomplishments modulated by code originality
  const shootingBase = 1 - Math.exp(-totalStars / 35);
  const shooting = clampScore(BASE_SCORE + 49 * shootingBase * (0.6 + 0.4 * codePurity));

  // 3. PAS (Passing / Coordination): Collaborative connectivity modulated by community influence
  const pasNumerator = prs * 3.5 + orgsCount * 18 + totalOpenIssues * 1.2;
  const passingBase = 1 - Math.exp(-pasNumerator / 120);
  const passing = clampScore(BASE_SCORE + 49 * passingBase * (0.75 + 0.25 * Math.min(1, cappedSocialRatio)));

  // 4. DRI (Dribbling / Adaptability): Fluid polyglot skill modulated by gist usage
  const dribblingBase = 1 - Math.exp(-distinctLanguages / 6);
  const gistBase = 1 - Math.exp(-gists / 8);
  const dribbling = clampScore(BASE_SCORE + 49 * dribblingBase * (0.7 + 0.3 * gistBase));

  // 5. DEF (Defending / Resilience): Code stability modulated by account longevity
  const defendingBase = 1 - Math.exp(-reposCount / 25);
  const ageBase = 1 - Math.exp(-accountAgeYears / 4);
  const defending = clampScore(BASE_SCORE + 49 * defendingBase * (0.55 + 0.45 * ageBase));

  // 6. PHY (Physical / Stamina): Production energy modulated by developer network size
  const physicalBase = 1 - Math.exp(-annualContribs / 1200);
  const followersBase = 1 - Math.exp(-followers / 150);
  const physical = clampScore(BASE_SCORE + 49 * physicalBase * (0.65 + 0.35 * followersBase));

  // 7. OVR (Overall Signature Rating): Gaming weighted class average (highlights strengths)
  const statsList = [pace, shooting, passing, dribbling, defending, physical];
  statsList.sort((a, b) => b - a); // descending
  
  // Weight top 3 traits higher (0.22 each = 66%), bottom 3 lower (0.113 each = 34%)
  const overall = Math.round(
    (statsList[0] + statsList[1] + statsList[2]) * 0.22 + 
    (statsList[3] + statsList[4] + statsList[5]) * 0.113
  );

  return {
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical,
    overall
  };
}

export function calculateFifaStats(
  profile: GitHubProfile,
  repos: GitHubRepo[],
  contributions: GitHubContributions | null
): FifaStats {
  return computeFifaStats(profile, repos, contributions);
}
