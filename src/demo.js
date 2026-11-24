import { quoteRental } from './domain.js';
const DAY = 86400000;
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function offsetDay(today, offset) {
  const d = new Date(`${today}T00:00:00Z`);
  return new Date(d.getTime() + offset * DAY).toISOString().slice(0, 10);
}
const vehicles = [
  ['V01','Dacia','Duster','CX-1183-A','SUV',420,'ready','#D9E5E9'],
  ['V02','Renault','Clio 5','CX-9241-B','Economy',290,'ready','#E9E9E6'],
  ['V03','Hyundai','Tucson','CX-7702-C','SUV',510,'ready','#D9E0D8'],
  ['V04','Peugeot','208','CX-3361-D','Economy',310,'ready','#E2DFE9'],
  ['V05','Volkswagen','Golf 8','CX-4772-E','Premium',540,'ready','#DDE5EF'],
  ['V06','Kia','Sportage','CX-0119-F','SUV',480,'ready','#E8E0D5'],
  ['V07','Toyota','Yaris','CX-1181-G','Economy',300,'ready','#E3E9DC'],
  ['V08','Mercedes','C-Class','CX-8884-H','Luxury',950,'ready','#DDE0E5'],
  ['V09','Skoda','Octavia','CX-4412-I','Premium',470,'maintenance','#E9E3DA'],
  ['V10','Citroën','C3','CX-6599-J','Economy',275,'ready','#E8DDE5'],
].map(([id,make,model,plate,category,dayRate,status,tint]) => ({ id,make,model,plate,category,dayRate,status,tint }));

const customers = [
  ['C01','Amina Benali','amina.benali@example.com','+212 600 000 101'],
  ['C02','Youssef Amrani','youssef.amrani@example.com','+212 600 000 102'],
  ['C03','Sofia Martins','sofia.martins@example.com','+212 600 000 103'],
  ['C04','Adam El Idrissi','adam.idrissi@example.com','+212 600 000 104'],
  ['C05','Léa Dubois','lea.dubois@example.com','+212 600 000 105'],
  ['C06','Omar Haddad','omar.haddad@example.com','+212 600 000 106'],
  ['C07','Nora Saidi','nora.saidi@example.com','+212 600 000 107'],
  ['C08','Lucas Pereira','lucas.pereira@example.com','+212 600 000 108'],
  ['C09','Salma Alaoui','salma.alaoui@example.com','+212 600 000 109'],
  ['C10','Daniel Smith','daniel.smith@example.com','+212 600 000 110'],
  ['C11','Ines Berrada','ines.berrada@example.com','+212 600 000 111'],
].map(([id,name,email,phone]) => ({ id,name,email,phone }));

export function makeDemoData(today = todayLocal()) {
  const samples = [
    ['V01','C01',-3,3,'active'],['V02','C03',-1,5,'active'],['V03','C02',1,5,'confirmed'],
    ['V05','C05',2,6,'confirmed'],['V06','C04',3,7,'confirmed'],['V08','C10',1,3,'confirmed'],
    ['V04','C08',6,9,'confirmed'],['V07','C06',5,7,'confirmed'],['V10','C11',8,12,'pending'],
    ['V01','C07',10,14,'confirmed'],['V02','C09',12,17,'confirmed'],
    ['V03','C01',-15,-12,'completed'],['V04','C05',-23,-20,'completed'],
    ['V05','C10',-8,-4,'completed'],['V06','C02',-12,-8,'completed'],
    ['V07','C03',-6,-2,'completed'],['V08','C08',-17,-14,'completed'],
    ['V10','C07',-10,-7,'completed'],['V01','C04',-28,-25,'completed'],
    ['V02','C01',-43,-40,'completed'],['V03','C10',-49,-46,'completed'],
    ['V04','C11',-72,-68,'completed'],['V06','C09',-87,-83,'completed'],
    ['V05','C05',-114,-110,'completed'],['V01','C02',-145,-140,'completed'],
    ['V08','C10',-172,-170,'completed'],['V04','C04',-14,-10,'cancelled'],
  ];
  const bookings = samples.map(([vehicleId,customerId,s,e,status],i) => {
    const vehicle = vehicles.find(x => x.id === vehicleId);
    const pickup = offsetDay(today,s), dropoff = offsetDay(today,e);
    const options = { gps: i%5===0, childSeat: i%7===0, delivery: i%4===0 };
    return { id:`BK-${String(1042+i).padStart(4,'0')}`,vehicleId,customerId,pickup,dropoff,status,options,total:quoteRental(vehicle,pickup,dropoff,options).total,createdAt:offsetDay(today,s-3) };
  });
  return { version:1, seededAt:today, vehicles:vehicles.map(v=>({...v})), customers:customers.map(c=>({...c})), bookings };
}
