import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDemoData } from '../src/demo.js';
import { DEMO_PHOTOS, demoVehiclePhoto } from '../src/vehicle-photos.js';

test('all ten seeded cars receive Commons photographs from CC0 sources', () => {
  const vehicles=makeDemoData('2026-11-24').vehicles;
  assert.equal(vehicles.length,10);
  assert.equal(Object.keys(DEMO_PHOTOS).length,vehicles.length);
  for(const vehicle of vehicles){
    const photo=demoVehiclePhoto(vehicle);
    assert.equal(photo?.src,`/assets/vehicle-photos/${vehicle.id}.jpg`);
    const bytes=readFileSync(new URL(`..${photo.src}`,import.meta.url));
    assert.ok(bytes.length>1000);
    assert.equal(bytes[0],0xff);
    assert.equal(bytes[1],0xd8);
    assert.equal(bytes[bytes.length-2],0xff);
    assert.equal(bytes[bytes.length-1],0xd9);
    assert.match(photo.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.equal(photo.license,'CC0 1.0');
  }
});
test('a newly added or changed vehicle falls back to the illustration',()=>{
  assert.equal(demoVehiclePhoto({id:'custom',make:'New',model:'Car'}),null);
  assert.equal(demoVehiclePhoto({id:'V02',make:'New',model:'Car'}),null);
});
