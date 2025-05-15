module.exports = {
  run: async (client, message, args) => {
    await client.sendText(message.from, `Hello! You said: ${args.join(' ')}`);
  }
};
