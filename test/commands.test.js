const test = require('node:test');
const assert = require('node:assert/strict');
const { runCommand } = require('../src/commands');

test('ping command responds', async () => {
  const result = await runCommand('!ping');
  assert.equal(result.handled, true);
  assert.match(result.reply, /Pong/);
});

test('echo preserves original message casing', async () => {
  const result = await runCommand('!echo Hello Nipuna!');
  assert.equal(result.reply, 'Hello Nipuna!');
});

test('dot prefix is accepted', async () => {
  const result = await runCommand('.help');
  assert.equal(result.handled, true);
  assert.match(result.reply, /Commands/);
});

test('unknown commands are passed through', async () => {
  const result = await runCommand('!not-a-command');
  assert.equal(result.handled, false);
});
