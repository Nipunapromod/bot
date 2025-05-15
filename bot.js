const venom = require('venom-bot');
const express = require('express');
const fs = require('fs');
const app = express();
const path = require('path');

// Store QR code as base64
let qrCodeBase64 = '';

venom
  .create({
    session: 'session-bot',
    catchQR: (base64Qrimg) => {
      qrCodeBase64 = base64Qrimg;
      console.log('QR Code updated');
    },
    browserArgs: ['--no-sandbox']
  })
  .then((client) => start(client))
  .catch((error) => console.log(error));

function start(client) {
  client.onMessage(async (message) => {
    if (!message.body.startsWith('.')) return;

    const commandName = message.body.split(' ')[0].substring(1);
    try {
      const command = require(`./commands/${commandName}.js`);
      await command.run(client, message);
    } catch (err) {
      console.log(`Command ${commandName} not found.`);
    }
  });
}

// Express route to show QR code
app.get('/qr', (req, res) => {
  if (!qrCodeBase64) return res.send('QR not ready. Please wait...');
  const html = `
    <html>
      <body style="text-align:center;">
        <h2>Scan the WhatsApp QR Code</h2>
        <img src="${qrCodeBase64}" />
      </body>
    </html>`;
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
