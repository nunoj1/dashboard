# Dashboard

> Your personal, self-hosted homepage. Dark mode only. One user. No bloat.

A curated dashboard running on your VM — YouTube subscriptions, news, stocks, calendar, todos, health tracking, and lightweight AI insights. Built with SvelteKit, tRPC, Drizzle ORM, and SQLite.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | [SvelteKit](https://svelte.dev) |
| API | [tRPC](https://trpc.io) + [Zod](https://zod.dev) |
| Database | SQLite via [Drizzle ORM](https://orm.drizzle.team) + `@libsql/client` |
| Auth | [Clerk](https://clerk.com) (Google OAuth) |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4 |
| Icons | [Lucide](https://lucide.dev) |
| AI | Rule-based insights (v1), optional LLM via Ollama (v2) |

---

## Prerequisites

- Node.js 20+
- pnpm
- A [Clerk](https://clerk.com) account with Google OAuth enabled
- (Optional) YouTube Data API v3 key
- (Optional) NewsAPI key
- (Optional) Stock API access

---

## Setup

```bash
# 1. Clone
git clone https://github.com/nunoj1/dashboard.git
cd dashboard

# 2. Install dependencies
pnpm install

# 3. Environment variables
cp .env.example .env
# Fill in your Clerk keys:
# PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...

# 4. Database
pnpm db:generate
pnpm db:migrate

# 5. Run
pnpm dev
```

Open `http://localhost:5173` and sign in with Google.

---

## Build for Production

```bash
pnpm build
node build
```

Or use Docker / systemd on your VM.

---

## Architecture

```
src/
├── lib/
│   ├── db/              # Drizzle schema, connection, migrations
│   ├── trpc/            # tRPC router, context, client
│   └── server/          # Server-only utilities (API clients)
├── routes/
│   ├── api/trpc/        # tRPC endpoint handler
│   ├── dashboard/       # Protected dashboard page
│   ├── +page.svelte   # Landing / sign-in page
│   └── +layout.svelte # ClerkProvider wrapper
└── app.html           # Dark mode forced at HTML level
```

---

## Build Checklist

### ✅ Phase 0: Bootstrap
- [x] SvelteKit + TypeScript scaffold
- [x] Tailwind CSS v4 (dark mode only)
- [x] Drizzle ORM + SQLite (`@libsql/client`)
- [x] Clerk auth with Google OAuth
- [x] Dark theme across all Clerk components
- [x] Landing page + protected dashboard shell
- [x] Node adapter for VM deployment

### ✅ Phase 1: tRPC + Data Layer
- [x] tRPC router with superjson transformer
- [x] SQLite database connection via Drizzle
- [x] `users` table schema
- [x] API route at `/api/trpc/[...trpc]`
- [x] Client-side tRPC hook
- [x] Working test query on dashboard

### ⏳ Phase 2: YouTube Feed
- [ ] YouTube Data API integration
- [ ] Fetch subscriptions
- [ ] Cache latest videos in DB
- [ ] Video card UI
- [ ] Mark as watched

### ⏳ Phase 3: News Feeds
- [ ] NewsAPI integration (local / world / tech)
- [ ] Article caching
- [ ] News card UI
- [ ] Mark as read

### ⏳ Phase 4: Stock Ticker
- [ ] Stock price API (VWCE, S&P 500, BTC)
- [ ] Mini stock widget
- [ ] Configurable tickers

### ⏳ Phase 5: Calendar
- [ ] Google Calendar API integration
- [ ] Upcoming events list
- [ ] Event caching

### ⏳ Phase 6: To-Do List
- [ ] CRUD tRPC routes
- [ ] Todo UI with priorities
- [ ] Due dates

### ⏳ Phase 7: Health Tracker
- [ ] Monthly habit grid
- [ ] Checkboxes per day (exercise, read, meditate, etc.)
- [ ] Streak counters

### ⏳ Phase 8: Notifications
- [ ] In-app notification center
- [ ] Auto-generated alerts

### ⏳ Phase 9: Feed Intelligence
- [ ] Click/watch tracking
- [ ] Simple relevance scoring
- [ ] "Not interested" dismissals

### ⏳ Phase 10: AI Insights
- [ ] Rule-based daily briefing
- [ ] Optional LLM via Ollama

### ⏳ Phase 11: Polish & Deploy
- [ ] Responsive layout
- [ ] Loading skeletons
- [ ] Docker / systemd on VM
- [ ] Forgejo branch + pull on VM

---

## Design Notes

- **Dark mode only.** No light mode toggle. `html` has `class="dark"` and `color-scheme: dark`.
- **Neutral palette.** `zinc` grays to match Clerk's dark theme. No blue-tinted `slate`.
- **Accent:** `indigo-500` for CTAs and highlights.
- **Layout:** Bento-box grid. Cards with rounded corners, subtle borders, soft shadows.

---

## License

Personal use only. This is a single-user self-hosted dashboard.
