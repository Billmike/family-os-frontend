# FamilyOS — Client

The web frontend for **FamilyOS**, a household management PWA that helps families coordinate tasks, events, shopping, and expenses in a shared real-time workspace.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| [React 19](https://react.dev) | UI framework |
| [React Router v7](https://reactrouter.com) | Client-side routing |
| [TypeScript 5](https://www.typescriptlang.org) | Type safety |
| [Vite 8](https://vite.dev) | Build tool & dev server |
| [Tailwind CSS v4](https://tailwindcss.com) | Utility-first styling |
| [Lucide React](https://lucide.dev) | Icon library |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app) | PWA / service worker |
| [Workbox](https://developer.chrome.com/docs/workbox) | Offline caching strategies |
| [pnpm](https://pnpm.io) | Package manager |

---

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9 — install with `npm install -g pnpm`
- A running instance of the **FamilyOS API** (see the `server/` directory in the monorepo root)

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the dev server (accessible on all network interfaces)
pnpm dev
```

The app is served at `http://localhost:5173` by default.

### Environment Variables

Create a `.env.local` file in this directory to override defaults:

```env
# Base URL of the FamilyOS API server
VITE_API_BASE_URL=http://localhost:8001
```

If `VITE_API_BASE_URL` is not set, the client defaults to `http://localhost:8001`.

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server (hot reload, exposed on `0.0.0.0`) |
| `pnpm build` | Type-check and produce a production build in `dist/` |
| `pnpm preview` | Serve the production build locally for testing |
| `pnpm format` | Format source files with [oxfmt](https://github.com/nicolo-ribaudo/oxfmt) |

---

## Project Structure

```
client/
├── public/                  # Static assets served at root
├── src/
│   ├── api/                 # API layer
│   │   ├── client.ts        # HTTP client, token management, refresh logic
│   │   ├── adapters.ts      # Maps API response shapes → UI types
│   │   ├── auth.ts          # Auth endpoints (login, register, refresh)
│   │   ├── dashboard.ts     # Dashboard summary endpoint
│   │   ├── events.ts        # Calendar events CRUD
│   │   ├── expenses.ts      # Expenses CRUD + spend summary
│   │   ├── families.ts      # Family management + invitations
│   │   ├── notifications.ts # Push notification management
│   │   ├── shopping.ts      # Shopping lists + items CRUD
│   │   ├── shoppingLocations.ts  # Store/location management
│   │   ├── shoppingSessions.ts   # Active shopping session lifecycle
│   │   ├── tasks.ts         # Tasks CRUD
│   │   ├── types.ts         # Raw API response types
│   │   └── index.ts         # Re-exports
│   ├── auth/
│   │   └── session.tsx      # SessionProvider + useSession hook
│   ├── components/          # Shared UI components
│   │   ├── ExpenseSheet.tsx     # Add/edit expense bottom sheet
│   │   ├── MonthSwitcher.tsx    # Month navigation control
│   │   ├── SpendBarChart.tsx    # Household spend bar chart
│   │   ├── TaskDateSheet.tsx    # Task due-date picker sheet
│   │   └── TaskDetailSheet.tsx  # Full task detail bottom sheet
│   ├── hooks/
│   │   └── useMonthExpenses.ts  # Data fetching hook for monthly expenses
│   ├── invite/
│   │   └── pendingInvite.ts     # Captures and stores invite tokens from URL
│   ├── lib/
│   │   ├── push/
│   │   │   └── webPush.ts       # Web Push subscription helper
│   │   ├── pwa/
│   │   │   ├── install.ts           # PWA install prompt logic
│   │   │   ├── usePwaInstall.ts     # Hook for install prompt state
│   │   │   └── InstallStepsList.tsx # Install instructions UI
│   │   └── theme/
│   │       ├── theme.ts        # Theme tokens, storage key, helpers
│   │       └── ThemeProvider.tsx   # Light/dark/system theme context
│   ├── realtime/
│   │   └── useFamilyRealtime.ts  # WebSocket hook — live family data sync
│   ├── screens/             # Top-level screen components (one per route)
│   │   ├── Calendar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ExpenseActivity.tsx
│   │   ├── Expenses.tsx
│   │   ├── Family.tsx
│   │   ├── Notifications.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Settings.tsx
│   │   ├── Shopping.tsx
│   │   └── Tasks.tsx
│   ├── App.tsx              # Root component, session gating, global state
│   ├── data.ts              # Static helpers (formatDate, getMember, etc.)
│   ├── index.css            # Global CSS reset + design system tokens
│   ├── main.tsx             # React entry point
│   ├── routing.ts           # Screen ↔ path mapping, legacy redirect helpers
│   ├── sw.ts                # Service worker (Workbox precache + routing)
│   ├── types.ts             # Shared UI-layer TypeScript types
│   ├── ui.tsx               # Primitive design-system components
│   └── vite-env.d.ts        # Vite env type declarations
├── index.html               # HTML entry point
├── vercel.json              # Vercel deployment config (SPA rewrites)
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

---

## Architecture

### Authentication

Session state is managed by `SessionProvider` (`src/auth/session.tsx`). It handles:

- **Register / Login** — stores JWT access & refresh tokens in `localStorage`
- **Token refresh** — the `apiRequest` helper in `src/api/client.ts` automatically refreshes the access token when it expires (single-flight, de-duplicated)
- **Family selection** — after login the session tracks which family is active via `familyos_family_id` in `localStorage`
- **Unauthenticated redirect** — `AppRoot` in `App.tsx` gates the main app behind session state and redirects to `/login` when needed

### Routing

Routes are defined declaratively in `src/routing.ts` as a bidirectional `Screen ↔ path` map. React Router v7 handles browser history; the app uses `useNavigate` and `useLocation` internally. Unknown paths fall back to `/` (dashboard).

| Path | Screen |
|---|---|
| `/` | Dashboard |
| `/calendar` | Calendar |
| `/tasks` | Tasks |
| `/shopping` | Shopping |
| `/expenses` | Expenses |
| `/expenses/activity` | Expense Activity |
| `/notifications` | Notifications |
| `/family` | Your Family |
| `/settings` | Settings |
| `/login` | Onboarding / Login |
| `/invite/:token` | Auto-join via invite link |

### Real-time Sync

`useFamilyRealtime` (`src/realtime/useFamilyRealtime.ts`) opens an authenticated WebSocket connection to the API. It:

- Sends a heartbeat ping every **30 seconds** to keep the connection alive
- Reconnects automatically with **exponential back-off** (1 s → 30 s max)
- Applies real-time patches for tasks, events, shopping items, sessions, and notifications directly to React state — no full page reload needed

### API Layer

All API calls go through `apiRequest` (`src/api/client.ts`), which:

1. Attaches the `Authorization: Bearer <token>` header
2. Serialises the request body as JSON
3. On a `401` response, performs a single-flight token refresh and retries once
4. Throws a typed `ApiError` on failure, which carries `status`, `code`, and `body`

Data returned from the API is converted to UI-friendly types by the adapter functions in `src/api/adapters.ts` (e.g. `toTask`, `toCalendarEvent`, `toExpense`).

### Design System

UI primitives (`BottomSheet`, `Input`, `Select`, `PrimaryButton`, `Toast`, etc.) live in `src/ui.tsx`. Design tokens (colours, spacing, typography, shadows) are defined as CSS custom properties in `src/index.css` and consumed through the `t` token object exported from `src/ui.tsx`.

Light and dark themes are toggled via `ThemeProvider` (`src/lib/theme/`) with a `system` fallback that follows the OS preference. The user's choice is persisted in `localStorage` under the key `familyos_theme`.

### PWA

The app is a fully installable Progressive Web App powered by `vite-plugin-pwa` and Workbox. The service worker (`src/sw.ts`) pre-caches all build assets and enables offline use. Web Push subscriptions are managed in `src/lib/push/webPush.ts`; incoming push events are forwarded to the app via a `ServiceWorker → page` `postMessage` to refresh the notification list without a reload.

---

## Deployment

The `vercel.json` at the root of this directory configures Vercel to rewrite all requests to `index.html`, enabling client-side routing on a static host.

```bash
pnpm build        # outputs to dist/
# deploy dist/ to any static host (Vercel, Netlify, Cloudflare Pages, etc.)
```

Set the `VITE_API_BASE_URL` environment variable in your hosting dashboard to point at your production API.

---

## Key Conventions

- **No semicolons** — the codebase follows a no-semicolon TypeScript style
- **`const` over `function`** — arrow functions are preferred for component logic
- **`handle` prefix** — event handlers are named `handleClick`, `handleKeyDown`, etc.
- **Early returns** — error / guard conditions are handled at the top of functions
- **Tailwind for styles** — inline `style` props are used only where dynamic values require it; utility classes handle everything else
- **Accessibility** — interactive elements include `aria-label`, `tabIndex`, and keyboard event handlers where appropriate
