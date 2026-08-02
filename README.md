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
│   ├── components/        # Reusable UI components
│   │   ├── layout/
│   │   ├── todos/
│   │   └── ui/
│   ├── db/
│   │   ├── schema/          # Drizzle schemas by domain
│   │   │   ├── index.ts
│   │   │   ├── todos.ts
│   │   │   └── users.ts
│   │   └── index.ts         # DB connection
│   ├── server/              # Server-only utilities
│   ├── trpc/
│   │   ├── init.ts          # tRPC initialization
│   │   ├── context.ts
│   │   ├── client.ts
│   │   ├── router.ts        # Root router
│   │   └── routers/         # Feature routers
│   │       ├── todo.ts
│   │       ├── category.ts
│   │       └── subtask.ts
│   └── utils/
│       └── date.ts
├── routes/
│   ├── api/trpc/            # tRPC endpoint
│   ├── dashboard/
│   ├── +page.svelte
│   └── +layout.svelte
└── app.html
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
- [x] Schema split by domain (`users.ts`, `todos.ts`)
- [x] API route at `/api/trpc/[...trpc]`
- [x] Client-side tRPC hook
- [x] Router split by feature (`todo.ts`, `category.ts`, `subtask.ts`)

### ✅ Phase 6: To-Do List (Expanded)
- [x] Create / toggle / delete tasks
- [x] **Subtasks** with progress bar and individual checkboxes
- [x] **Due dates** with split date/time inputs
- [x] **Urgency scoring**: Critical → High → Urgent → Soon → Normal → Low
- [x] **Priority mode** vs **Schedule mode** (mutually exclusive)
- [x] **Categories** with autofill input (creates new if not exists)
- [x] **Location** field
- [x] **Active grouping** toggle: None / Category / Location
- [x] **History** tab with server-side pagination
- [x] **History search** by title
- [x] **Confirmation modal** before marking done
- [x] Date metadata: Due, Created, Completed

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
- **Neutral palette.** `zinc` grays to match Clerk's dark theme.
- **Accent:** `indigo-500` for CTAs. Urgency colors: red → purple → orange → amber → sky → zinc.
- **Layout:** Bento-box grid. Cards with rounded corners, subtle borders, soft shadows.
- **Code organization:** Components, tRPC routers, and DB schemas all split by feature/domain.

---

## License

Personal use only. This is a single-user self-hosted dashboard.
