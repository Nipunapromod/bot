# Nipuna WhatsApp AI

A WhatsApp AI assistant and private admin dashboard built with Node.js, Express, and the official Meta WhatsApp Business Cloud API.

## Included

- Official Meta WhatsApp Cloud API webhook and outbound messaging
- Private dashboard with signed, HTTP-only admin sessions
- Natural-language Sinhala and English AI conversations
- Optional Tavily web search for latest/current/news/lookup questions
- Image understanding through a vision-capable OpenAI-compatible model
- Duplicate-message protection, per-sender rate limits and health endpoint
- Vercel serverless entry point and Git-based deployment support

## Deploy to Vercel

1. Import this GitHub repository into Vercel.
2. Add the environment variables listed in `.env.example` under Project Settings → Environment Variables.
3. Set `DASHBOARD_PASSWORD` and a long random `DASHBOARD_SESSION_SECRET` before opening the dashboard.
4. Deploy the project. The dashboard is served at the project root.
5. Set the Meta webhook callback URL to `https://YOUR-VERCEL-DOMAIN/api/webhook`.
6. Use the same `WHATSAPP_VERIFY_TOKEN` value in Meta webhook verification and subscribe the WhatsApp Business Account to the `messages` field.

## Required Meta variables

- `WHATSAPP_TOKEN`: Meta Cloud API access token
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp phone number ID
- `WHATSAPP_VERIFY_TOKEN`: private webhook verification string
- `META_APP_SECRET`: Meta app secret used to validate webhook signatures

## AI and search

- `OPENAI_API_KEY` enables natural-language AI and image understanding.
- `OPENAI_MODEL` defaults to `gpt-4o-mini`; select a vision-capable model for image messages.
- `TAVILY_API_KEY` enables live web search when a message asks for current, latest, news or lookup information.

The app does not invent search citations; it passes returned source URLs to the AI model for inclusion in its answer.

## Dashboard security

The dashboard uses `DASHBOARD_PASSWORD` and `DASHBOARD_SESSION_SECRET`. The login cookie is HTTP-only, Secure, SameSite=Strict and expires after 12 hours. Keep all keys in Vercel server-side environment variables. Never add them to frontend code or commit them to GitHub.

## Supabase

Supabase credentials are reserved for persistent conversation history and dashboard analytics. Connect a dedicated Supabase project before enabling those features. Do not reuse a database that contains unrelated personal or application data.

## Local development

- Node.js 20+
- Copy `.env.example` to `.env`, fill in values, then run `npm install` and `npm start`.
- Local webhook path: `/webhook`; deployed path: `/api/webhook`.

## Important

This uses the official WhatsApp Business Cloud API, not QR pairing or WhatsApp Web automation. Meta opt-in, approved templates, messaging windows, business verification and applicable charges still apply. In-memory deduplication and rate limiting are best-effort on serverless instances; persistent production coordination should be moved to a shared store.
