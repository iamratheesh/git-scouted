"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import UsernameForm from "@/components/UsernameForm";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [stars, setStars] = useState<number | null>(null);
  const [statsData, setStatsData] = useState<{
    totalCreated: number;
    totalRated: number;
    latestAvatars: string[];
  }>({
    totalCreated: 0,
    totalRated: 0,
    latestAvatars: [],
  });

  useEffect(() => {
    // 1. Fetch Apple Vision Pro repo stars for testing
    fetch(
      "https://api.github.com/repos/iamratheesh/Apple-Vision-Pro-3D-Website",
    )
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data) => {
        if (data && typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch repo star count:", err);
      });

    // 2. Fetch MongoDB real-time card and rating stats
    fetch("/api/scouted-stats")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch scouted stats");
      })
      .then((data) => {
        if (data && typeof data.totalRated === "number") {
          setStatsData({
            totalCreated: data.totalCreated,
            totalRated: data.totalRated,
            latestAvatars: data.latestAvatars || [],
          });
        }
      })
      .catch((err) => {
        console.warn("Could not fetch database stats:", err);
      });
  }, []);

  function handleSubmit() {
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      return;
    }

    router.push(`/${encodeURIComponent(trimmedUsername)}`);
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#F8F9FD] via-[#F5F3FF] to-[#ECE9FF] text-slate-900 font-sans flex items-center justify-center p-6 md:p-12 lg:p-24 relative overflow-hidden selection:bg-violet-200">
      {/* Top Right Developer Badge */}
      <div className="absolute top-6 right-6 lg:top-8 lg:right-8 bg-[#F5F3FF] border border-[#E9E3FF] rounded-full px-4 py-2 flex items-center gap-2 text-xs font-semibold text-[#6D28D9] shadow-sm select-none hover:shadow transition-shadow">
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

      {/* Main Split Layout Container */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Column: Branding, Title, Form, Stats */}
        <div className="lg:col-span-6 flex flex-col items-start space-y-6 text-left">
          {/* Astronaut Character */}
          <div className="animate-float select-none">
            <img
              src="/assets/githubcartoon.png"
              alt="GitHub Astronaut Character"
              className="w-40 h-auto object-contain filter drop-shadow-[0_10px_20px_rgba(124,58,237,0.15)]"
            />
          </div>

          {/* Pill Badge */}
          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-full px-3.5 py-1 text-[10px] tracking-wider uppercase font-semibold text-slate-800 shadow-sm select-none">
            <span className="text-slate-850 font-bold">Github</span>
            <span className="text-slate-400 font-normal">×</span>
            <span className="text-[#6D28D9] font-bold">Dev World Cup</span>
          </div>

          {/* Title */}
          <h1 className="text-6xl sm:text-7xl md:text-[5.5rem] font-bold tracking-tight text-slate-900 font-bebas-neue uppercase leading-[0.9] select-none flex items-baseline">
            <span>GET SCOUTED</span>
            <span className="inline-block w-4 h-4 bg-[#7C3AED] ml-1.5 rounded-[2px]"></span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-slate-500 italic font-medium font-sans leading-relaxed max-w-lg select-none">
            Turn your GitHub profile into a World Cup–style player card. Get rated on coding, open-source contributions, consistency, and developer impact.
          </p>

          {/* Username Form */}
          <div className="w-full max-w-md">
            <UsernameForm
              value={username}
              onChange={setUsername}
              onSubmit={handleSubmit}
            />
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-2 mt-4 select-none">
            {/* Green pulsing dot */}
            <span className="relative flex h-2.5 w-2.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>

            {/* Overlapping Real Avatars */}
            <div className="flex -space-x-3.5">
              {statsData.latestAvatars.map((url, index) => (
                <div
                  key={index}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-100 flex items-center justify-center select-none"
                >
                  <img
                    src={url}
                    alt="Scouted User Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}

              {/* Remaining Count Pill - Only visible if there are more cards than displayed avatars */}
              {statsData.totalCreated > statsData.latestAvatars.length && (
                <div className="w-12 h-10 rounded-full bg-[#F97316] flex items-center justify-center border-2 border-white shadow-sm text-[11px] font-extrabold text-white leading-none px-1.5 select-none">
                  {statsData.totalCreated - statsData.latestAvatars.length}+
                </div>
              )}
            </div>

            {/* Count Metrics */}
            <div className="flex items-center text-[11px] font-bold text-slate-400 tracking-wide ml-2 uppercase">
              <span>
                {statsData.totalCreated}{" "}
                {statsData.totalCreated === 1
                  ? "Card Created"
                  : "Cards Created"}
              </span>
              <span className="text-slate-200 mx-2">|</span>
              {/* <span>
                {statsData.totalRated}{" "}
                {statsData.totalRated === 1 ? "Card Rated" : "Cards Rated"}
              </span> */}
            </div>
          </div>
        </div>

        {/* Right Column: Infographic & Star Button */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-6">
          <div className="animate-float-card select-none w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[420px] flex justify-center">
            <img
              src="/assets/hoempagerightimg.png"
              alt="GitHub FIFA Card"
              className="w-full h-auto object-contain transition-all duration-500 ease-out hover:scale-[1.03] hover:rotate-[-1deg] filter drop-shadow-[0_20px_40px_rgba(124,58,237,0.12)]"
            />
          </div>

          {/* GitHub Repository Star Badge */}
          <div className="w-full flex justify-center lg:justify-end lg:pr-8 absolute bottom-6 right-6 lg:bottom-8 lg:right-8">
            <a
              href="https://github.com/iamratheesh/Apple-Vision-Pro-3D-Website"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 bg-white/70 hover:bg-white border border-slate-200 hover:border-violet-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0 duration-200"
            >
              <svg
                className="w-4 h-4 text-slate-700"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
              </svg>
              <span>Star on GitHub</span>
              <span className="text-slate-200">|</span>
              <div className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5 text-amber-500 fill-amber-500 group-hover:animate-pulse"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span className="font-bold text-slate-700">
                  {stars !== null ? stars : "128"}
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
