const fetch = require('node-fetch');

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

async function fetchPhotos(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=${UNSPLASH_ACCESS_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results.map(photo => photo.urls.small);
}

module.exports = {
  run: async (client, message, args) => {
    if (!UNSPLASH_ACCESS_KEY) {
      await client.sendText(message.from, 'Unsplash API key is not set.');
      return;
    }

    if (args.length === 0) {
      await client.sendText(message.from, 'Please provide a search keyword, e.g. .photo cats');
      return;
    }

    const keyword = args.join(' ');

    try {
      const photos = await fetchPhotos(keyword);
      if (photos.length === 0) {
        await client.sendText(message.from, `No photos found for "${keyword}".`);
        return;
      }

      for (let i = 0; i < photos.length; i++) {
        await client.sendImage(message.from, photos[i], `photo_${i + 1}.jpg`, `Photo ${i + 1} for "${keyword}"`);
      }
    } catch (err) {
      console.error(err);
      await client.sendText(message.from, 'Error fetching photos, try again later.');
    }
  }
};
