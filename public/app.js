const $ = id => document.getElementById(id);
let stream, activity = [];
async function api(url, options = {}) {
  const response = await fetch(url, { credentials:'same-origin', headers:{'Content-Type':'application/json',...(options.headers||{})}, ...options });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) showLogin();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function showLogin() { if (stream) stream.close(); $('loginView').classList.remove('hidden'); $('appView').classList.add('hidden'); }
function showDashboard() { $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden'); refreshStatus(); connectEvents(); }
function renderStatus(data) {
  const state = data.state || 'disconnected';
  $('statusDot').className = 'status-dot ' + state;
  $('statusTitle').textContent = ({connected:'Connected',qr:'Waiting for QR scan',connecting:'Connecting…',reconnecting:'Reconnecting…',error:'Connection error',disconnected:'Not connected'})[state] || state;
  $('statusText').textContent = data.message || 'WhatsApp status unavailable.';
  $('phoneNumber').textContent = data.phone ? 'Linked number: +' + data.phone : '';
  const connected = state === 'connected';
  $('connectBtn').classList.toggle('hidden', connected || ['connecting','qr','reconnecting'].includes(state));
  $('disconnectBtn').classList.toggle('hidden', !connected && !['qr','connecting','reconnecting'].includes(state));
  if (typeof data.aiConfigured === 'boolean') {
    $('aiState').textContent = data.aiConfigured ? 'Ready for natural-language replies' : 'Add an AI API key on the server';
    $('aiBadge').textContent = data.aiConfigured ? 'Ready' : 'Not set'; $('aiBadge').classList.toggle('on', data.aiConfigured);
  }
  if (typeof data.webSearchConfigured === 'boolean') {
    $('searchState').textContent = data.webSearchConfigured ? 'Can search the public web when needed' : 'Add a Tavily API key to enable search';
    $('searchBadge').textContent = data.webSearchConfigured ? 'Ready' : 'Not set'; $('searchBadge').classList.toggle('on', data.webSearchConfigured);
  }
}
function renderQR(url) {
  const visible = Boolean(url);
  $('qrImage').classList.toggle('hidden', !visible); $('qrCaption').classList.toggle('hidden', !visible); $('qrPlaceholder').classList.toggle('hidden', visible);
  if (visible) $('qrImage').src = url; else $('qrImage').removeAttribute('src');
}
function addActivity(item) {
  activity.unshift(item); activity = activity.slice(0,8); $('activityList').innerHTML = '';
  for (const entry of activity) {
    const row = document.createElement('div'); row.className = 'activity-item';
    const left = document.createElement('span'); left.textContent = '+' + entry.from + ' · ' + entry.preview;
    const right = document.createElement('time'); right.textContent = new Date(entry.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    row.append(left,right); $('activityList').append(row);
  }
}
async function refreshStatus() { try { renderStatus(await api('/api/status')); } catch(e) { $('statusText').textContent = e.message; } }
function connectEvents() {
  if (stream) stream.close(); stream = new EventSource('/api/events');
  stream.addEventListener('status', e => { const d=JSON.parse(e.data); renderStatus(d); if(d.state==='connected')renderQR(null); });
  stream.addEventListener('qr', e => renderQR(JSON.parse(e.data).dataUrl));
  stream.addEventListener('activity', e => addActivity(JSON.parse(e.data)));
}
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('loginError').textContent='';
  try { await api('/api/login',{method:'POST',body:JSON.stringify({password:$('password').value})}); $('password').value=''; showDashboard(); }
  catch(err) { $('loginError').textContent=err.message; }
});
$('connectBtn').addEventListener('click', async () => {
  $('connectBtn').disabled=true;
  try { await api('/api/connect',{method:'POST',body:'{}'}); } catch(e) { $('statusText').textContent=e.message; }
  finally { $('connectBtn').disabled=false; refreshStatus(); }
});
$('disconnectBtn').addEventListener('click', async () => {
  if(!confirm('Disconnect and remove this WhatsApp linked-device session?'))return;
  $('disconnectBtn').disabled=true;
  try { await api('/api/disconnect',{method:'POST',body:'{}'}); renderQR(null); } catch(e) { $('statusText').textContent=e.message; }
  finally { $('disconnectBtn').disabled=false; refreshStatus(); }
});
$('logoutBtn').addEventListener('click', async () => { try { await api('/api/logout',{method:'POST',body:'{}'}); } catch{} showLogin(); });
(async()=>{try{await api('/api/me');showDashboard();}catch{showLogin();}})();