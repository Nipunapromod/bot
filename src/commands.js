const helpText = '🤖 *Nipuna WhatsApp Bot*\n\nCommands:\n!help - Show this menu\n!ping - Check if the bot is online\n!about - About this bot\n!time - Current server time\n!echo <message> - Repeat your message\n\nYou can also send a normal message to chat with the AI assistant.\nSend an image for image understanding when AI is enabled.';
async function runCommand(input) {
  const cleaned = input.trim().replace(/^\./, '!').toLowerCase();
  const [command, ...parts] = cleaned.split(/\s+/);
  const argument = parts.join(' ');
  switch (command) {
    case '!help':
    case '!menu': return { handled: true, reply: helpText };
    case '!ping': return { handled: true, reply: '🏓 Pong! The bot is online.' };
    case '!about': return { handled: true, reply: 'Nipuna WhatsApp AI Bot v2.0\nBuilt with Node.js, Express, Meta WhatsApp Cloud API and optional OpenAI AI.' };
    case '!time': return { handled: true, reply: '🕒 Server time: ' + new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' }) + ' (Sri Lanka)' };
    case '!echo': return { handled: true, reply: argument ? argument.slice(0, 3500) : 'Usage: !echo your message' };
    default: return { handled: false, reply: '' };
  }
}
module.exports = { runCommand, helpText };
