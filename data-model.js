(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AutoLogModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const text = value => String(value ?? '').trim();

  function validDB(raw) {
    return Boolean(raw) && Array.isArray(raw.cars) && Array.isArray(raw.records);
  }

  function normalizeDB(raw) {
    const source = validDB(raw) ? raw : { cars: [], records: [] };
    return {
      schemaVersion: 3,
      updatedAt: text(source.updatedAt) || new Date().toISOString(),
      cars: source.cars.map(car => ({
        id: text(car.id) || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        model: text(car.model),
        fuel: text(car.fuel),
        plate: text(car.plate),
        ...(car.year ? { year: text(car.year) } : {}),
        ...(car.color ? { color: text(car.color) } : {}),
      })),
      records: source.records.map(record => ({ ...record })),
    };
  }

  function lastKnownKm(records, carId) {
    const km = records
      .filter(record => record.carId === carId && String(record.km ?? '').trim() !== '' && Number.isFinite(Number(record.km)))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]?.km;
    return km === undefined ? null : Number(km);
  }

  function carSummary(records, carId) {
    const entries = records.filter(record => record.carId === carId);
    const newest = [...entries].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    return {
      count: entries.length,
      totalCost: entries.reduce((total, record) => total + (Number(record.cost) || 0), 0),
      lastKm: lastKnownKm(entries, carId),
      lastDate: newest?.date || '',
    };
  }

  return { normalizeDB, validDB, lastKnownKm, carSummary };
});
