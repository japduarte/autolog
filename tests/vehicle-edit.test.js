const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('car cards expose an edit action', () => {
  const source = fs.readFileSync('app.js', 'utf8');
  assert.match(source, /function editCar\(id\)/);
  assert.match(source, /Editar carro/);
});
