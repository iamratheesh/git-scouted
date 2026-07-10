import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { fetchContributions, fetchProfile, fetchRepos } from "@/lib/github";
import { computeFifaStats } from "@/lib/stats";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username.trim();
    const { searchParams } = new URL(request.url);
    const frameKey = searchParams.get("frame") || "red";

    const FRAME_PATHS: Record<string, string> = {
      darkblue: "/darkblueframe.png",
      green: "/greenframe.png",
      pink: "/pinkframe.png",
      purple: "/purpleframe.png",
      red: "/redframe.png",
      yellow: "/yellowframe.png",
    };

    const frameFile = FRAME_PATHS[frameKey] || "/redframe.png";
    const origin = request.nextUrl.origin;
    const frameUrl = `${origin}${frameFile}`;

    // Connect to MongoDB to retrieve user details
    const client = await clientPromise;
    const db = client.db();
    const user = await db
      .collection("scouted_users")
      .findOne({ username: username.toLowerCase() });

    let profile: any;
    let stats: any;
    let contributions: any;
    let avatarUrl: string;
    let displayName: string;
    let publicReposCount = 0;
    let followers = 0;
    let following = 0;

    const placeholderUrl = `${origin}/assets/placeholderforProfile.png`;

    if (user) {
      profile = user.profileData || {};
      stats = user.stats || { OVR: 60, PAC: 50, SHO: 50, PAS: 50, DRI: 50, DEF: 50, PHY: 50 };
      contributions = user.contributions || { totalContributions: 0, totalCommitContributions: 0, streakMax: 0 };
      avatarUrl = user.avatarUrl || profile.avatar_url || placeholderUrl;
      displayName = profile.name || username;
      publicReposCount = profile.public_repos || 0;
      followers = profile.followers || 0;
      following = profile.following || 0;

      // Boost stats only for @iamratheesh
      if (username.toLowerCase() === "iamratheesh") {
        followers = followers * 10;
        following = following * 10;
        publicReposCount = publicReposCount * 10;
        if (contributions) {
          contributions.totalContributions = (contributions.totalContributions || 0) * 10;
          contributions.totalCommitContributions = (contributions.totalCommitContributions || 0) * 10;
          contributions.streakMax = (contributions.streakMax || 0) * 10;
        }
        if (stats) {
          if (stats.overall < 90) {
            stats.overall = 97;
            stats.pace = 96;
            stats.shooting = 99;
            stats.passing = 99;
            stats.dribbling = 88;
            stats.defending = 99;
            stats.physical = 92;
          }
        }
      }
    } else {
      // Fallback: Fetch directly from GitHub if not cached in DB
      try {
        const [prof, repos, contribs] = await Promise.all([
          fetchProfile(username),
          fetchRepos(username),
          fetchContributions(username),
        ]);

        if (!prof) {
          return new Response("User not found", { status: 404 });
        }

        profile = prof;

        // Boost stats only for @iamratheesh
        if (username.toLowerCase() === "iamratheesh") {
          profile.followers = (profile.followers || 0) * 10;
          profile.following = (profile.following || 0) * 10;
          profile.public_repos = (profile.public_repos || 0) * 10;
          profile.public_gists = (profile.public_gists || 0) * 10;
          
          if (contribs) {
            contribs.totalContributions = (contribs.totalContributions || 0) * 10;
            contribs.totalCommitContributions = (contribs.totalCommitContributions || 0) * 10;
            contribs.totalPullRequestContributions = (contribs.totalPullRequestContributions || 0) * 10;
            contribs.streakCurrent = (contribs.streakCurrent || 0) * 10;
            contribs.streakMax = (contribs.streakMax || 0) * 10;
          }
          
          if (Array.isArray(repos)) {
            repos.forEach((repo) => {
              if (repo) {
                repo.stargazers_count = (repo.stargazers_count || 0) * 10;
                repo.forks_count = (repo.forks_count || 0) * 10;
                repo.open_issues_count = (repo.open_issues_count || 0) * 10;
              }
            });
          }
        }

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
          } catch (e) {}
        }

        stats = computeFifaStats(profile, repos, contribs);
        contributions = contribs || { totalContributions: 0, totalCommitContributions: 0, streakMax: 0 };
        avatarUrl = profile.avatar_url || placeholderUrl;
        displayName = profile.name || username;
        publicReposCount = profile.public_repos || 0;
        followers = profile.followers || 0;
        following = profile.following || 0;
      } catch (err) {
        console.error("[OG API] Fallback fetch failed for", username, err);
        return new Response("User data unavailable", { status: 404 });
      }
    }

    if (!avatarUrl || avatarUrl.trim() === "") {
      avatarUrl = placeholderUrl;
    }

    // Load fonts dynamically from the public folder
    let fontData: ArrayBuffer | null = null;
    try {
      fontData = await fetch(
        new URL("../../../../public/font/rajdhani/Rajdhani-Bold.ttf", import.meta.url)
      ).then((res) => res.arrayBuffer());
    } catch (e) {
      console.error("Font loading error:", e);
    }

    const options = fontData
      ? {
          fonts: [
            {
              name: "Rajdhani",
              data: fontData,
              weight: 700 as const,
              style: "normal" as const,
            },
          ],
        }
      : {};

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(to bottom right, #F8F9FD, #F5F3FF, #ECE9FF)",
            fontFamily: fontData ? "Rajdhani" : "sans-serif",
            padding: "20px",
          }}
        >
          {/* Header row metadata */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "15px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "3px",
                color: "#94A3B8",
                textTransform: "uppercase",
                marginBottom: "5px",
              }}
            >
              GitHub Player Card
            </span>
            <span
              style={{
                fontSize: "36px",
                fontWeight: "extrabold",
                color: "#1E293B",
                textTransform: "uppercase",
                letterSpacing: "-0.5px",
              }}
            >
              @{username}
            </span>
          </div>

          {/* Cards Deck */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "40px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Front Card */}
            <div
              style={{
                display: "flex",
                width: "270px",
                height: "395px",
                borderRadius: "16px",
                padding: "20px",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Background Frame Image */}
              <img
                src={frameUrl}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "270px",
                  height: "395px",
                  borderRadius: "16px",
                }}
              />

              {/* OVR rating */}
              <div
                style={{
                  position: "absolute",
                  top: "40px",
                  left: "38px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "52px", fontWeight: "extrabold", color: "#FCD34D", lineHeight: "1" }}>
                  {stats.OVR}
                </span>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#FCD34D", letterSpacing: "1px", textTransform: "uppercase" }}>
                  DEV
                </span>
              </div>

              {/* User Name */}
              <div
                style={{
                  position: "absolute",
                  top: "140px",
                  left: "38px",
                  display: "flex",
                  flexDirection: "column",
                  width: "190px",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "extrabold",
                    color: "#FFFFFF",
                    textTransform: "uppercase",
                    lineHeight: "1.1",
                  }}
                >
                  {displayName}
                </span>
              </div>

              {/* Circular Avatar overlapping bottom right */}
              <img
                src={avatarUrl}
                style={{
                  position: "absolute",
                  bottom: "35px",
                  right: "35px",
                  width: "95px",
                  height: "95px",
                  borderRadius: "50%",
                  border: "3px solid #FCD34D",
                  objectFit: "cover",
                }}
              />

              {/* Stats capsules inside front card */}
              <div
                style={{
                  position: "absolute",
                  bottom: "35px",
                  left: "32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "row", gap: "6px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.65)",
                      borderRadius: "6px",
                      width: "36px",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ fontSize: "8px", color: "#94A3B8", fontWeight: "bold" }}>PAC</span>
                    <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{stats.PAC}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.65)",
                      borderRadius: "6px",
                      width: "36px",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ fontSize: "8px", color: "#94A3B8", fontWeight: "bold" }}>SHO</span>
                    <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{stats.SHO}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "row", gap: "6px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.65)",
                      borderRadius: "6px",
                      width: "36px",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ fontSize: "8px", color: "#94A3B8", fontWeight: "bold" }}>PAS</span>
                    <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{stats.PAS}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.65)",
                      borderRadius: "6px",
                      width: "36px",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ fontSize: "8px", color: "#94A3B8", fontWeight: "bold" }}>DRI</span>
                    <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{stats.DRI}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "row", gap: "6px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.65)",
                      borderRadius: "6px",
                      width: "36px",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ fontSize: "8px", color: "#94A3B8", fontWeight: "bold" }}>DEF</span>
                    <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{stats.DEF}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.65)",
                      borderRadius: "6px",
                      width: "36px",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ fontSize: "8px", color: "#94A3B8", fontWeight: "bold" }}>PHY</span>
                    <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{stats.PHY}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Card */}
            <div
              style={{
                display: "flex",
                width: "270px",
                height: "395px",
                borderRadius: "16px",
                padding: "30px 20px 20px 20px",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Background Frame Image */}
              <img
                src={frameUrl}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "270px",
                  height: "395px",
                  borderRadius: "16px",
                }}
              />

              <span
                style={{
                  position: "relative",
                  fontSize: "18px",
                  fontWeight: "extrabold",
                  color: "#FCD34D",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "12px",
                  zIndex: 10,
                }}
              >
                Statistics
              </span>

              {/* Stats lines list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "9px", width: "100%", position: "relative", zIndex: 10 }}>
                {[
                  { label: "Total Contributions", val: contributions.totalContributions || 0 },
                  { label: "Commit Contributions", val: contributions.totalCommitContributions || 0 },
                  { label: "Longest Streak", val: `${contributions.streakMax || 0} Days` },
                  { label: "Public Repositories", val: publicReposCount },
                  { label: "Followers Count", val: followers },
                  { label: "Following", val: following },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        fontSize: "9px",
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        marginBottom: "1px",
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{ color: "#FCD34D" }}>{item.val}</span>
                    </div>
                    {/* Progress Bar background and fill */}
                    <div
                      style={{
                        display: "flex",
                        height: "3px",
                        width: "100%",
                        background: "rgba(255,255,255,0.15)",
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          height: "100%",
                          width: "75%",
                          background: "#FCD34D",
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        ...options,
      }
    );
  } catch (err) {
    console.error("OG Image generation failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
