const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('vehicle form collects year and colour', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /id="c-year"/);
  assert.match(html, /id="c-color"/);
});
