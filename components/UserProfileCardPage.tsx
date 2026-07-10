"use client";

import { toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ErrorState from "@/components/ErrorState";
import FifaCard from "@/components/FifaCard";
import FifaCardBack from "@/components/FifaCardBack";
import LoadingState from "@/components/LoadingState";
import type {
  FifaStats,
  GitHubContributions,
  GitHubProfile,
  GitHubRepo,
} from "@/types/github";

const FRAMES = [
  "/darkblueframe.png",
  "/greenframe.png",
  "/pinkframe.png",
  "/purpleframe.png",
  "/redframe.png",
  "/yellowframe.png",
];

const FRAME_KEYS: Record<string, string> = {
  "/darkblueframe.png": "darkblue",
  "/greenframe.png": "green",
  "/pinkframe.png": "pink",
  "/purpleframe.png": "purple",
  "/redframe.png": "red",
  "/yellowframe.png": "yellow",
};

const FRAME_PATHS: Record<string, string> = {
  darkblue: "/darkblueframe.png",
  green: "/greenframe.png",
  pink: "/pinkframe.png",
  purple: "/purpleframe.png",
  red: "/redframe.png",
  yellow: "/yellowframe.png",
};

const DECK_NUMBERS: Record<string, number> = {
  "/darkblueframe.png": 82,
  "/greenframe.png": 45,
  "/pinkframe.png": 17,
  "/purpleframe.png": 99,
  "/redframe.png": 22,
  "/yellowframe.png": 63,
};

type ApiResult = {
  profile: GitHubProfile | null;
  repos: GitHubRepo[];
  contributions: GitHubContributions | null;
  stats: FifaStats | null;
  langIconDataUrl: string;
  error: string | null;
};

function getErrorMessage(status: number, fallback?: string | null): string {
  if (fallback) {
    return fallback;
  }
  if (status === 404) {
    return "User not found.";
  }
  if (status === 429) {
    return "GitHub rate limit exceeded. Please try again later.";
  }
  if (status === 504) {
    return "GitHub request timed out. Please try again.";
  }
  return "Unable to fetch GitHub data.";
}

type UserProfileCardPageProps = {
  username: string;
};

export default function UserProfileCardPage({
  username,
}: UserProfileCardPageProps) {
  const normalizedUsername = username.trim().toLowerCase();
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [cardFrame, setCardFrame] = useState("/redframe.png");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showInstaTip, setShowInstaTip] = useState(false);
  const [statsData, setStatsData] = useState<{
    totalCreated: number;
    totalRated: number;
    latestAvatars: string[];
  }>({ totalCreated: 0, totalRated: 0, latestAvatars: [] });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/scouted-stats");
        if (res.ok) {
          const data = await res.json();
          setStatsData(data);
        }
      } catch {
        // Fallback or silence
      }
    }
    fetchStats();
  }, []);

  // Update URL to include the selected cardFrame query parameter
  useEffect(() => {
    if (normalizedUsername && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const frameParam = searchParams.get("frame");
      if (frameParam && FRAME_PATHS[frameParam]) {
        setCardFrame(FRAME_PATHS[frameParam]);
      } else {
        const randomIndex = Math.floor(Math.random() * FRAMES.length);
        const chosenFrame = FRAMES[randomIndex];
        setCardFrame(chosenFrame);
        const frameKey = FRAME_KEYS[chosenFrame] || "red";
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}?frame=${frameKey}`,
        );
      }
    }
  }, [normalizedUsername]);

  // Synchronize browser URL query parameters and local shareUrl when cardFrame changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const frameKey = FRAME_KEYS[cardFrame] || "red";
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("frame", frameKey);
      window.history.replaceState(
        null,
        "",
        currentUrl.pathname + currentUrl.search,
      );
      setShareUrl(currentUrl.href);
    }
  }, [cardFrame]);

  function handleShuffleDeck() {
    const randomIndex = Math.floor(Math.random() * FRAMES.length);
    const chosenFrame = FRAMES[randomIndex];
    setCardFrame(chosenFrame);
  }

  function handleCopyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const deckRef = useRef<HTMLDivElement | null>(null);
  const frontCardRef = useRef<HTMLElement | null>(null);
  const backCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!normalizedUsername) {
        if (isActive) {
          setLoading(false);
          setResult(null);
          setError("User not found.");
        }
        return;
      }

      if (isActive) {
        setLoading(true);
        setError(null);
        setResult(null);
      }

      try {
        const response = await fetch(
          `/api/github/${encodeURIComponent(normalizedUsername)}`,
        );
        const data = (await response
          .json()
          .catch(() => null)) as ApiResult | null;

        if (!isActive) {
          return;
        }

        if (!response.ok) {
          setResult(null);
          setError(getErrorMessage(response.status, data?.error));
          setLoading(false);
          return;
        }

        if (!data || data.profile === null) {
          setResult(null);
          setError(getErrorMessage(response.status, data?.error));
          setLoading(false);
          return;
        }

        setResult(data);
        setError(null);

        // Success delay to allow processing
        setTimeout(() => {
          if (isActive) {
            setLoading(false);
          }
        }, 2000);
      } catch {
        if (isActive) {
          setResult(null);
          setError("Unable to fetch GitHub data.");
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [normalizedUsername]);

  async function handleDownloadDeck() {
    const deckElement = deckRef.current;

    if (!deckElement) {
      setError("Card deck is not ready for export yet.");
      return;
    }

    const downloadUsername =
      result?.profile?.login?.trim() || normalizedUsername;
    if (!downloadUsername) {
      setError("Unable to determine a filename for the card.");
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const dataUrl = await toPng(deckElement, {
        cacheBust: true,
        pixelRatio: 2,
        style: {
          overflow: "visible",
          width: "max-content",
          height: "auto",
          display: "flex",
          flexDirection: "row",
          gap: "40px",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px",
          background: "transparent",
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${downloadUsername}-fifa-deck.png`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("Unable to export the card deck image.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#F8F9FD] via-[#F5F3FF] to-[#ECE9FF] text-slate-900 font-sans relative overflow-hidden selection:bg-violet-200">
      {/* Top Right Developer Badge */}
      <div className="absolute top-6 right-6 lg:top-8 lg:right-8 bg-[#F5F3FF] border border-[#E9E3FF] rounded-full px-4 py-2 flex items-center gap-2 text-xs font-semibold text-[#6D28D9] shadow-sm select-none hover:shadow transition-shadow z-50">
        <svg
          className="w-3.5 h-3.5 text-[#7C3AED]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
        </svg>
        <span>
          developer by{" "}
          <span className="font-extrabold text-[#7C3AED]">@iamratheesh</span>
        </span>
      </div>

      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl space-y-8 z-10">
          {/* Top row deck controllers */}
          <div className="flex justify-between items-center w-full">
            {/* Left Side: Deck ID Badge */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm select-none">
              <svg
                className="w-3.5 h-3.5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
              <span>Deck #{statsData.totalCreated || "..."}</span>
            </div>

            {/* Right Side: Shuffle Button */}
            <button
              onClick={handleShuffleDeck}
              className="group flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:shadow duration-200 select-none cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-500 transition-transform group-hover:rotate-45"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              <span>Shuffle Deck</span>
            </button>
          </div>

          {/* Header Title Section */}
          <div className="space-y-3 text-center flex flex-col items-center select-none">
            {/* Header tag */}
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase">
              GitHub Player Card
            </p>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bebas-neue tracking-wide text-slate-800 drop-shadow-sm leading-none flex items-center justify-center gap-2 uppercase">
              <span>@{normalizedUsername || "username"}</span>
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 text-[#7C3AED] fill-current shrink-0 self-center drop-shadow-[0_1.5px_3px_rgba(124,58,237,0.3)] transition-transform hover:scale-110 duration-200"
                viewBox="0 0 24 24"
              >
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.936.1-1.354.268C14.77 2.515 13.51 1.7 12 1.7c-1.51 0-2.77.815-3.42 2.078C8.162 3.61 7.706 3.51 7.228 3.51 5.12 3.51 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .936-.1 1.354-.268.65 1.263 1.91 2.078 3.42 2.078 1.51 0 2.77-.815 3.42-2.078.418.168.874.268 1.354.268 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.893 4.29L6.15 13.333c-.356-.35-.356-.917 0-1.268.357-.35.937-.35 1.293 0l2.164 2.126 5.86-5.753c.356-.35.936-.35 1.293 0 .356.35.356.918 0 1.268l-6.507 6.388c-.178.175-.412.263-.646.263s-.468-.088-.646-.263z" />
              </svg>
            </h1>

            {/* Subheading */}
            <p className="text-sm text-slate-500 font-medium font-sans max-w-md">
              Your GitHub stats, turned into a player card.
            </p>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-center text-rose-800">
                <p className="text-base font-semibold">{error}</p>
                <p className="mt-1.5 text-xs text-rose-800/80">
                  Go back and try another username.
                </p>
              </div>
              <ErrorState />
            </div>
          ) : result?.profile && result.stats ? (
            (() => {
              const totalStars = result.repos.reduce(
                (acc, r) => acc + r.stargazers_count,
                0,
              );
              const distinctLanguages = new Set(
                result.repos.map((r) => r.language).filter(Boolean),
              ).size;

              // Calculate top language
              const langCounts: Record<string, number> = {};
              let topLanguage = "None";
              let maxLangCount = 0;
              result.repos.forEach((repo) => {
                if (repo.language) {
                  langCounts[repo.language] =
                    (langCounts[repo.language] || 0) + 1;
                  if (langCounts[repo.language] > maxLangCount) {
                    maxLangCount = langCounts[repo.language];
                    topLanguage = repo.language;
                  }
                }
              });

              // Calculate account age
              const accountAgeYears = result.profile.created_at
                ? (
                    (new Date().getTime() -
                      new Date(result.profile.created_at).getTime()) /
                    (1000 * 60 * 60 * 24 * 365.25)
                  ).toFixed(1)
                : null;
              const joinedDateStr = result.profile.created_at
                ? new Date(result.profile.created_at).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "long", day: "numeric" },
                  )
                : "N/A";

              // Calculate total forks
              const totalForks = result.repos.reduce(
                (acc, r) => acc + (r.forks_count || 0),
                0,
              );

              // Calculate popular repo
              let popularProject = "None";
              let maxStars = 0;
              result.repos.forEach((repo) => {
                if (repo.stargazers_count > maxStars) {
                  maxStars = repo.stargazers_count;
                  popularProject = `${repo.name} (${repo.stargazers_count} ★)`;
                }
              });
              if (maxStars === 0 && result.repos.length > 0) {
                popularProject = result.repos[0].name;
              }

              // Calculate original repos ratio
              const originalRepos = result.repos.filter((r) => !r.fork).length;
              const totalReposCount = result.repos.length;
              const originalRatio =
                totalReposCount > 0
                  ? Math.round((originalRepos / totalReposCount) * 100)
                  : 100;

              // Calculate total open issues
              const totalOpenIssues = result.repos.reduce(
                (acc, r) => acc + r.open_issues_count,
                0,
              );

              const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Check out my GitHub FIFA Player Card! ${shareUrl}`,
              )}`;
              const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                shareUrl,
              )}`;

              return (
                <div className="space-y-6">
                  {/* Two-sided Card deck container - horizontal scrollable on mobile */}
                  <div className="w-full overflow-x-auto pb-4 scrollbar-none animate-float-slow">
                    <div
                      ref={deckRef}
                      className="flex flex-row items-center justify-start lg:justify-center gap-8 min-w-[800px] lg:min-w-0 p-4"
                    >
                      <FifaCard
                        ref={frontCardRef}
                        profile={result.profile}
                        stats={result.stats}
                        repos={result.repos}
                        cardFrame={cardFrame}
                        langIconDataUrl={result.langIconDataUrl}
                      />
                      <FifaCardBack
                        ref={backCardRef}
                        profile={result.profile}
                        repos={result.repos}
                        contributions={result.contributions}
                        cardFrame={cardFrame}
                      />
                    </div>
                  </div>

                  {/* Share Card Section Header Divider */}
                  <div className="relative flex items-center justify-center my-6 select-none">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200/60"></div>
                    </div>
                    <span className="relative px-3 bg-[#F5F3FF] text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      Share Your Card
                    </span>
                  </div>

                  {/* Share Buttons Row */}
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row items-center justify-center max-w-2xl mx-auto w-full px-2">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 select-none cursor-pointer text-center"
                    >
                      <svg
                        className="w-4 h-4 text-[#25D366] fill-current shrink-0"
                        viewBox="0 0 24 24"
                      >
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.016 14.12 1.01 11.5 1.01c-5.442 0-9.87 4.372-9.874 9.802-.001 1.734.463 3.428 1.34 4.927l-.993 3.623 3.731-.968zm11.602-7.077c-.304-.151-1.791-.873-2.068-.973-.277-.1-.478-.151-.68.151-.202.3-.777.973-.952 1.173-.176.2-.351.226-.655.076-.304-.151-1.283-.467-2.444-1.493-.903-.797-1.512-1.782-1.69-2.083-.178-.302-.019-.465.133-.615.136-.135.304-.351.456-.527.152-.176.202-.302.304-.502.102-.2.051-.377-.025-.527-.076-.151-.68-1.609-.932-2.209-.246-.587-.497-.508-.68-.518-.176-.01-.377-.01-.578-.01-.202 0-.528.075-.805.377-.277.301-1.057 1.029-1.057 2.509 0 1.48 1.082 2.91 1.233 3.111.151.2 2.13 3.21 5.159 4.499.72.307 1.28.49 1.72.63.725.228 1.385.196 1.906.119.58-.086 1.791-.724 2.043-1.422.251-.699.251-1.299.176-1.422-.075-.123-.277-.199-.58-.351z" />
                      </svg>
                      <span>WhatsApp Status</span>
                    </a>
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 select-none cursor-pointer text-center"
                    >
                      <svg
                        className="w-4 h-4 text-[#0A66C2] fill-current shrink-0"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      <span>LinkedIn</span>
                    </a>
                    <button
                      onClick={() => {
                        setShowInstaTip(true);
                        setTimeout(() => setShowInstaTip(false), 5000);
                      }}
                      className="relative flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 select-none cursor-pointer text-center"
                    >
                      <svg
                        className="w-4 h-4 text-[#C13584] fill-current shrink-0"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                      <span>Instagram Story</span>
                      {showInstaTip && (
                        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 bg-slate-900 text-white text-[10px] rounded-lg p-2.5 shadow-xl z-20 text-center leading-normal">
                          Instagram does not support direct link sharing.
                          Download your card below and upload it to your story!
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-violet-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 select-none cursor-pointer text-center"
                    >
                      <svg
                        className="w-4 h-4 text-slate-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      <span>{copied ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>

                  {/* Single Download button */}
                  <div className="flex flex-col items-center gap-4 mt-6">
                    <button
                      type="button"
                      onClick={handleDownloadDeck}
                      disabled={exporting}
                      className="w-full max-w-[360px] rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] px-5 py-3.5 text-sm font-bold text-white transition hover:shadow-violet-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-violet-300 disabled:text-white/80 flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg select-none"
                    >
                      <svg
                        className="w-5 h-5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <span>
                        {exporting ? "Generating Card..." : "Download Card"}
                      </span>
                    </button>

                    {/* Security message */}
                    <p className="text-slate-400 text-[11px] flex items-center justify-center gap-1 select-none font-medium">
                      <svg
                        className="w-3.5 h-3.5 shrink-0 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span>
                        Your data is fetched from GitHub and never stored.
                      </span>
                    </p>
                  </div>
                </div>
              );
            })()
          ) : (
            <ErrorState />
          )}
        </div>
      </div>
    </main>
  );
}
