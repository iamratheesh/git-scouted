"use client";

import type {
  GitHubContributions,
  GitHubProfile,
  GitHubRepo,
} from "@/types/github";
import { forwardRef } from "react";

type FifaCardBackProps = {
  profile: GitHubProfile;
  repos: GitHubRepo[];
  contributions: GitHubContributions | null;
  cardFrame: string;
};

const SHADOW_COLORS: Record<string, string> = {
  "/darkblueframe.png": "#1d4ed8",
  "/greenframe.png": "#16a34a",
  "/pinkframe.png": "#db2777",
  "/purpleframe.png": "#7c3aed",
  "/redframe.png": "#dc2626",
  "/yellowframe.png": "#ca8a04",
};

const BAR_GRADIENTS: Record<string, string> = {
  "/darkblueframe.png": "from-blue-500 to-cyan-400",
  "/greenframe.png": "from-green-500 to-emerald-400",
  "/pinkframe.png": "from-pink-500 to-rose-400",
  "/purpleframe.png": "from-purple-500 to-indigo-400",
  "/redframe.png": "from-red-500 to-orange-400",
  "/yellowframe.png": "from-yellow-500 to-amber-400",
};

function getDisplayName(profile: GitHubProfile): string {
  return profile.name?.trim() || profile.login;
}

function countDistinctLanguages(repos: GitHubRepo[]): number {
  const languages = new Set<string>();
  for (const repo of repos) {
    if (repo.language) {
      languages.add(repo.language);
    }
  }
  return languages.size;
}

function sumRepoStars(repos: GitHubRepo[]): number {
  return repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
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

const FifaCardBack = forwardRef<HTMLElement, FifaCardBackProps>(
  function FifaCardBack({ profile, repos, contributions, cardFrame }, ref) {
    const displayName = getDisplayName(profile);
    const shadowColor = SHADOW_COLORS[cardFrame] || "#dc2626";
    const barGradient =
      BAR_GRADIENTS[cardFrame] || "from-red-500 to-orange-400";

    // Calculations
    const totalStars = sumRepoStars(repos);
    const distinctLanguages = countDistinctLanguages(repos);
    const accountAgeYears = getAccountAgeYears(profile.created_at);
    const totalReposCount = repos.length;
    const originalRepos = repos.filter((r) => !r.fork).length;
    const originalRatio =
      totalReposCount > 0
        ? Math.round((originalRepos / totalReposCount) * 100)
        : 100;

    // Find popular project
    let popularProject = "None";
    let maxStars = -1;
    repos.forEach((r) => {
      if ((r.stargazers_count || 0) > maxStars) {
        maxStars = r.stargazers_count || 0;
        popularProject = r.name;
      }
    });

    const safeContributions = contributions ?? {
      totalContributions: 0,
      totalCommitContributions: 0,
      totalPullRequestContributions: 0,
      streakCurrent: 0,
      streakMax: 0,
    };

    const statItems = [
      {
        label: "Total Contributions",
        value: safeContributions.totalContributions,
        percentage: Math.min(
          100,
          (safeContributions.totalContributions / 2000) * 100,
        ),
        isText: false,
      },
      {
        label: "Commit Contributions",
        value: safeContributions.totalCommitContributions,
        percentage: Math.min(
          100,
          (safeContributions.totalCommitContributions / 1000) * 100,
        ),
        isText: false,
      },
      {
        label: "Languages Used",
        value: distinctLanguages,
        percentage: Math.min(100, (distinctLanguages / 12) * 100),
        isText: false,
      },
      {
        label: "Original Code Ratio",
        value: `${originalRatio}%`,
        percentage: originalRatio,
        isText: false,
      },
      {
        label: "Account Age",
        value: `${accountAgeYears} Years`,
        percentage: Math.min(100, (accountAgeYears / 10) * 100),
        isText: false,
      },
      {
        label: "Starred Projects",
        value: profile.starredCount,
        percentage: Math.min(100, (profile.starredCount / 500) * 100),
        isText: false,
      },
      {
        label: "Longest Streak",
        value: `${safeContributions.streakMax} Days`,
        percentage: Math.min(100, (safeContributions.streakMax / 60) * 100),
        isText: false,
      },
      {
        label: "Repository Stars",
        value: totalStars,
        percentage: Math.min(100, (totalStars / 150) * 100),
        isText: false,
      },
      {
        label: "Most Popular Repo",
        value: popularProject,
        percentage: 0,
        isText: true,
      },
    ];

    return (
      <section
        ref={ref}
        style={{ backgroundImage: `url(${cardFrame})` }}
        className="relative overflow-hidden rounded-[1rem] border border-slate-400/60  bg-cover bg-center w-[380px] h-[570px] mx-auto text-white select-none p-6 flex flex-col justify-between"
      >
        {/* Header section */}
        <div className="flex justify-between items-start z-10 border-b border-white/10 pb-3">
          <div className="flex flex-col">
            <span className="text-[1.8rem] font-rajdhani-bold tracking-tight uppercase leading-none bg-gradient-to-r from-[#ffe082] via-[#d4af37] to-[#ffe082] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              STATISTICS
            </span>
            <span className="text-xs font-rajdhani-semibold text-slate-300 uppercase tracking-widest mt-1">
              {displayName}
            </span>
          </div>

          {/* Vertical Handle */}
          <div
            style={{ writingMode: "vertical-rl" }}
            className="text-transparent bg-clip-text bg-gradient-to-b from-[#ffe082] via-[#d4af37] to-[#ffe082] font-bebas-neue tracking-widest text-[10px] uppercase drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] mt-0.5"
          >
            @{profile.login}
          </div>
        </div>

        {/* Body section: Metrics List */}
        <div className="flex-grow flex flex-col justify-center gap-3.5 z-10 py-4">
          {statItems.map((item, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-rajdhani-semibold uppercase tracking-wider text-slate-300">
                  {item.label}
                </span>
                <span className="text-[13px] font-rajdhani-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-yellow-400">
                  {item.value}
                </span>
              </div>

              {item.isText ? (
                <div
                  className="w-full bg-black/60 rounded-md py-1 px-2 border border-slate-700/30 text-[10px] font-rajdhani-semibold text-amber-200/90 truncate mt-1 shadow-sm"
                  // style={{ filter: `drop-shadow(2px 2px 0px ${shadowColor})` }}
                >
                  ★ {item.value}
                </div>
              ) : (
                <div
                  className="h-1.5 w-full bg-black/70 rounded-full overflow-hidden mt-1 border border-slate-800/50"
                  // style={{ filter: `drop-shadow(2px 2px 0px ${shadowColor})` }}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer section */}
        <div className="border-t border-white/10 pt-3 flex justify-between items-center z-10 text-[10px] font-rajdhani-semibold uppercase tracking-wider text-slate-400">
          <span>GitHub FIFA Card Deck</span>
          <span className="text-yellow-400">★ ★ ★ ★ ★</span>
        </div>
      </section>
    );
  },
);

export default FifaCardBack;
