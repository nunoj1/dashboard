# Dashboard

> Your personal, self-hosted homepage. Dark mode only. One user. No bloat.

A curated dashboard running on your VM — News, stocks, calendar, todos, health tracking, and lightweight AI insights. Built with SvelteKit, tRPC, Drizzle ORM, and SQLite.

---

## Tech Stack

| Layer     | Choice                                                                |
| --------- | --------------------------------------------------------------------- |
| Framework | [SvelteKit](https://svelte.dev)                                       |
| API       | [tRPC](https://trpc.io) + [Zod](https://zod.dev)                      |
| Database  | SQLite via [Drizzle ORM](https://orm.drizzle.team) + `@libsql/client` |
| Auth      | [Clerk](https://clerk.com) (Google OAuth)                             |
| Styling   | [Tailwind CSS](https://tailwindcss.com) v4                            |
| Icons     | [Lucide](https://lucide.dev)                                          |
| AI        | Rule-based insights (v1), optional LLM via Ollama (v2)                |

---

## Prerequisites

- Node.js 20+
- pnpm
- A [Clerk](https://clerk.com) account with Google OAuth enabled

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
Open http://localhost:5173 and sign in with Google.

# 6. Build for Production
pnpm build
node build
# Or use Docker / systemd on your VM.
```

---

## Architecture

```
src/
├── lib/
│   ├── components/        # Reusable UI components
│   │   ├── layout/
│   │   ├── todos/
│   │   ├── health/
│   │   ├── stocks/
│   │   ├── news/
│   │   └── ui/
│   ├── db/
│   │   ├── schema/          # Drizzle schemas by domain
│   │   │   ├── index.ts
│   │   │   ├── todos.ts
│   │   │   ├── stocks.ts
│   │   │   ├── health.ts
│   │   │   ├── news.ts
│   │   │   └── users.ts
│   │   └── index.ts         # DB connection
│   ├── server/              # Server-only utilities
│   ├── trpc/
│   │   ├── init.ts          # tRPC initialization
│   │   ├── context.ts
│   │   ├── client.ts
│   │   ├── router.ts        # Root router
│   │   └── routers/         # Feature routers
│   │       ├── todo/
│   │       │   ├── category.ts
│   │       │   ├── location.ts
│   │       │   └── subtask.ts
│   │       ├── stock.ts
│   │       ├── health.ts
│   │       └── news.ts
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

## Component Design System

```
All shared styles live in src/app.css as Tailwind @layer components:

| Class                                         | Use                                                       |
| --------------------------------------------- | --------------------------------------------------------- |
| `.btn-primary`                                | Main CTAs (Add Habit, Add Todo, Add Stock, Modal Confirm) |
| `.btn-nav`                                    | Pagination, arrows, Today button                          |
| `.btn-toggle-active` / `.btn-toggle-inactive` | Tab switches, view toggles, range selectors               |
| `.btn-text`                                   | Modal cancel, subtask remove, destructive actions         |
| `.input`                                      | All text inputs, selects, textareas                       |
| `.card-inner`                                 | Nested cards inside widgets (add forms, filter bars)      |
| `.separator`                                  | Section dividers                                          |
| `.label`                                      | Form labels, uppercase micro-copy                         |
| `.badge` / `.badge-muted`                     | Category/location tags                                    |
| `.link`                                       | Text links (Add subtask, etc.)                            |
```

---

## Build Checklist

### ✅ Phase 0: Bootstrap

- [x] SvelteKit + TypeScript scaffold
- [x] Tailwind CSS v4 (dark mode only)
- [x] Drizzle ORM + SQLite (@libsql/client)
- [x] Clerk auth with Google OAuth
- [x] Dark theme across all Clerk components
- [x] Landing page + protected dashboard shell
- [x] Node adapter for VM deployment

### ✅ Phase 1: tRPC + Data Layer

- [x] tRPC router with superjson transformer
- [x] SQLite database connection via Drizzle
- [x] Schema split by domain (users.ts, todos.ts, stocks.ts, health.ts)
- [x] API route at /api/trpc/[...trpc]
- [x] Client-side tRPC hook
- [x] Router split by feature (todo/, stock.ts, health.ts)

### ✅ Phase 2: To-Do List (Expanded)

- [x] Create / toggle / delete tasks
- [x] Subtasks with progress bar and individual checkboxes
- [x] Due dates with split date/time inputs
- [x] Urgency scoring: Critical → High → Urgent → Soon → Normal → Low
- [x] Priority mode vs Schedule mode (mutually exclusive)
- [x] Categories with autofill input (creates new if not exists)
- [x] Locations with autofill input (creates new if not exists)
- [x] Active grouping toggle: None / Category / Location
- [x] History tab with server-side pagination
- [x] History search by title
- [x] Confirmation modal before marking done
- [x] Subtask warning in modal when unfinished subtasks exist
- [x] Date metadata: Due, Created, Completed

### ✅ Phase 3: Stock Ticker

- [x] Yahoo Finance API integration (no key required)
- [x] Live price + change % + sparkline chart
- [x] Configurable tickers (add/remove)
- [x] Time range selector (1D / 5D / 1M / 6M / YTD / 1Y / 5Y / All)
- [x] Interactive chart hover with crosshair + price tooltip
- [x] Mini stock widget in bento layout

### ✅ Phase 4: Health Tracker

- [x] Monthly habit grid (31-day view)
- [x] Weekly habit grid (Mon–Sun, 7-day view)
- [x] Responsive: monthly on desktop, weekly on mobile
- [x] Checkboxes per day with color-coded habits
- [x] Streak counters (current + longest)
- [x] Target system: Daily / Weekly / Monthly / None
- [x] Below-target warning banner
- [x] Today button for quick navigation
- [x] Delete habit with confirmation modal

### ✅ Phase 5: News Feeds

- [x] RSS/Atom feed parsing with auto-discovery (/rss.xml, /feed, /atom.xml, etc.)
- [x] Article caching in DB (save/unsave, mark read/unread)
- [x] News card UI with images, descriptions, time-ago
- [x] Source management: add, toggle active/inactive, remove
- [x] Time range filters (1H / 1D / 1W / 1M / All)
- [x] Feed search + saved articles search
- [x] Infinite scroll with skeleton loading cards (widget-scoped)

### ⏳ Phase 6: Calendar

- [ ] Google Calendar API integration
- [ ] Upcoming events list
- [ ] Event caching

### ⏳ Phase 7: Notifications

- [ ] In-app notification center
- [ ] Auto-generated alerts

### ⏳ Phase 8: Feed Intelligence

- [ ] Click/watch tracking
- [ ] Simple relevance scoring
- [ ] "Not interested" dismissals

### ⏳ Phase 9: AI Insights

- [ ] Rule-based daily briefing
- [ ] Optional LLM via Ollama

### ⏳ Phase 10: Polish & Deploy

- [ ] Responsive layout
- [ ] Loading skeletons
- [ ] Docker / systemd on VM
- [ ] Forgejo branch + pull on VM

---

## Design Notes

- **Dark mode only.** No light mode toggle. `html` has `class="dark"` and `color-scheme: dark`.
- **Neutral palette.** `zinc` grays to match Clerk's dark theme.
- **Accent system:**
  - Primary CTA: violet (Add buttons, Confirm)
  - Navigation: purple family (arrows, pagination, Today)
  - Toggles: violet family at lower intensity (Monthly/Weekly, Active/History, range selectors)
  - Habit checkboxes: indigo/emerald/sky/amber/rose/violet per habit
  - Urgency: red → purple → orange → amber → sky → zinc

- **Layout:** Bento-box grid. Cards with rounded corners, subtle borders, soft shadows.
- **Code organization:** Components, tRPC routers, and DB schemas all split by feature/domain.
- **CSS architecture:** All recurring UI patterns abstracted into app.css component classes. No raw Tailwind duplication for buttons, inputs, badges, or separators.

---

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | Start Vite dev server                |
| `pnpm build`       | Production build                     |
| `pnpm preview`     | Preview production build             |
| `pnpm lint`        | Prettier check + ESLint              |
| `pnpm format`      | Prettier fix all files               |
| `pnpm db:generate` | Generate Drizzle migrations          |
| `pnpm db:migrate`  | Run Drizzle migrations               |
| `pnpm db:studio`   | Open Drizzle Studio GUI              |
| `pnpm check`       | Run `svelte-check` for type checking |

---
## License

Personal use only. This is a single-user self-hosted dashboard.
