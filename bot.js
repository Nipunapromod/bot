const venom = require('venom-bot');
const express = require('express');
const axios = require('axios');
const app = express();

let qrCodeBase64 = '';

venom
  .create({
    session: 'session-bot',
    catchQR: (base64Qrimg) => {
      qrCodeBase64 = base64Qrimg;
      console.log('QR updated, scan at /qr');
    },
    browserArgs: ['--no-sandbox']
  })
  .then((client) => start(client))
  .catch((err) => console.error(err));

function start(client) {
  client.onMessage(async (message) => {
    const body = message.body.trim();
    if (!body.startsWith('.')) return;

    const [prefix, ...args] = body.slice(1).split(' ');
    const text = args.join(' ');

    if (prefix === 'photo') {
      if (!text) return client.sendText(message.from, 'Send like `.photo cat`');

      try {
        const res = await axios.get('https://api.unsplash.com/search/photos', {
          params: { query: text, per_page: 20 },
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
          }
        });

        const images = res.data.results.map(img => img.urls.small);
        for (let url of images) {
          await client.sendImage(message.from, url, 'photo.jpg', `Here's a photo of ${text}`);
        }
      } catch (err) {
        console.log(err.message);
        client.sendText(message.from, 'Error fetching images.');
      }
    }

    // Add more commands like this:
    if (prefix === 'hello') {
      client.sendText(message.from, 'Hey there bro!');
    }

  });
}

// Show QR code on /qr
app.get('/qr', (req, res) => {
  if (!qrCodeBase64) return res.send('QR code not ready. Wait a few seconds...');
  res.send(`
    <html><body style="text-align:center;">
    <h2>Scan WhatsApp QR Code</h2>
    <img src="${qrCodeBase64}" />
    </body></html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('QR page at /qr'));
