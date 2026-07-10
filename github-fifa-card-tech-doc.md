# GitHub FIFA Card — Technical Implementation Doc

## 1. Project Overview
A Next.js application where a user enters a **GitHub username**. The app fetches
that user's public profile, repositories, and contribution activity from the
GitHub API, converts the raw numbers into FIFA-style ratings (PACE, SHOOTING,
PASSING, etc.), and renders a shareable player card. There is no database —
all fetched data lives only in React state for the current session.

---

## 2. Tech Stack

| Layer | Choice | Purpose |
|---|---|---|
| Framework | Next.js (App Router) | Frontend + backend API routes in one project |
| Language | TypeScript | Type safety across API responses and components |
| State management | React state (`useState`/`useReducer`) | Holds fetched data for the session; no persistence |
| Styling | Tailwind CSS | Card and form UI |
| Card export | Image-export library (e.g. `html-to-image`) | Converts the rendered card into a downloadable PNG |
| Data source | GitHub REST API + GitHub GraphQL API | Profile/repo data (REST) and contribution/commit/PR data (GraphQL) |
| Auth to GitHub | One server-side Personal Access Token | Authenticates your server to GitHub, not the visiting user |
| Caching | In-memory cache on the server | Avoids repeat API calls for the same username within a session |

---

## 3. Environment Setup

A single GitHub Personal Access Token is generated once (from your own GitHub
account, Developer Settings → Personal Access Tokens) and stored as a server-side
environment variable. It only needs public read access — no special scopes,
since the app only reads public profile/repo/contribution data, never private
data belonging to visitors.

This token must never be exposed to the browser/client — it lives only in
server-side code (API routes), which is a natural fit for Next.js's App Router
since API routes run server-side by default.

---

## 4. Project Structure (Conceptual)

- **API layer**: a single backend endpoint responsible for handling a username,
  checking the cache, calling GitHub, computing stats, and returning one combined
  response.
- **GitHub integration layer**: a dedicated module responsible only for talking
  to GitHub — fetching profile data, repository lists, and contribution/commit/PR
  data. Keeping this isolated makes it easy to adjust if GitHub's API changes.
- **Stats/scoring layer**: a separate module responsible for turning raw numbers
  (stars, repo count, commits, followers, PRs) into normalized 0–99 FIFA-style
  ratings.
- **Cache layer**: a lightweight in-memory store (a simple key–value map with an
  expiry time) sitting between the API layer and GitHub, so repeated lookups of
  the same username don't burn through the API rate limit.
- **UI layer**: a form component for entering a username, a card component for
  displaying the result, and a page component that owns the session state
  (loading, error, and result states) and coordinates between them.

---

## 5. Data Flow

1. User types a GitHub username into the form and submits.
2. The frontend calls the app's own API endpoint (not GitHub directly), passing
   the username.
3. The API endpoint first checks the in-memory cache for that username.
4. On a cache miss, it makes two kinds of requests to GitHub in parallel:
   - A REST request for the user's profile (name, bio, avatar, followers,
     public repo count).
   - A REST request for the user's repository list (used to sum star counts and
     detect language variety).
   - A GraphQL request for the user's contribution activity over the past year
     (total contributions, commit contributions, pull request contributions).
5. The API endpoint combines these results, runs them through the stats/scoring
   layer to produce the FIFA-style ratings, stores the combined result in the
   cache, and returns everything as one JSON response.
6. The frontend stores this response in React state and renders the card.
7. If the user wants to keep the card, a download action converts the rendered
   card element into a PNG image client-side — nothing is saved server-side.

---

## 6. Why REST *and* GraphQL Are Both Needed

- GitHub's REST API covers profile info, repository lists, and star/follower
  counts well, and works with simple authenticated requests.
- However, contribution calendar data, yearly commit totals, and pull request
  contribution counts are **only available through GitHub's GraphQL API** —
  there is no REST equivalent for these fields.
- GraphQL always requires the access token, even for public data, unlike REST
  which allows limited anonymous access.

---

## 7. Stat Conversion Approach

Raw GitHub numbers vary hugely between casual and prolific users (e.g. 2 repos
vs. 300 repos), so a direct 1-to-1 mapping to a 0–99 scale would be unfair. The
scoring layer instead uses a logarithmic normalization approach: a formula that
compresses very large values while still rewarding growth, so that both a
beginner profile and a highly active profile land at sensible, comparable
positions on the 1–99 scale rather than one maxing out instantly and the other
sitting near zero.

Each FIFA-style attribute maps to a different underlying signal:
- **Pace** ← commit frequency
- **Shooting** ← total stars received across repositories
- **Passing** ← pull request activity (collaboration signal)
- **Dribbling** ← variety of programming languages used
- **Defending** ← total public repository count
- **Physical** ← follower count
- **Overall** ← total yearly contribution count

These mappings are a starting design and are expected to be tuned once real
usernames are tested against them.

---

## 8. State Management (No Database)

Since there is no persistence layer, all fetched data exists only in the
browser's React state for the duration of the session:
- One state slot holds the current username input.
- One state slot holds the fetched result (profile + repos + stats).
- One state slot each for loading and error conditions.

Refreshing the page clears everything, which is expected and acceptable for
this project's scope. The only lasting artifact a user can keep is the
downloaded card image, generated entirely client-side.

---

## 9. Caching Strategy (No Database)

A simple in-memory cache lives inside the server process, keyed by GitHub
username, with a time-based expiry (e.g. 30 minutes). Its only purpose is to
avoid re-fetching the same username's data repeatedly within a short window,
which protects the shared API token's hourly rate limit. This cache is
intentionally not persistent — it resets whenever the server restarts, which is
an acceptable tradeoff for a project of this scale.

---

## 10. Rate Limits & Operational Notes

- REST and GraphQL requests share the same hourly quota tied to the token
  (5,000 requests/hour with a token, versus 60/hour without one).
- Each card generation consumes a small, fixed number of requests (profile +
  repos + one GraphQL contributions call).
- Accounts with no public repositories or minimal public activity should be
  handled gracefully — the UI should communicate "not enough public data" rather
  than failing silently or crashing.
- Because a single shared token serves all visitors, the whole app operates
  under one collective rate-limit budget rather than a per-visitor one.

---

## 11. Full Project Boilerplate (Folder & File Scaffold)

This is the complete starting structure for the project — every file and folder
you'd create before writing any real logic, along with what each one is
responsible for.

```
github-fifa-card/
├── app/
│   ├── layout.tsx                  → Root layout, global styles, fonts
│   ├── page.tsx                    → Main page: form + card + session state
│   ├── globals.css                 → Tailwind base styles
│   └── api/
│       └── github/
│           └── [username]/
│               └── route.ts        → Single backend endpoint (cache → GitHub → stats → response)
│
├── components/
│   ├── UsernameForm.tsx             → Input field + submit button
│   ├── FifaCard.tsx                 → Card layout: avatar, name, stat bars, rating
│   ├── StatBar.tsx                   → Reusable single-attribute bar/number display
│   ├── LoadingState.tsx              → Loading indicator shown while fetching
│   └── ErrorState.tsx                → Friendly error message component
│
├── lib/
│   ├── github.ts                     → All GitHub REST + GraphQL calls
│   ├── stats.ts                       → Raw data → FIFA rating conversion logic
│   └── cache.ts                       → In-memory cache (key–value + TTL)
│
├── types/
│   └── github.ts                      → TypeScript interfaces for profile, repo, contribution, and stats shapes
│
├── public/
│   └── card-frame.png (optional)      → Any static background/frame assets for the card design
│
├── .env.local                          → GITHUB_TOKEN (never committed)
├── .env.example                        → Placeholder showing required env vars, safe to commit
├── .gitignore                          → Excludes node_modules, .env.local, .next
├── next.config.js                      → Next.js config (default is fine to start)
├── tailwind.config.ts                  → Tailwind theme/content paths
├── postcss.config.js                   → Required alongside Tailwind
├── tsconfig.json                       → TypeScript compiler settings
├── package.json                        → Dependencies + scripts
└── README.md                           → Project description, setup steps, env var instructions
```

### Key Dependencies to Install
- `next`, `react`, `react-dom` — core framework (comes with project init)
- `typescript`, `@types/react`, `@types/node` — TypeScript support
- `tailwindcss`, `postcss`, `autoprefixer` — styling
- `html-to-image` — exporting the rendered card component as a downloadable PNG

### package.json Scripts (Conceptual)
- `dev` → runs the local development server
- `build` → produces the production build
- `start` → runs the production build
- `lint` → runs linting checks

### Environment Files
- `.env.local` holds the real `GITHUB_TOKEN` value and is excluded from version
  control.
- `.env.example` documents which environment variables are required (just the
  variable name, no real value) so the project is easy to set up on another
  machine.

### Notes on This Structure
- Everything under `lib/` is plain logic with no UI — this is what makes the
  GitHub integration, stats conversion, and caching independently testable.
- `components/` stays presentation-focused; it receives data as props and holds
  no fetching logic itself.
- `types/` centralizes the shape of GitHub's API responses so both the API
  route and the UI components agree on the same data contracts.
- No `models/`, `db/`, or `prisma/` folder — consistent with the no-database,
  session-only requirement.

---

## 12. Suggested Build Order

1. Establish the Next.js project, styling setup, and environment variable for
   the GitHub token.
2. Build and verify the GitHub integration layer independently (confirm both
   REST and GraphQL calls return expected data for a known username).
3. Build the API endpoint that ties the integration layer together and returns
   one combined response.
4. Build the stats/scoring layer and tune it against a handful of real,
   varied GitHub accounts.
5. Build the UI: input form, loading/error states, and the card display
   component.
6. Wire the frontend state to the API endpoint.
7. Add the card-to-image export/download capability.
8. Add the in-memory cache layer.
9. Refine the visual design of the card itself.

Renumbered note: the build order above corresponds to the scaffold in Section 11
— each numbered step maps to filling in one or more of those files with real logic.
