"use client";

import type { FifaStats, GitHubProfile, GitHubRepo } from "@/types/github";
import { forwardRef, useEffect, useState } from "react";
import { removeBackground } from "@/lib/backgroundRemoval";

type FifaCardProps = {
  profile: GitHubProfile;
  stats: FifaStats;
  repos: GitHubRepo[];
  cardFrame?: string;
  langIconDataUrl?: string;
};

const FRAMES = [
  "/darkblueframe.png",
  "/greenframe.png",
  "/pinkframe.png",
  "/purpleframe.png",
  "/redframe.png",
  "/yellowframe.png",
];

const SHADOW_COLORS: Record<string, string> = {
  "/darkblueframe.png": "#295166",
  "/greenframe.png": "#43CA04",
  "/pinkframe.png": "#B20C67",
  "/purpleframe.png": "#B33ADD",
  "/redframe.png": "#FC171D",
  "/yellowframe.png": "#FCD704",
};

function getDisplayName(profile: GitHubProfile): string {
  return profile.name?.trim() || profile.login;
}

function getLanguageIconId(language: string): string {
  const normalized = language.trim().toLowerCase();
  const mapping: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    html: "html",
    css: "css",
    golang: "go",
    go: "go",
    rust: "rust",
    "c++": "cpp",
    cpp: "cpp",
    "c#": "cs",
    cs: "cs",
    c: "c",
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

const FifaCard = forwardRef<HTMLElement, FifaCardProps>(function FifaCard(
  { profile, stats, repos, cardFrame: propCardFrame, langIconDataUrl },
  ref,
) {
  const displayName = getDisplayName(profile);
  const avatarSrc = profile.avatar_url?.trim() || "";
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [processedAvatarSrc, setProcessedAvatarSrc] = useState(avatarSrc || "/assets/placeholderforProfile.png");
  const [localCardFrame, setLocalCardFrame] = useState("/redframe.png");

  // Choose a random frame on mount or when username changes
  useEffect(() => {
    if (!propCardFrame) {
      const randomIndex = Math.floor(Math.random() * FRAMES.length);
      setLocalCardFrame(FRAMES[randomIndex]);
    }
  }, [profile.login, propCardFrame]);

  const cardFrame = propCardFrame || localCardFrame;
  const shadowColor = SHADOW_COLORS[cardFrame] || "#dc2626";

  useEffect(() => {
    setAvatarLoadError(false);
    
    if (!avatarSrc) {
      setProcessedAvatarSrc("/assets/placeholderforProfile.png");
      return;
    }

    // Temporarily set placeholder image as a preview while background removal is in progress
    setProcessedAvatarSrc("/assets/placeholderforProfile.png");

    let isMounted = true;
    removeBackground(avatarSrc)
      .then((resUrl) => {
        if (isMounted) {
          setProcessedAvatarSrc(resUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProcessedAvatarSrc(avatarSrc);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [avatarSrc]);

  // Unique Signature Star Rating: Blend of Overall standing (65%) and Dribbling adaptability (35%)
  const rawStars = 1.5 + ((stats.overall - 50) / 49) * 2.5 + ((stats.dribbling - 50) / 49) * 1;
  const starCount = Math.max(1, Math.min(5, Math.round(rawStars)));
  const starRating = Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={i < starCount ? "text-yellow-400" : "text-amber-900/40"}
    >
      ★
    </span>
  ));

  // Calculate top language
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

  const statItems = [
    { label: "PAC", value: stats.pace },
    { label: "SHO", value: stats.shooting },
    { label: "PAS", value: stats.passing },
    { label: "DRI", value: stats.dribbling },
    { label: "DEF", value: stats.defending },
    { label: "PHY", value: stats.physical },
  ];

  return (
    <section
      ref={ref}
      style={{ backgroundImage: `url(${cardFrame})` }}
      className="relative overflow-hidden rounded-[1rem] border border-slate-400/60  bg-cover bg-center w-[380px] h-[570px] mx-auto text-white select-none"
    >
      {/* Top Left Section: Repos and Name */}
      <div className="absolute top-8 left-16 z-10 flex flex-col">
        <span className="text-[5.5rem] font-rajdhani-bold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#ffe082] via-[#d4af37] to-[#b38f1d] drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
          {profile.public_repos}
        </span>
        <span className="text-[3.2rem] font-rajdhani-bold tracking-tight leading-none uppercase bg-gradient-to-r from-[#ffe082] via-[#d4af37] to-[#ffe082] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-[245px] break-words">
          {displayName}
        </span>
      </div>

      {/* Top Right Section: Top Language Icon */}
      <div className="absolute top-4 right-2 z-10 w-14 h-14 rounded-lg overflow-hidden border border-slate-700/50 shadow-md">
        <img
          src={langIconDataUrl || `https://skillicons.dev/icons?i=${langIconId}`}
          alt={`${topLanguage} icon`}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Top Right Section: Vertical Handle */}
      <div
        style={{ writingMode: "vertical-rl" }}
        className="absolute top-20 right-4 z-10 text-transparent bg-clip-text bg-gradient-to-b from-[#ffe082] via-[#d4af37] to-[#ffe082] font-bebas-neue tracking-widest text-xs  drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]"
      >
        @{profile.login}
      </div>

      {/* Left Column: Stats Badges */}
      <div className="absolute bottom-[135px] left-8 z-10 grid grid-cols-2 gap-x-3.5 gap-y-3.5">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="w-[74px] h-[62px] relative"
            style={{
              filter: `drop-shadow(3px 3px 0px ${shadowColor})`,
            }}
          >
            <div
              className="w-full h-full bg-black flex flex-col items-center justify-center"
              style={{
                clipPath:
                  "polygon(0 0, 78% 0, 100% 22%, 100% 100%, 22% 100%, 0 78%)",
              }}
            >
              <span className="text-[10px] font-rajdhani-semibold tracking-wider text-slate-300 uppercase">
                {item.label}
              </span>
              <span className="text-xl font-rajdhani-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-yellow-400 mt-0.5">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Right Column: Player Avatar (overlapping, absolute background-removed placement) */}
      <div className="absolute bottom-0 right-[-90px] w-[330px] h-[330px] z-0 pointer-events-none flex items-end justify-end">
        {processedAvatarSrc && !avatarLoadError ? (
          <img
            src={processedAvatarSrc}
            alt={`${displayName} avatar`}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setAvatarLoadError(true)}
            className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]"
          />
        ) : (
          <img
            src="/assets/placeholderforProfile.png"
            alt={`${displayName} placeholder avatar`}
            className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]"
          />
        )}
      </div>

      {/* Bottom Left Section: Stars and OVR */}
      <div className="absolute bottom-8 left-8 z-10 flex flex-col">
        <div className="flex gap-0.5 text-yellow-400 text-sm drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]">
          {starRating}
        </div>
        <span className="text-[4rem] font-ddin-bold tracking-tight leading-none mt-1 text-transparent bg-clip-text bg-gradient-to-b from-[#ffe082] via-[#d4af37] to-[#b38f1d] drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
          {stats.overall}
        </span>
      </div>
    </section>
  );
});

export default FifaCard;
