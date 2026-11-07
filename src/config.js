const required = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) console.warn('Missing WhatsApp configuration: ' + missing.join(', ') + '. Add these as environment variables before connecting Meta.');

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  whatsappToken: process.env.WHATSAPP_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  appSecret: process.env.META_APP_SECRET || '',
  allowUnsignedWebhook: process.env.ALLOW_UNSIGNED_WEBHOOK === 'true',
  graphVersion: process.env.WHATSAPP_GRAPH_VERSION || 'v23.0',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\\/$/, ''),
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  dashboardPassword: process.env.DASHBOARD_PASSWORD || '',
  userMessagesPerMinute: Math.max(1, Number(process.env.USER_MESSAGES_PER_MINUTE || 12))
};
