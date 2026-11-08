const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDB, validDB, lastKnownKm } = require('../data-model.js');

test('normalizes an existing backup into V2 car fields', () => {
  const db = normalizeDB({ cars: [{ id: 'a', model: 'Carro antigo', year: '2010', color: 'azul' }], records: [] });

  assert.equal(validDB(db), true);
  assert.deepEqual(db.cars[0], { id: 'a', model: 'Carro antigo', fuel: '', plate: '', year: '2010', color: 'azul' });
  assert.equal(db.schemaVersion, 3);
});

test('finds the latest valid odometer instead of treating blank km as zero', () => {
  const records = [
    { carId: 'a', date: '2026-01-01', km: 125000 },
    { carId: 'a', date: '2026-02-01', km: '' },
    { carId: 'a', date: '2026-03-01', km: null },
  ];

  assert.equal(lastKnownKm(records, 'a'), 125000);
});

test('rejects an import without car and record arrays', () => {
  assert.equal(validDB({ cars: [] }), false);
});
