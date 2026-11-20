# KevAI

React + TypeScript + Vite application with Supabase authentication.

## Build and open

Node 22.12+ (or a supported newer Node version) is needed for development/building:

```sh
npm ci
npm run dev # development server with React Fast Refresh
# Stop the dev server with Ctrl+C before running the following commands.
npm test
npm run build
```

Open `dist/index.html` directly or make a desktop shortcut to it. All JavaScript is bundled inline: no module loader, local web server, or npm process is required to open the page. Run the build again after source changes. The page includes email/password login and a protected welcome screen.

## Clients

Import from `src/api/index.tsx`.

```ts
import { createSupabaseClient, createChatGPTClient, createNbaClient, responseText, resultRows } from './api';
const getAccessToken = async () => undefined; // Replace with your session provider.
const db = createSupabaseClient({
  url: 'https://YOUR_PROJECT.supabase.co',
  publishableKey: 'sb_publishable_REPLACE_ME', getAccessToken,
});
// Example only: these tables/functions are not created by this repository.
const players = await db.select<{ id: number; name: string }>('players', { select: 'id,name', limit: 20 });
await db.rpc('get_player_stats', { player_id: 123 });
// Also available: insert, update, remove, invoke (Edge Functions).
// Filters use PostgREST syntax: { id: 'eq.123' }. Update/remove require a filter.

const chat = createChatGPTClient({ endpoint: 'https://YOUR_GATEWAY/chat', getAccessToken });
const answer = await chat.respond({ model: 'YOUR_MODEL', input: 'Explain this player’s stats.' });
console.log(responseText(answer));

const nba = createNbaClient({ gatewayUrl: 'https://YOUR_GATEWAY/nba/stats', getAccessToken });
const data = await nba.stats('commonplayerinfo', { PlayerID: 2544 });
console.log(data.resultSets.map(resultRows));
```

Every client accepts an optional fetch implementation for tests. Each call accepts AbortSignal; shared requests provide query encoding, JSON bodies, timeouts, HTTP error details (`ApiError.status` / `.data`), empty-response handling, and cancellation. No automatic retries: a paid call or write will not be duplicated silently. Generic TypeScript response types are caller assertions, not runtime schema validation.

## Configuration and backend contracts

API gateway configuration is passed explicitly to the factories. The app configures Supabase Auth from `src/config.tsx` and checks authentication on startup. Never put an OpenAI key, NBA provider secret, or Supabase secret/service-role key in browser code, HTML, localStorage, or git. Supabase publishable keys are intended for browser use; restrict exposed tables/functions using appropriate grants and RLS. The React app uses the Auth service for session acquisition/refresh; standalone clients accept a fresh JWT through getAccessToken.

The OpenAI gateway is **not deployed or implemented yet**. It must authenticate the caller, validate/allowlist model and input limits, enforce usage limits, attach its server-held OpenAI key, call `POST https://api.openai.com/v1/responses`, and return the non-streaming JSON response with the original status. The frontend sends `store: false` and `stream: false`; text extraction supports Responses API message output. No ChatGPT subscription login is assumed.

NBA provider selection is pending. This adapter expects GET `{gatewayUrl}/{endpoint}?parameters`, JSON responses, and NBA Stats `resultSets` for resultRows. A future gateway must allowlist endpoints and parameters, handle upstream headers/rate limits, and keep provider credentials server-side. `nba_api` is a Python package and is not bundled here. Other NBA providers may need a different response adapter. No claims are made that NBA.com supports direct browser calls.

For a double-clicked file, all remote services must permit the local-file browser origin through CORS, including preflight requests and Authorization/apikey headers. Opening the page works offline; live API calls still require internet, configuration and reachable gateways. If your gateway rejects local-file origins, serve the same dist folder over HTTP(S). Do not disable browser security. The backend may run remotely (for example on a Pi or an authenticated hosted function); the frontend remains static.

## Verification

`npm test` runs strict TypeScript checking plus mocked request/adapter tests; `npm run build` builds the standalone HTML. No live services, secrets, paid requests, or database changes are used in these checks.

## References

- https://supabase.com/docs/guides/api/creating-routes
- https://supabase.com/docs/guides/getting-started/api-keys
- https://developers.openai.com/api/reference/resources/responses/methods/create
- https://developers.openai.com/api/reference/overview
- https://github.com/swar/nba_api

## Login

The public configuration in `src/config.tsx` points to the KevAI Supabase project. Sign in with an existing, confirmed Supabase Auth email/password account. This is account authentication, not an email-existence lookup. Select **Create account** to register with an email and matching passwords (at least eight characters; Supabase may enforce stronger requirements). When email confirmation is enabled, confirm using the emailed link, then return to this app and sign in. No session is granted until Supabase verifies it. Existing-account responses deliberately avoid confirming whether an address is registered. Password reset is not part of this screen.

The official SDK handles password sign-in and token refresh. `getUser()` checks the account with the Auth server before protected content renders, and the app revalidates on returning to the tab and token refresh. Sessions are held only in memory, so reload/close requires login again; passwords are cleared after each attempt and never saved by the app. Sign-out uses local session scope. Database helpers use the current session token. Client UI gates are not a security boundary: every data table still needs proper RLS, and future AI/NBA gateways must validate tokens server-side. No tables, grants, auth settings, or existing accounts have been changed.

Auth references: https://supabase.com/docs/reference/javascript/auth-signinwithpassword and https://supabase.com/docs/reference/javascript/auth-getuser

Email links use the project’s configured Supabase Auth Site URL. For a hosted deployment, set that URL to your hosted application; for a locally opened file, return to the file manually after confirmation (the default redirect may point to localhost). Registration must be enabled in Supabase Auth. This change preserves project authentication settings and does not create any accounts or send test emails.

## React project structure

- `index.html` → `src/main.tsx` → `src/App.tsx`: the familiar React entry point.
- `src/pages/AuthPage.tsx`: login/create-account forms.
- `src/pages/DashboardPage.tsx`: verified-user welcome screen.
- `src/components/`: reusable brand, layout, and password input components.
- `src/hooks/useAuth.tsx`: authentication state, session checks, and event cleanup.
- `src/services/auth.tsx`: Supabase authentication functions.
- `src/services/database.tsx`: database client wired to the current user token.
- `src/api/`: shared HTTP, Supabase REST, ChatGPT gateway, and NBA gateway clients.
- `src/styles.css`: presentation styles.
- `src/config.tsx`: public Supabase project configuration.
- `vite.config.tsx`: React development and single-file production build configuration.

Use `npm run dev` while editing. `npm run build` uses Vite with `vite-plugin-singlefile` to inline the production JavaScript and CSS into `dist/index.html`, preserving double-click use without a running npm process. Opening the source `index.html` directly is not supported; use the development server or the built file. Remote API CORS requirements still apply.

## Upcoming NBA games

The dashboard fetches real upcoming matchups for the next seven days, grouped by the viewer’s local calendar date. Cards show home/away teams, local tip-off, and venue. No API key is required. `src/services/games.tsx` first reads NBA.com’s public season schedule, then falls back to ESPN’s public NBA daily scoreboards when NBA.com is blocked or stale. The displayed source identifies the feed in use. Completed, live, cancelled and postponed games are omitted. Responses are cached in memory for five minutes; Refresh games reuses fresh cached data. Loading, empty, error and retry states are included.

These public feeds are not guaranteed APIs and can change or block requests; errors are shown rather than substituting invented games. Both feeds must permit browser CORS for direct local-file use. ESPN’s live JSON schema and daily schedule requests were checked during development; NBA.com returned HTTP 403 in the development environment. No live database changes are required.

## Game details and information cards

Select a game card to open its details view, then use All games to return. `GameDetailsPage.tsx` shows the selected game’s real schedule data. `InformationCard.tsx` supports React content, image galleries, scrollable tables, and optional numeric line graphs (including a readable data list). No player statistics or graphs are invented; the statistics card stays empty until those APIs are connected.

`ChatPanel.tsx` fills the right side on desktop, closes/reopens without losing drafts, and uses a full-screen panel on mobile. Mobile starts with chat closed so the game is visible. Messages remain only in that view: no OpenAI requests or persisted chats are implemented yet.
