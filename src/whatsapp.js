const config = require('./config');
function apiUrl(path) { return 'https://graph.facebook.com/' + config.graphVersion + '/' + path; }
function authHeaders(extra = {}) {
  if (!config.whatsappToken) throw new Error('WHATSAPP_TOKEN is not configured');
  return { Authorization: 'Bearer ' + config.whatsappToken, ...extra };
}
async function sendText(to, body) {
  if (!config.phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID is not configured');
  const response = await fetch(apiUrl(config.phoneNumberId + '/messages'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text',
      text: { preview_url: false, body: String(body || '').slice(0, 4000) || ' ' }
    }),
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'WhatsApp API returned ' + response.status);
  return data;
}
async function markAsRead(messageId) {
  if (!config.phoneNumberId || !config.whatsappToken) return;
  const response = await fetch(apiUrl(config.phoneNumberId + '/messages'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('Could not mark message as read: ' + response.status);
}
async function downloadMedia(mediaId) {
  if (!mediaId) throw new Error('Image media ID is missing');
  const metadataResponse = await fetch(apiUrl(mediaId), { headers: authHeaders(), signal: AbortSignal.timeout(15000) });
  const metadata = await metadataResponse.json().catch(() => ({}));
  if (!metadataResponse.ok || !metadata.url) throw new Error(metadata.error?.message || 'Could not retrieve media URL');
  const fileResponse = await fetch(metadata.url, { headers: authHeaders(), signal: AbortSignal.timeout(20000) });
  if (!fileResponse.ok) throw new Error('Could not download image: ' + fileResponse.status);
  const mimeType = fileResponse.headers.get('content-type') || metadata.mime_type || 'image/jpeg';
  if (!mimeType.startsWith('image/')) throw new Error('Unsupported media type');
  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  if (buffer.length > 5 * 1024 * 1024) throw new Error('Image is larger than the 5 MB processing limit');
  return { mimeType, base64: buffer.toString('base64') };
}
module.exports = { sendText, markAsRead, downloadMedia };
