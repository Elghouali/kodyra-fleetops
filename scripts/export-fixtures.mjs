import { writeFile, mkdir } from 'node:fs/promises';
import { makeDemoData } from '../src/demo.js';
await mkdir('data', {recursive:true});
const snapshot=makeDemoData('2026-11-24');
await writeFile('data/demo-snapshot.json',JSON.stringify(snapshot,null,2)+'\n');
console.log(`Exported ${snapshot.vehicles.length} vehicles, ${snapshot.customers.length} customers and ${snapshot.bookings.length} bookings.`);
