# Nipuna WhatsApp AI Bot

A modular WhatsApp chatbot built with Node.js, Express, the official Meta WhatsApp Cloud API, and optional OpenAI-compatible AI. It uses a webhook instead of automating WhatsApp Web.

## Features

- Official WhatsApp Cloud API integration
- Webhook verification and request-signature validation
- AI text conversations using an OpenAI-compatible Chat Completions API
- Image understanding when a vision-capable model is configured
- Sinhala and English responses
- Commands: !help, !ping, !about, !time, !echo
- Duplicate-message protection and per-user rate limiting
- Health endpoint and graceful shutdown
- Secrets supplied through environment variables

## Requirements

- Node.js 20+
- A Meta developer app with WhatsApp product configured
- A WhatsApp Business phone number ID and access token
- A public HTTPS deployment URL for the webhook
- Optional: an OpenAI API key or compatible provider

## Run locally

1. Copy .env.example to .env and fill in the values.
2. Install dependencies with npm install.
3. Start with npm start.
4. Expose the local server through a trusted HTTPS tunnel for Meta webhook testing.
5. Set the Meta webhook callback URL to https://YOUR_DOMAIN/webhook and use the same WHATSAPP_VERIFY_TOKEN value.
6. Subscribe the WhatsApp Business Account webhook to the messages field.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| WHATSAPP_TOKEN | Yes | Meta WhatsApp Cloud API access token |
| WHATSAPP_PHONE_NUMBER_ID | Yes | WhatsApp phone number ID from Meta |
| WHATSAPP_VERIFY_TOKEN | Yes | Private string chosen by you for webhook verification |
| META_APP_SECRET | Production | Meta app secret used to validate webhook signatures |
| OPENAI_API_KEY | Optional | Enables AI chat and image understanding |
| OPENAI_MODEL | Optional | Defaults to gpt-4o-mini; choose a vision-capable model for images |
| OPENAI_BASE_URL | Optional | Defaults to https://api.openai.com/v1 |
| WHATSAPP_GRAPH_VERSION | Optional | Graph API version; defaults to v23.0 |
| PORT | Optional | Defaults to 3000 |
| USER_MESSAGES_PER_MINUTE | Optional | Defaults to 12 |

Never commit real tokens, API keys, app secrets, or customer data. Rotate any credential that has been exposed.

## Endpoints

- GET / - service status
- GET /health - JSON health check
- GET /webhook - Meta webhook verification
- POST /webhook - incoming WhatsApp webhook events

## Deploy

Set environment variables in your hosting provider and deploy the repository. The included Procfile starts the service with node bot.js. Configure the deployed HTTPS URL in the Meta developer dashboard.

## Notes

- This project does not scan a QR code or automate a personal WhatsApp Web session. It uses Meta's official business messaging API.
- Meta messaging rules, templates, opt-in requirements, conversation windows, and applicable charges still apply.
- Rate-limit and duplicate caches are in-memory. Use Redis or a database for multi-instance production deployments.
- Image processing temporarily downloads incoming images in memory and sends them to the configured AI provider. Enable this only if your privacy notice and provider settings permit it.
- Documents, audio, video, interactive flows, and persistent chat history are not implemented yet.
