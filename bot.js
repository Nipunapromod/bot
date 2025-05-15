const venom = require('venom-bot');
const fs = require('fs');
const path = require('path');

// Load all commands dynamically from commands folder
const commands = {};
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach(file => {
  if (file.endsWith('.js')) {
    const commandName = file.replace('.js', '');
    commands[commandName] = require(path.join(commandsPath, file));
  }
});

venom
  .create()
  .then(client => start(client))
  .catch(console.error);

async function start(client) {
  client.onMessage(async message => {
    if (message.type === 'chat' && message.body) {
      // Commands start with "."
      if (!message.body.startsWith('.')) return;

      const [cmdName, ...args] = message.body.slice(1).split(' ');
      const command = commands[cmdName];

      if (command) {
        try {
          await command.run(client, message, args);
        } catch (err) {
          console.error(err);
          await client.sendText(message.from, 'Error running command.');
        }
      } else {
        await client.sendText(message.from, 'Unknown command. Try .help');
      }
    }
  });
}
