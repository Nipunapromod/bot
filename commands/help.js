module.exports = {
  run: async (client, message, args) => {
    const helpMsg = `
Available commands:
.photo <keyword> - Get 20 photos for keyword
.hello <text> - Say hello
.help - Show this message
`;
    await client.sendText(message.from, helpMsg);
  }
};
