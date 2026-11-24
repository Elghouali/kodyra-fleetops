import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDemoData } from '../src/demo.js';
import { DEMO_PHOTOS, demoVehiclePhoto } from '../src/vehicle-photos.js';

test('all ten seeded cars receive Commons photographs from CC0 sources', () => {
  const vehicles=makeDemoData('2026-11-24').vehicles;
  assert.equal(vehicles.length,10);
  assert.equal(Object.keys(DEMO_PHOTOS).length,vehicles.length);
  for(const vehicle of vehicles){
    const photo=demoVehiclePhoto(vehicle);
    assert.ok(photo?.src.startsWith('https://commons.wikimedia.org/wiki/Special:Redirect/file/'),vehicle.id);
    assert.match(photo.src,/\?width=640$/);
    assert.match(photo.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.equal(photo.license,'CC0 1.0');
  }
});
test('a newly added or changed vehicle falls back to the illustration',()=>{
  assert.equal(demoVehiclePhoto({id:'custom',make:'New',model:'Car'}),null);
  assert.equal(demoVehiclePhoto({id:'V02',make:'New',model:'Car'}),null);
});
