# Nipuna WhatsApp AI Bot

A WhatsApp Web companion bot with a password-protected browser dashboard, QR pairing, natural-language AI replies, and optional web search.

## Important

This project uses an unofficial WhatsApp Web integration through Baileys. It is not the official WhatsApp Business Cloud API and is not affiliated with WhatsApp. Use only with an account you own or are authorized to manage. Automated or bulk messaging can violate platform rules and may lead to account restrictions. Do not use this project for spam.

## Features

- Browser dashboard with password login
- QR code pairing and live connection status
- Local WhatsApp session persistence
- Natural-language replies in Sinhala and English
- Optional AI web search using Tavily
- Direct-message handling only; group messages are ignored
- Basic rate limiting and health endpoint

## Requirements

- Node.js 20+
- A persistent Node.js host with a persistent disk or volume
- An OpenAI-compatible API key for AI replies
- Optional Tavily API key for web search

## Local setup

1. Copy .env.example to .env and fill in the values.
2. Install dependencies with npm install.
3. Start with npm start.
4. Open http://localhost:3000.
5. Sign in with your dashboard password and press Connect WhatsApp.
6. On your phone, open WhatsApp > Linked devices > Link a device, then scan the QR code.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| DASHBOARD_PASSWORD | Yes | Strong password for dashboard access |
| DASHBOARD_SESSION_SECRET | Yes | Random secret used to sign dashboard sessions |
| OPENAI_API_KEY | For AI | API key for the AI provider |
| OPENAI_MODEL | Optional | Defaults to gpt-4o-mini |
| OPENAI_BASE_URL | Optional | Defaults to OpenAI API |
| TAVILY_API_KEY | Optional | Enables web search |
| WHATSAPP_SESSION_DIR | Recommended | Persistent folder for WhatsApp authentication |
| PORT | Optional | Defaults to 3000 |
| MAX_MESSAGES_PER_MINUTE | Optional | Defaults to 10 |

Never commit .env, dashboard passwords, API keys, or WhatsApp session files. Anyone with access to the session directory may be able to control the linked WhatsApp account.

## Deployment

The dashboard and WhatsApp worker run in the same Node.js process in this version. Deploy to a host that keeps the process running and provides persistent disk storage. If the process stops or local files are discarded, the bot disconnects or loses its session. Vercel can host a separate static dashboard later, but the WhatsApp worker still needs a persistent host.

## Endpoints

- / - dashboard
- /health - service health
- /api/login - dashboard login
- /api/status - connection status (authenticated)
- /api/events - live dashboard updates (authenticated)
- /api/connect - start QR pairing (authenticated)
- /api/disconnect - log out and remove the linked session (authenticated)

## Privacy

Incoming messages are processed by the configured AI provider. If web search is enabled, search queries are sent to Tavily. WhatsApp session credentials are stored on the host's persistent disk. Do not connect an account or send private content unless you understand these data flows.
