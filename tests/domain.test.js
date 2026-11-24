import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rentalDays, datesOverlap, hasBookingConflict, quoteRental, generateBooking,
  updateBookingStatus, countBookedDays, metrics, bookingCsv, safeCsvCell, monthWindow
} from '../src/domain.js';
import { makeDemoData } from '../src/demo.js';
import { validateData } from '../src/storage.js';

const current = '2026-11-24';

test('rental duration is date-only and rejects invalid input', () => {
  assert.equal(rentalDays('2026-12-01','2026-12-02'),1);
  assert.equal(rentalDays('2026-12-31','2027-01-03'),3);
  assert.throws(()=>rentalDays('2026-11-31','2026-12-02'),/Invalid calendar/);
  assert.throws(()=>rentalDays('2026-12-03','2026-12-03'),/Drop-off/);
  assert.throws(()=>rentalDays('2026-12-04','2026-12-03'),/Drop-off/);
});
test('adjacent bookings do not overlap, but intersecting periods do',()=>{
  assert.equal(datesOverlap('2026-12-01','2026-12-04','2026-12-04','2026-12-09'),false);
  assert.equal(datesOverlap('2026-12-01','2026-12-04','2026-12-03','2026-12-09'),true);
});
test('quote calculation handles optional extras and rental duration',()=>{
  const v={dayRate:300};
  assert.deepEqual(quoteRental(v,'2026-12-01','2026-12-04',{gps:true,childSeat:true,delivery:true}),{
    days:3,base:900,gps:120,childSeat:75,delivery:150,total:1245
  });
});
test('occupied intervals block new reservations, cancelled bookings do not',()=>{
  const bookings=[{id:'a',vehicleId:'V1',pickup:'2026-12-01',dropoff:'2026-12-07',status:'confirmed'},
                  {id:'b',vehicleId:'V1',pickup:'2026-12-08',dropoff:'2026-12-11',status:'cancelled'}];
  assert.equal(hasBookingConflict(bookings,'V1','2026-12-05','2026-12-09'),true);
  assert.equal(hasBookingConflict(bookings,'V1','2026-12-07','2026-12-09'),false);
  assert.equal(hasBookingConflict(bookings,'V2','2026-12-02','2026-12-05'),false);
});
test('new booking validates customer, date, maintenance and overlaps',()=>{
  const db={vehicles:[{id:'V1',dayRate:320,status:'ready'}],customers:[{id:'C1'}],bookings:[]};
  const base={vehicleId:'V1',customerId:'C1',pickup:'2026-12-01',dropoff:'2026-12-05'};
  const booking=generateBooking(base,db,current,()=> 'B-1');
  assert.equal(booking.total,1280);assert.equal(booking.status,'confirmed');
  db.bookings.push(booking);
  assert.throws(()=>generateBooking(base,db,current),/already has a booking/);
  assert.throws(()=>generateBooking({...base,pickup:'2026-11-01'},db,current),/past/);
  db.vehicles[0].status='maintenance';
  assert.throws(()=>generateBooking({...base,pickup:'2026-12-07',dropoff:'2026-12-09'},db,current),/maintenance/);
});
test('booking lifecycle disallows skipping steps and changing final status',()=>{
  const initial=[{id:'b1',status:'pending'}];
  assert.throws(()=>updateBookingStatus(initial,'b1','completed'),/Cannot change/);
  const next=updateBookingStatus(initial,'b1','confirmed');
  assert.equal(next[0].status,'confirmed');
  assert.equal(initial[0].status,'pending');
  const active=updateBookingStatus(next,'b1','active');
  const completed=updateBookingStatus(active,'b1','completed');
  assert.throws(()=>updateBookingStatus(completed,'b1','cancelled'),/Finalized/);
});
test('occupancy merges intersecting intervals instead of double counting',()=>{
  const bookings=[{vehicleId:'V',pickup:'2026-11-02',dropoff:'2026-11-08',status:'active'},
    {vehicleId:'V',pickup:'2026-11-06',dropoff:'2026-11-11',status:'completed'}];
  assert.equal(countBookedDays(bookings,'V','2026-11-01','2026-12-01'),9);
});
test('demo data validates and supports metrics',()=>{
  const db=makeDemoData(current);
  assert.equal(validateData(db),true);
  const m=metrics(db,current);
  assert.equal(db.vehicles.length,10);
  assert.ok(m.utilization>=0&&m.utilization<=100);
  assert.ok(m.revenue>0);
  assert.ok(m.projected>0);
  assert.equal(monthWindow(current).start,'2026-11-01');
});
test('CSV cells escape quotes and neutralize spreadsheet formulas',()=>{
  assert.equal(safeCsvCell('=SUM(A1:A2)'),"\"'=SUM(A1:A2)\"");
  assert.equal(safeCsvCell('Hi "Team"'),'"Hi ""Team"""');
  const db=makeDemoData(current);
  assert.match(bookingCsv(db),/Booking ID/);
  assert.match(bookingCsv(db),/BK-1042/);
});
