import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDemoData } from '../src/demo.js';

const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const db = makeDemoData('2026-11-24');

test('fictional fleet has meaningful vehicle specifications and unique plates', () => {
  assert.equal(db.vehicles.length, 10);
  assert.equal(new Set(db.vehicles.map(v=>v.plate)).size, 10);
  for (const vehicle of db.vehicles) {
    assert.ok(vehicle.year >= 2020 && vehicle.year <= 2026);
    assert.ok(vehicle.mileageKm >= 0 && vehicle.mileageKm < 100000);
    assert.ok(['Diesel','Petrol','Hybrid'].includes(vehicle.fuel));
    assert.ok(['Manual','Automatic'].includes(vehicle.transmission));
    assert.equal(vehicle.seats,5);
  }
});

test('vehicle detail UX keeps operational controls and honest image labels', () => {
  assert.match(source, /function vehicleDetailsModal\(vehicleId\)/);
  assert.match(source, /data-action="vehicle-details"/);
  assert.match(source, /data-action="toggle-maintenance"/);
  assert.match(source, /data-action="new-booking"/);
  assert.match(source, /The photograph shows a representative model, not this particular vehicle/);
  assert.match(source, /Illustrative fallback preview/);
  assert.match(source, /Current \/ next rental/);
});

test('photographic thumbnails are permitted by the Content Security Policy', () => {
  const headers=readFileSync(new URL('../_headers',import.meta.url),'utf8');
  assert.match(headers, /img-src 'self' data:;/);
  assert.doesNotMatch(headers, /img-src[^;]*wikimedia\.org/);
});
