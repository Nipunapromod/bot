const express = require('express');
const crypto = require('node:crypto');
const config = require('./src/config');
const { sendText, markAsRead, downloadMedia } = require('./src/whatsapp');
const { getAIReply } = require('./src/ai');
const { runCommand } = require('./src/commands');

const app = express();
const seenMessages = new Map();
const userWindows = new Map();
app.disable('x-powered-by');
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); }
}));

function verifySignature(req) {
  if (!config.appSecret) return config.allowUnsignedWebhook && config.nodeEnv !== 'production';
  const signature = req.get('x-hub-signature-256') || '';
  if (!signature.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', config.appSecret).update(req.rawBody || Buffer.alloc(0)).digest();
  const received = Buffer.from(signature.slice(7), 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}
function allowedByRateLimit(sender) {
  const now = Date.now();
  const recent = (userWindows.get(sender) || []).filter(time => now - time < 60_000);
  if (recent.length >= config.userMessagesPerMinute) {
    userWindows.set(sender, recent);
    return false;
  }
  recent.push(now);
  userWindows.set(sender, recent);
  return true;
}
function rememberMessage(id) {
  if (seenMessages.has(id)) return false;
  seenMessages.set(id, Date.now());
  if (seenMessages.size > 5000) {
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    for (const [key, time] of seenMessages) if (time < cutoff) seenMessages.delete(key);
    while (seenMessages.size > 4000) seenMessages.delete(seenMessages.keys().next().value);
  }
  return true;
}
function extractText(message) {
  if (message.type === 'text') return message.text?.body?.trim() || '';
  if (message.type === 'button') return message.button?.text?.trim() || '';
  if (message.type === 'interactive') return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
  return '';
}
async function handleMessage(message) {
  if (!message?.id || !message.from || !rememberMessage(message.id)) return;
  const sender = message.from;
  if (!allowedByRateLimit(sender)) {
    await sendText(sender, 'You are sending messages too quickly. Please wait a moment and try again.');
    return;
  }
  await markAsRead(message.id).catch(() => {});
  if (message.type === 'image') {
    if (!config.openaiApiKey) {
      await sendText(sender, 'I received your image. Image understanding is available when the bot owner configures the AI service.');
      return;
    }
    try {
      const media = await downloadMedia(message.image?.id);
      const answer = await getAIReply(sender, 'Please describe or analyse this image. Reply in the language most suitable for the user.', media);
      await sendText(sender, answer);
    } catch (error) {
      console.error('Image handling failed:', error.message);
      await sendText(sender, 'I could not read that image. Please try a smaller image or send it again.');
    }
    return;
  }
  const text = extractText(message);
  if (!text) {
    await sendText(sender, 'I can currently understand text and images. Send !help to see what I can do.');
    return;
  }
  if (text.startsWith('!') || text.startsWith('.')) {
    const result = await runCommand(text);
    if (result.handled) {
      await sendText(sender, result.reply);
      return;
    }
  }
  if (!config.openaiApiKey) {
    await sendText(sender, 'The AI assistant is not configured yet. The bot owner can finish setup in the dashboard.');
    return;
  }
  try {
    await sendText(sender, await getAIReply(sender, text));
  } catch (error) {
    console.error('AI reply failed:', error.message);
    await sendText(sender, 'I hit a temporary AI service problem. Please try again shortly.');
  }
}


function validDashboardSession(req) {
  if (!config.dashboardPassword || !config.dashboardSessionSecret) return false;
  const cookie = req.headers.cookie || '';
  const token = cookie.split(';').map(v => v.trim()).find(v => v.startsWith('npdash='));
  if (!token) return false;
  const value = decodeURIComponent(token.slice(7));
  const [expires, signature] = value.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = crypto.createHmac('sha256', config.dashboardSessionSecret).update(expires).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function requireDashboard(req, res, next) {
  if (validDashboardSession(req)) return next();
  return res.status(401).json({ error: 'Dashboard login required' });
}
function statusPayload() {
  return {
    service: 'Nipuna WhatsApp AI',
    runtime: 'online',
    whatsappConfigured: Boolean(config.whatsappToken && config.phoneNumberId && config.verifyToken && config.appSecret),
    aiConfigured: Boolean(config.openaiApiKey),
    webSearchConfigured: Boolean(config.tavilyApiKey),
    databaseConfigured: Boolean(config.supabaseUrl && config.supabaseServiceRoleKey),
    dashboardPasswordConfigured: Boolean(config.dashboardPassword && config.dashboardSessionSecret),
    webhookPath: '/api/webhook'
  };
}
app.get(['/health', '/api/health'], (req, res) => res.json({ ok: true, ...statusPayload() }));

app.post('/api/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (!config.dashboardPassword || !config.dashboardSessionSecret) {
    return res.status(503).json({ error: 'Set DASHBOARD_PASSWORD and DASHBOARD_SESSION_SECRET in Vercel first.' });
  }
  const a = Buffer.from(password);
  const b = Buffer.from(config.dashboardPassword);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Incorrect password' });
  const expires = String(Date.now() + 12 * 60 * 60 * 1000);
  const signature = crypto.createHmac('sha256', config.dashboardSessionSecret).update(expires).digest('hex');
  res.setHeader('Set-Cookie', 'npdash=' + encodeURIComponent(expires + '.' + signature) + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200');
  return res.json({ ok: true });
});
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'npdash=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/status', requireDashboard, (req, res) => res.json(statusPayload()));
app.get(['/webhook', '/api/webhook'], (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === config.verifyToken) return res.status(200).send(challenge);
  return res.sendStatus(403);
});
app.post(['/webhook', '/api/webhook'], (req, res) => {
  if (!verifySignature(req)) return res.sendStatus(401);
  if (req.body?.object !== 'whatsapp_business_account') return res.sendStatus(404);
  res.sendStatus(200);
  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) {
        handleMessage(message).catch(error => console.error('Message handler failed:', error.message));
      }
    }
  }
});
app.get('/', (req, res) => res.type('text').send('Nipuna WhatsApp AI Bot is running. Open the dashboard at /dashboard.'));
app.get('/dashboard', (req, res) => res.redirect('/'));

if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log('WhatsApp bot listening on port ' + config.port);
    console.log('Health check: /health | Webhook: /webhook');
  });
  function shutdown(signal) {
    console.log(signal + ' received; shutting down.');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
module.exports = app;
