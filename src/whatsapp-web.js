const EventEmitter = require('node:events');
const fs = require('node:fs/promises');
const QRCode = require('qrcode');
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { useMultiFileAuthState, DisconnectReason } = baileys;

function extractMessageText(message) {
  const c = message.message || {};
  return c.conversation || c.extendedTextMessage?.text || c.imageMessage?.caption || c.videoMessage?.caption || '';
}
class WhatsAppWebBot extends EventEmitter {
  constructor({ sessionDir, onMessage, maxMessagesPerMinute = 10 }) {
    super(); this.sessionDir = sessionDir; this.onMessage = onMessage; this.maxMessagesPerMinute = maxMessagesPerMinute;
    this.socket = null; this.starting = false; this.reconnectTimer = null; this.manualDisconnect = false; this.qrDataUrl = null;
    this.status = { state: 'disconnected', message: 'Not connected', phone: null };
    this.messageTimes = new Map();
  }
  setStatus(state, message, extra = {}) {
    this.status = { ...this.status, state, message, ...extra }; this.emit('status', this.status);
  }
  async connect() {
    if (this.starting || this.socket) return;
    this.manualDisconnect = false;
    this.starting = true; this.setStatus('connecting', 'Preparing WhatsApp connection…');
    try {
      await fs.mkdir(this.sessionDir, { recursive: true, mode: 0o700 });
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      const sock = makeWASocket({
        auth: state, printQRInTerminal: false,
        browser: ['Nipuna Bot', 'Chrome', '1.0.0'],
        markOnlineOnConnect: false, syncFullHistory: false
      });
      this.socket = sock;
      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async update => {
        if (update.qr) {
          try {
            this.qrDataUrl = await QRCode.toDataURL(update.qr, { width: 280, margin: 2 });
            this.emit('qr', this.qrDataUrl);
            this.setStatus('qr', 'Scan the QR from WhatsApp > Linked devices.');
          } catch { this.setStatus('error', 'Could not generate QR code.'); }
        }
        if (update.connection === 'open') {
          const id = sock.user?.id || '';
          this.qrDataUrl = null;
          this.setStatus('connected', 'WhatsApp is connected.', { phone: id.split(':')[0].split('@')[0] || null });
          this.emit('qr', null);
        }
        if (update.connection === 'close') {
          const code = update.lastDisconnect?.error?.output?.statusCode;
          this.socket = null;
          if (this.manualDisconnect) {
            this.setStatus('disconnected', 'WhatsApp is disconnected.', { phone: null });
          } else if (code === DisconnectReason.loggedOut) {
            await fs.rm(this.sessionDir, { recursive: true, force: true }).catch(() => {});
            this.qrDataUrl = null;
            this.setStatus('disconnected', 'Logged out. Pair again with a new QR code.', { phone: null });
          } else {
            this.setStatus('reconnecting', 'Connection interrupted. Reconnecting…'); this.scheduleReconnect();
          }
        }
      });
      sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const message of messages || []) this.handleIncoming(message).catch(e => console.error('Message error:', e.message));
      });
    } catch (e) {
      this.socket = null; this.setStatus('error', e.message || 'Could not start WhatsApp.'); throw e;
    } finally { this.starting = false; }
  }
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null; this.connect().catch(e => console.error('Reconnect failed:', e.message));
    }, 3000);
    this.reconnectTimer.unref?.();
  }
  async handleIncoming(message) {
    const jid = message.key?.remoteJid;
    if (!jid || message.key?.fromMe || jid.endsWith('@g.us') || jid === 'status@broadcast') return;
    const text = extractMessageText(message).trim();
    if (!text) return;
    const recent = (this.messageTimes.get(jid) || []).filter(t => Date.now() - t < 60000);
    if (recent.length >= this.maxMessagesPerMinute) return;
    recent.push(Date.now()); this.messageTimes.set(jid, recent);
    this.emit('message', { from: jid.split('@')[0], preview: text.slice(0, 80), at: new Date().toISOString() });
    if (this.onMessage) await this.onMessage({ jid, text });
  }
  async sendText(jid, text) {
    if (!this.socket || this.status.state !== 'connected') throw new Error('WhatsApp is not connected.');
    return this.socket.sendMessage(jid, { text: String(text).slice(0, 4000) });
  }
  async disconnect() {
    this.manualDisconnect = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const sock = this.socket; this.socket = null;
    if (sock) { try { sock.end(undefined); } catch {} try { sock.ws?.close(); } catch {} }
    await fs.rm(this.sessionDir, { recursive: true, force: true }).catch(() => {});
    this.qrDataUrl = null;
    this.setStatus('disconnected', 'WhatsApp has been logged out.', { phone: null }); this.emit('qr', null);
  }
  async stop() {
    this.manualDisconnect = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const sock = this.socket; this.socket = null;
    if (sock) { try { sock.end(undefined); } catch {} try { sock.ws?.close(); } catch {} }
  }
}
module.exports = { WhatsAppWebBot };
