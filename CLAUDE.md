# mats-soa-advice-automation

AI-powered Statement of Advice (SOA) generator for NZ insurance advisers. Takes voice notes or call transcripts + Quote Monster quote data and produces FMA-compliant SOA documents in under 60 seconds.

Client: Mat (NZ insurance adviser). Status: build phase.

## Tech Stack

- **Root scripts** — Node.js + Express (OAuth flow helpers, API test scripts)
- **app/** — Next.js 16 + React 19 + Tailwind CSS v4 + TypeScript
- **AI** — Anthropic Claude SDK (`@anthropic-ai/sdk`)
- **External APIs** — Quote Monster (QM) OAuth2, Trail CRM (planned)
- **No database configured yet** — Trail CRM will be the record store

## File Structure

```
mats-soa-advice-automation/
├── app/                        # Next.js frontend + API
│   ├── src/
│   │   └── app/
│   │       ├── api/
│   │       │   ├── auth/       # QM OAuth callback routes
│   │       │   │   ├── qm-callback/
│   │       │   │   ├── qm-oauth/
│   │       │   │   └── qm-token/
│   │       │   ├── quote/      # Quote Monster quote fetch
│   │       │   └── soa/        # SOA generation (Claude)
│   │       ├── dashboard/      # Adviser review dashboard
│   │       ├── qm-api.ts       # Quote Monster API client
│   │       ├── qm-auth.ts      # QM OAuth helpers
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── next.config.ts
│   └── package.json
├── docs/
│   ├── contract-kiwi-insurance.md   # Contract/scope doc
│   ├── example-soa.html             # Reference SOA format
│   ├── index.html                   # Pitch/proposal page
│   └── quotemonster-api-spec.yaml   # QM API spec
├── get-token.js        # OAuth token helper (root, run directly)
├── test-soa.js         # SOA generation test
├── test-quote.js       # QM quote fetch test
├── test-auth.js / test-oauth.js / test-oauth2.js
└── package.json        # Root: express, dotenv, crypto-js
```

## Key Features / Endpoints

| Route | Purpose |
|---|---|
| `GET /api/auth/qm-oauth` | Initiates Quote Monster OAuth2 flow |
| `GET /api/auth/qm-callback` | Handles QM OAuth redirect + stores token |
| `POST /api/auth/qm-token` | Refreshes QM access token |
| `POST /api/quote` | Fetches premium comparison from Quote Monster |
| `POST /api/soa` | Generates SOA document via Claude API |
| `/dashboard` | Adviser review UI — view, edit, send SOA |

## How to Run Locally

```bash
# Root test scripts (Express helpers)
cd "/Users/benji/McGen Digital/projects/clients/mats-soa-advice-automation"
npm install
node get-token.js        # Start OAuth flow
node test-soa.js         # Test SOA generation

# Next.js app
cd app
npm install
npm run dev              # http://localhost:3000
```

## How to Deploy

Not yet deployed. Intended for Railway.

```bash
cd app
railway link
railway up
```

## Environment Variables

Root `.env`:
- `QM_CLIENT_ID`
- `QM_CLIENT_SECRET`
- `QM_REDIRECT_URI`

`app/.env.local`:
- `ANTHROPIC_API_KEY`
- `QM_CLIENT_ID`
- `QM_CLIENT_SECRET`
- `QM_REDIRECT_URI`
- `QM_ACCESS_TOKEN` (stored after OAuth flow)

## Gotchas

- Quote Monster uses OAuth2 — you must complete the OAuth flow before any QM API calls work. Run `node get-token.js` first and store the resulting token.
- The `app/` directory is a separate Node project with its own `package.json` and `node_modules`. Install dependencies in both root and `app/` independently.
- `test-soa.js` at root had a hardcoded path bug (fixed 2026-04-09) — uses `path.join(__dirname)` now.
- Next.js version is 16.2.1 (newer than training data — check `app/node_modules/next/dist/docs/` before making changes).
- No Trail CRM integration built yet — that's Phase 1 of the build plan.
- FMA compliance sections must all be present in every generated SOA — see `docs/example-soa.html` for the required structure.
