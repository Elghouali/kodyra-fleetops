/** FleetOps domain rules; no browser, framework, or external service dependency. */
export const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'confirmed', 'active', 'completed']);
export const BOOKING_STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];

const DAY = 86400000;

export function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error('Use a date in YYYY-MM-DD format.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date.');
  return date.getTime();
}

export function rentalDays(start, end) {
  const days = (parseDay(end) - parseDay(start)) / DAY;
  if (!Number.isInteger(days) || days < 1) throw new Error('Drop-off must be after pick-up (minimum one day).');
  return days;
}

export function datesOverlap(aStart, aEnd, bStart, bEnd) {
  parseDay(aStart); parseDay(aEnd); parseDay(bStart); parseDay(bEnd);
  return aStart < bEnd && bStart < aEnd;
}

export function hasBookingConflict(bookings, vehicleId, pickup, dropoff, excludeId = null) {
  rentalDays(pickup, dropoff);
  return bookings.some(booking => booking.id !== excludeId && booking.vehicleId === vehicleId &&
    ACTIVE_BOOKING_STATUSES.has(booking.status) &&
    datesOverlap(pickup, dropoff, booking.pickup, booking.dropoff));
}

export function quoteRental(vehicle, pickup, dropoff, options = {}) {
  if (!vehicle || !Number.isFinite(Number(vehicle.dayRate)) || Number(vehicle.dayRate) < 0) {
    throw new Error('A valid vehicle and daily rate are required.');
  }
  const days = rentalDays(pickup, dropoff);
  const base = days * Number(vehicle.dayRate);
  const gps = options.gps ? 40 * days : 0;
  const childSeat = options.childSeat ? 25 * days : 0;
  const delivery = options.delivery ? 150 : 0;
  return { days, base, gps, childSeat, delivery, total: base + gps + childSeat + delivery };
}

export function generateBooking({ vehicleId, customerId, pickup, dropoff, options = {} }, db, today, makeId = () => crypto.randomUUID()) {
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  const customer = db.customers.find(c => c.id === customerId);
  if (!vehicle) throw new Error('Please choose a valid vehicle.');
  if (!customer) throw new Error('Please choose a customer.');
  if (vehicle.status === 'maintenance') throw new Error('Vehicle is unavailable while in maintenance.');
  if (pickup < today) throw new Error('New bookings cannot start in the past.');
  if (hasBookingConflict(db.bookings, vehicleId, pickup, dropoff)) throw new Error('This vehicle already has a booking for those dates.');
  const quote = quoteRental(vehicle, pickup, dropoff, options);
  const id = makeId();
  return { id, vehicleId, customerId, pickup, dropoff, options, total: quote.total, status: 'confirmed', createdAt: today };
}

export function updateBookingStatus(bookings, bookingId, status) {
  if (!BOOKING_STATUSES.includes(status)) throw new Error('Unknown booking status.');
  const booking = bookings.find(x => x.id === bookingId);
  if (!booking) throw new Error('Booking not found.');
  if (booking.status === 'cancelled' || booking.status === 'completed') throw new Error('Finalized bookings cannot be changed.');
  const allowed = { pending: ['confirmed', 'cancelled'], confirmed: ['active', 'cancelled'], active: ['completed'] };
  if (!allowed[booking.status]?.includes(status)) throw new Error(`Cannot change ${booking.status} to ${status}.`);
  return bookings.map(item => item.id === bookingId ? { ...item, status } : item);
}

export function formatMoney(value, currency = 'MAD') {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0)} ${currency}`;
}

export function countBookedDays(bookings, vehicleId, start, end) {
  const s = parseDay(start);
  const e = parseDay(end);
  const parts = [];
  for (const b of bookings) {
    if (b.vehicleId !== vehicleId || b.status === 'cancelled') continue;
    const begin = Math.max(s, parseDay(b.pickup));
    const finish = Math.min(e, parseDay(b.dropoff));
    if (finish > begin) parts.push([begin, finish]);
  }
  parts.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let latest = -Infinity;
  for (const [begin, finish] of parts) {
    total += Math.max(0, finish - Math.max(begin, latest)) / DAY;
    latest = Math.max(latest, finish);
  }
  return total;
}

export function monthWindow(today) {
  const date = new Date(`${today}T00:00:00Z`);
  const month = date.toISOString().slice(0, 7);
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  return { start: `${month}-01`, end, label: date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }) };
}

export function metrics(db, today) {
  const { start, end } = monthWindow(today);
  const valid = db.bookings.filter(b => b.status !== 'cancelled');
  const active = valid.filter(b => b.pickup <= today && b.dropoff > today);
  const booked = valid.filter(b => datesOverlap(b.pickup, b.dropoff, start, end));
  const revenue = valid.filter(b => b.status === 'completed' && b.dropoff >= start && b.dropoff < end)
    .reduce((sum, b) => sum + b.total, 0);
  const projected = valid.filter(b => ['confirmed', 'active'].includes(b.status) && b.pickup >= start && b.pickup < end)
    .reduce((sum, b) => sum + b.total, 0);
  const rentable = db.vehicles.filter(v => v.status !== 'maintenance');
  const periodDays = rentalDays(start, end);
  const utilization = rentable.length ? Math.min(100, Math.round(100 * rentable.reduce((sum, v) => sum + countBookedDays(valid, v.id, start, end), 0) / (rentable.length * periodDays))) : 0;
  return { revenue, projected, active: active.length, utilization, booked: booked.length, totalVehicles: db.vehicles.length, rentable: rentable.length };
}

export function monthSeries(db, today, count = 6) {
  const current = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const month = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - count + i + 1, 1));
    const y = month.getUTCFullYear(), m = month.getUTCMonth();
    const start = month.toISOString().slice(0, 10);
    const end = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
    const revenue = db.bookings.filter(b => b.status === 'completed' && b.dropoff >= start && b.dropoff < end)
      .reduce((sum, b) => sum + Number(b.total), 0);
    return { label: month.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), revenue };
  });
}

export function safeCsvCell(value) {
  const cell = String(value ?? '');
  // Neutralize spreadsheet formula injection in user-controlled fields.
  const neutralized = /^[\s]*[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

export function bookingCsv(db) {
  const vehicle = id => db.vehicles.find(v => v.id === id);
  const customer = id => db.customers.find(c => c.id === id);
  const header = ['Booking ID', 'Customer', 'Vehicle', 'Pickup', 'Dropoff', 'Status', 'Total MAD'];
  const rows = db.bookings.map(b => [b.id, customer(b.customerId)?.name ?? 'Unknown', `${vehicle(b.vehicleId)?.make ?? ''} ${vehicle(b.vehicleId)?.model ?? ''}`.trim(), b.pickup, b.dropoff, b.status, b.total]);
  return [header, ...rows].map(row => row.map(safeCsvCell).join(',')).join('\r\n') + '\r\n';
}
