process.umask(0o077);
const express = require('express');
const path = require('node:path');
const config = require('./src/config');
const { WhatsAppWebBot } = require('./src/whatsapp-web');
const { getAIReply } = require('./src/ai');
const { createSessionToken, isValidSession, safeEqual } = require('./src/dashboard-auth');

const app = express();
const clients = new Set();
const loginAttempts = new Map();
let bot;
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

function publish(event, data) {
  const message = 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n';
  for (const client of clients) client.write(message);
}
bot = new WhatsAppWebBot({
  sessionDir: config.sessionDir,
  onMessage: async ({ jid, text }) => {
    try { await bot.sendText(jid, await getAIReply(jid, text)); }
    catch (error) {
      console.error('AI reply failed:', error.message);
      await bot.sendText(jid, 'I hit a temporary AI service problem. Please try again later.').catch(() => {});
    }
  }
});
bot.on('status', status => publish('status', status));
bot.on('qr', dataUrl => publish('qr', { dataUrl }));
bot.on('message', info => publish('activity', info));

function requireDashboard(req, res, next) {
  if (!isValidSession(req.headers.cookie || '', config.sessionSecret)) return res.status(401).json({ error: 'Please sign in again.' });
  next();
}
app.get('/health', (req, res) => res.json({ ok: true, service: 'nipuna-whatsapp-ai-bot', state: bot.status.state }));
app.post('/api/login', (req, res) => {
  if (!config.dashboardPassword || !config.sessionSecret) return res.status(503).json({ error: 'Set dashboard credentials on the server first.' });
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(time => now - time < 15 * 60 * 1000);
  if (attempts.length >= 5) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!safeEqual(password, config.dashboardPassword)) {
    attempts.push(now); loginAttempts.set(ip, attempts);
    return res.status(401).json({ error: 'Incorrect dashboard password.' });
  }
  loginAttempts.delete(ip);
  res.cookie('np_dashboard', createSessionToken(config.sessionSecret), {
    httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'strict', path: '/', maxAge: 12 * 60 * 60 * 1000
  });
  res.json({ ok: true });
});
app.post('/api/logout', requireDashboard, (req, res) => {
  res.clearCookie('np_dashboard', { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'strict', path: '/' });
  res.json({ ok: true });
});
app.get('/api/me', requireDashboard, (req, res) => res.json({ authenticated: true }));
app.get('/api/status', requireDashboard, (req, res) => res.json({
  ...bot.status, aiConfigured: Boolean(config.openaiApiKey), webSearchConfigured: Boolean(config.tavilyApiKey)
}));
app.get('/api/events', requireDashboard, (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders?.();
  clients.add(res);
  res.write('event: status\ndata: ' + JSON.stringify({
    ...bot.status, aiConfigured: Boolean(config.openaiApiKey), webSearchConfigured: Boolean(config.tavilyApiKey)
  }) + '\n\n');
  if (bot.qrDataUrl) res.write('event: qr\\ndata: ' + JSON.stringify({ dataUrl: bot.qrDataUrl }) + '\\n\\n');
  req.on('close', () => clients.delete(res));
});
app.post('/api/connect', requireDashboard, async (req, res) => {
  try { await bot.connect(); res.json({ ok: true }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/disconnect', requireDashboard, async (req, res) => {
  try { await bot.disconnect(); res.json({ ok: true }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const server = app.listen(config.port, () => {
  console.log('Nipuna WhatsApp dashboard listening on port ' + config.port);
  if (!config.dashboardPassword || !config.sessionSecret) console.warn('Set DASHBOARD_PASSWORD and DASHBOARD_SESSION_SECRET before login.');
  if (!config.openaiApiKey) console.warn('AI is disabled: OPENAI_API_KEY is missing.');
  if (!config.tavilyApiKey) console.warn('Web search is disabled: TAVILY_API_KEY is missing.');
});
async function shutdown(signal) {
  console.log(signal + ' received; shutting down.');
  await bot.stop().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
