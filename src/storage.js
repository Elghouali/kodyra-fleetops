import { makeDemoData, todayLocal } from './demo.js';
const KEY = 'kodyra-fleetops-v1';
export function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (validateData(data)) return data;
  } catch { /* storage blocked or corrupt: use fixtures */ }
  return makeDemoData();
}
export function saveData(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
  catch { return false; }
}
export function resetData() {
  try { localStorage.removeItem(KEY); } catch { /* private browsing */ }
  return makeDemoData(todayLocal());
}
export function validateData(value) {
  if (!value || value.version !== 1) return false;
  const arrays = ['vehicles','customers','bookings'];
  if (!arrays.every(k => Array.isArray(value[k]) && value[k].length <= 5000)) return false;
  if (!value.vehicles.every(v => typeof v.id === 'string' && typeof v.make === 'string' && typeof v.model === 'string' && Number.isFinite(v.dayRate) && v.dayRate >= 0)) return false;
  if (!value.customers.every(c => typeof c.id === 'string' && typeof c.name === 'string')) return false;
  if (!value.bookings.every(b => typeof b.id === 'string' && typeof b.pickup === 'string' && typeof b.dropoff === 'string' && Number.isFinite(b.total))) return false;
  return true;
}
