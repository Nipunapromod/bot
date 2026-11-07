const path = require('node:path');

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  dashboardPassword: process.env.DASHBOARD_PASSWORD || '',
  sessionSecret: process.env.DASHBOARD_SESSION_SECRET || '',
  sessionDir: path.resolve(process.env.WHATSAPP_SESSION_DIR || './data/whatsapp-session'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  maxMessagesPerMinute: Math.max(1, Number(process.env.MAX_MESSAGES_PER_MINUTE || 10))
};
