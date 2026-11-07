const crypto = require('node:crypto');
function createSessionToken(secret) {
  const payload = Buffer.from(String(Date.now() + 12 * 60 * 60 * 1000)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + signature;
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function isValidSession(cookieHeader, secret) {
  if (!secret) return false;
  const item = cookieHeader.split(';').map(v => v.trim()).find(v => v.startsWith('np_dashboard='));
  if (!item) return false;
  const [payload, signature] = decodeURIComponent(item.slice(13)).split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return false;
  const expires = Number(Buffer.from(payload, 'base64url').toString());
  return Number.isFinite(expires) && expires > Date.now();
}
module.exports = { createSessionToken, isValidSession, safeEqual };
