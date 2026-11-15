# KevAI

Lightweight TypeScript API foundation, with Supabase Auth and a bundled browser SDK.

## Build and open

Node 22+ is needed only for development/building:

```sh
npm ci
npm test
npm run build
```

Open `dist/index.html` directly or make a desktop shortcut to it. All JavaScript is bundled inline: no module loader, local web server, or npm process is required to open the page. Run the build again after source changes. The page includes email/password login and a protected welcome screen.

## Clients

Import from `src/api/index.ts`.

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

Configuration is passed explicitly to the factories; there are no hidden environment variables. Nothing is configured or called automatically. Never put an OpenAI key, NBA provider secret, or Supabase secret/service-role key in browser code, HTML, localStorage, or git. Supabase publishable keys are intended for browser use; restrict exposed tables/functions using appropriate grants and RLS. Session acquisition/refresh is deliberately external: pass a fresh JWT through getAccessToken.

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

The public configuration in `src/config.ts` points to the KevAI Supabase project. Sign in with an existing, confirmed Supabase Auth email/password account. This is account authentication, not an email-existence lookup. Add users in Supabase Dashboard → Authentication → Users → Add user; no users or passwords are seeded by this repository. Public registration/password reset are not part of this screen.

The official SDK handles password sign-in and token refresh. `getUser()` checks the account with the Auth server before protected content renders, and the app revalidates on returning to the tab and token refresh. Sessions are held only in memory, so reload/close requires login again; passwords are cleared after each attempt and never saved by the app. Sign-out uses local session scope. Database helpers use the current session token. Client UI gates are not a security boundary: every data table still needs proper RLS, and future AI/NBA gateways must validate tokens server-side. No tables, grants, auth settings, or existing accounts have been changed.

Auth references: https://supabase.com/docs/reference/javascript/auth-signinwithpassword and https://supabase.com/docs/reference/javascript/auth-getuser
