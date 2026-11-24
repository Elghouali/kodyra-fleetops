import { formatMoney, quoteRental, generateBooking, updateBookingStatus, metrics, monthSeries, bookingCsv, hasBookingConflict, monthWindow, rentalDays } from './domain.js';
import { todayLocal, offsetDay } from './demo.js';
import { loadData, saveData, resetData } from './storage.js';

let db = loadData();
let page = 'overview';
let search = '';
let statusFilter = 'all';
let fleetFilter = 'all';
let openModal = '';
let toastTimer;
const today = () => todayLocal();
function demoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i=0;i<16;i++) bytes[i]=Math.floor(Math.random()*256);
  return Array.from(bytes, b=>b.toString(16).padStart(2,'0')).join('');
}
const h = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleCase = s => s.slice(0,1).toUpperCase() + s.slice(1);
const vehicleById = id => db.vehicles.find(v=>v.id===id);
const customerById = id => db.customers.find(c=>c.id===id);
const dateLabel = s => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const initials = name => name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');
const iconPaths = {
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  car:'<path d="m5 17-2 0v-5l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v5h-2"/><path d="M5 17h14M5 12h14M7 17v2M17 17v2M7 14h.01M17 14h.01"/>',
  people:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart:'<path d="M3 3v18h18M7 15l4-4 4 3 5-7"/>',
  arrow:'<path d="M7 17 17 7M7 7h10v10"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  export:'<path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/>',
  search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  money:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trend:'<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l-2 2a1.8 1.8 0 0 0-2-.36l-1.1.47H9.34l-1.1-.47a1.8 1.8 0 0 0-2 .36l-2-2a1.8 1.8 0 0 0 .36-2L4.13 14v-4l.47-1.1a1.8 1.8 0 0 0-.36-2l2-2a1.8 1.8 0 0 0 2 .36l1.1-.47h5.32l1.1.47a1.8 1.8 0 0 0 2-.36l2 2a1.8 1.8 0 0 0-.36 2l.47 1.1v4z"/>',
  spark:'<path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3zM19 18l.6 2.4L22 21l-2.4.6L19 24l-.6-2.4L16 21l2.4-.6L19 18z"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 16-5l2 2m0-5v5h-5M21 12a9 9 0 0 1-16 5l-2-2m0 5v-5h5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  filter:'<path d="M4 7h16M7 12h10M10 17h4"/>',
};
const icon = (name, className='') => `<svg class="${className}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.info}</svg>`;
const carArt = () => `<svg viewBox="0 0 160 90" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 55 37 31a12 12 0 0 1 10-5h65a13 13 0 0 1 10 6l17 23 5 5v12H16V61l6-6Z"/><path d="M42 33h68l16 22H27l15-22Z"/><path d="M80 33v22M17 62h126M32 71a10 10 0 1 0 20 0 10 10 0 0 0-20 0ZM112 71a10 10 0 1 0 20 0 10 10 0 0 0-20 0Z"/><path d="M18 57h15M126 57h17"/></svg>`;
function tag(s) {return `<span class="tag tag-${h(s)}">${h(titleCase(s))}</span>`;}
const btn = (label,ic,action,primary=false) => `<button type="button" data-action="${action}" class="btn ${primary?'btn-primary':''}">${icon(ic)}${label}</button>`;
function renderShell() {
  const menus=[['overview','dashboard','Overview'],['bookings','calendar','Reservations'],['fleet','car','Vehicle fleet'],['customers','people','Customers'],['analytics','chart','Analytics']];
  document.querySelector('#app').innerHTML = `<div class="shell">
   <aside class="sidebar" id="sidebar"><div class="brand"><span class="brandmark">K</span><div><div class="brandname">KODYRA<span>.</span></div><div class="brand-sub">FLEETOPS</div></div></div>
     <div class="slabel">WORKSPACE</div><nav class="nav" aria-label="Main navigation">${menus.map(([id,ic,label])=>`<button type="button" class="navitem ${page===id?'active':''}" data-page="${id}" ${page===id?'aria-current="page"':''}>${icon(ic)}${label}</button>`).join('')}</nav>
     <div class="sidebottom"><div class="side-promo"><span class="promo-icon">${icon('spark')}</span><strong>Built to demonstrate.</strong><p>A working software engineering & data analytics showcase by KODYRA.</p><a href="mailto:elghoualizakariae@gmail.com?subject=Project%20inquiry%20%E2%80%94%20KODYRA" class="promo-link">Let’s discuss your project ${icon('arrow')}</a></div><div class="sidefoot"><span>© ${new Date().getFullYear()} KODYRA</span><span>Demo v1.0</span></div></div></aside>
   <main class="main"><header class="topbar"><div style="display:flex;gap:13px;align-items:center"><button class="mobile-toggle" data-action="menu" aria-label="Toggle navigation">${icon('menu')}</button><div class="breadcrumb">Workspace ${icon('chevron')} <strong id="crumb">${h(page==='bookings'?'Reservations':titleCase(page))}</strong></div></div><div class="topactions"><span class="demo-indicator"><i></i> INTERACTIVE DEMO</span><span class="user-avatar" title="Demo workspace">KD</span></div></header><div class="workspace" id="workspace"></div></main></div><div id="modal-root"></div><div id="toast-root"></div>`;
  renderPage();
}
function pageHead(name,sub,actions='') {return `<div class="page-head"><div><div class="eyebrow">KODYRA / OPERATIONS</div><h1>${name}</h1><p>${sub}</p></div><div class="page-tools">${actions}</div></div>`;}
function notice() { return `<div class="demo-banner">${icon('info')} <strong>Demo environment.</strong> Every vehicle, person, and booking is fictional. Your edits stay in this browser only—there is no live server or customer account.</div>`; }
function stat(label,value,ic,color,meta) {return `<div class="stat"><div class="stat-head"><span>${label}</span><span class="stat-icon" style="background:${color}20;color:${color}">${icon(ic)}</span></div><div class="stat-value">${value}</div><div class="stat-meta">${meta}</div></div>`;}
function plotRevenue() {
 const series=monthSeries(db,today()); const max=Math.max(100, ...series.map(x=>x.revenue))*1.12;
 const W=560,H=240; const bottom=198, top=14, usable=bottom-top;
 const lines=[0,.25,.5,.75,1].map(i=>{const y=bottom-i*usable;return `<line x1="53" y1="${y}" x2="550" y2="${y}" stroke="#edf1f7"/><text x="46" y="${y+4}" font-size="10" text-anchor="end" fill="#a5b1c1">${i===0?'0':`${Math.round(max*i/1000)}k`}</text>`}).join('');
 const bars=series.map((x,i)=>{const barH=Math.max(2,x.revenue/max*usable);const bx=76+i*83;return `<rect x="${bx}" y="${bottom-barH}" width="42" height="${barH}" rx="6" fill="${i===series.length-1?'#2a62cb':'#a6c0f8'}"><title>${h(x.label)}: ${h(formatMoney(x.revenue))}</title></rect><text x="${bx+21}" y="220" font-size="11" fill="#91a2b8" text-anchor="middle">${h(x.label)}</text>`}).join('');
 return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenue by month, based on completed bookings in the fictional demo dataset">${lines}${bars}</svg>`;
}
function bookingRows(bookings) {
 if(!bookings.length)return `<tr><td colspan="7" class="empty">No reservations match your filters.</td></tr>`;
 return bookings.map(b=>{const v=vehicleById(b.vehicleId), c=customerById(b.customerId);return `<tr><td><strong>${h(b.id)}</strong><span class="small">${h(b.createdAt)}</span></td><td><span class="avatar">${h(initials(c?.name||'?'))}</span><strong>${h(c?.name||'Unknown')}</strong></td><td><strong>${h(v?`${v.make} ${v.model}`:'Unknown')}</strong><span class="small">${h(v?.plate||'')}</span></td><td>${h(dateLabel(b.pickup))}</td><td>${h(dateLabel(b.dropoff))}</td><td>${tag(b.status)}</td><td><strong>${formatMoney(b.total)}</strong>${b.status==='pending'||b.status==='confirmed'||b.status==='active'?`<div class="booking-actions"><button class="link-button" data-action="advance" data-id="${h(b.id)}">${b.status==='pending'?'Confirm':b.status==='confirmed'?'Start rental':'Complete rental'}</button>${b.status!=='active'?`<button class="link-button cancel-link" data-action="cancel" data-id="${h(b.id)}">Cancel</button>`:''}</div>`:''}</td></tr>`}).join('');
}
function bookingTable(list){return `<div class="table-wrap"><table class="table"><thead><tr><th>Booking ID</th><th>Customer</th><th>Vehicle</th><th>Pick-up</th><th>Drop-off</th><th>Status</th><th>Amount</th></tr></thead><tbody>${bookingRows(list)}</tbody></table></div>`;}
function fleetMini(){ const cards=db.vehicles.filter(v=>v.status!=='maintenance').slice(0,4);return cards.map(v=>{const occupied=db.bookings.some(b=>b.vehicleId===v.id&&b.status!=='cancelled'&&b.pickup<=today()&&b.dropoff>today());return `<div class="fleet-row"><div class="car-icon" style="--tint:${h(v.tint)}">${carArt()}</div><div><div class="fleet-name">${h(v.make)} ${h(v.model)}</div><div class="fleet-sub">${h(v.plate)} · ${h(v.category)}</div></div>${tag(occupied?'active':'ready')}</div>`}).join('');}
function renderOverview() {
 const m=metrics(db,today()); const recent=[...db.bookings].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)).slice(0,5);
 return pageHead('Good to see you.','Here’s what’s happening across your rental business today.',`${btn('Export report','export','export')}${btn('New reservation','plus','new-booking',true)}`)+notice()+
 `<div class="stats">${stat('Monthly revenue',formatMoney(m.revenue),'money','#3075df','From completed rentals this month')}${stat('Vehicles on rent',m.active,'car','#16a383',`${m.totalVehicles} vehicles in the fleet`)}${stat('Utilization rate',`${m.utilization}%`,'trend','#a275dc','Booked fleet-days this month')}${stat('Upcoming reservations',db.bookings.filter(b=>b.pickup>today()&&['confirmed','pending'].includes(b.status)).length,'calendar','#e4a149','Confirmed and pending ahead')}</div>
 <div class="panel-grid"><section class="panel"><div class="panel-head"><div><h2>Revenue performance</h2><p>Completed rental income over the last six months</p></div><span class="period-chip">Last 6 months ${icon('down')}</span></div><div class="chart-area">${plotRevenue()}</div><div class="insight-note">${icon('info')} <span>Sample data · ${h(formatMoney(m.projected))} in confirmed/active bookings starting this month</span></div></section>
 <section class="panel"><div class="panel-head"><div><h2>Fleet availability</h2><p>A snapshot of today's vehicles</p></div><button class="link-button" data-page="fleet">View all ${icon('chevron')}</button></div><div class="fleet-list">${fleetMini()}</div></section></div>
 <section class="panel full-panel"><div class="panel-head"><div><h2>Recent reservations</h2><p>Manage your latest rental activity</p></div><button class="link-button" data-page="bookings">View all reservations ${icon('chevron')}</button></div>${bookingTable(recent)}</section>`;
}
function filteredBookings() {
 const term=search.toLowerCase();return [...db.bookings].filter(b=>{
 const v=vehicleById(b.vehicleId),c=customerById(b.customerId);
 return (statusFilter==='all'||statusFilter===b.status)&&(!term||[b.id,c?.name,v?.make,v?.model,v?.plate].some(x=>String(x??'').toLowerCase().includes(term)));
 }).sort((a,b)=>b.pickup.localeCompare(a.pickup));
}
function renderPlanner() {
 const days=Array.from({length:10},(_,i)=>offsetDay(today(),i));
 const visible=db.vehicles.slice(0,8);
 const headings=`<div class="planner-hlabel">Vehicle / Day</div>${days.map(d=>`<div class="planner-dlabel">${new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'})}</div>`).join('')}`;
 const rows=visible.map(v=>`<div class="planner-vlabel"><strong>${h(v.make)} ${h(v.model)}</strong><span>${h(v.plate)}</span></div>${days.map(d=>{const b=db.bookings.find(b=>b.vehicleId===v.id&&b.status!=='cancelled'&&b.pickup<=d&&b.dropoff>d);
 const blocked=v.status==='maintenance',filled=!!b;
 const meaning=blocked?'Maintenance':filled?`Booked (${b.status})`:'Available — click to create a reservation';
 return `<button type="button" class="planner-cell ${blocked?'planner-off':filled?'planner-booked':'planner-free'}" title="${h(meaning)}" aria-label="${h(`${v.make} ${v.model} on ${d}: ${meaning}`)}" ${blocked||filled?'disabled':''} ${!blocked&&!filled?`data-action="new-booking" data-id="${h(v.id)}" data-date="${d}"`:''}>${blocked?'—':filled?'●':'+'}</button>`;}).join('')}`).join('');
 return `<section class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h2>10-day availability planner</h2><p>Click any available day to create a reservation for that vehicle</p></div><span class="period-chip"><span class="legend-dot" style="background:#9ab5f2"></span>Booked &nbsp; <span class="legend-dot" style="background:#dff2e9"></span>Available</span></div><div class="planner-scroll"><div class="planner-grid">${headings}${rows}</div></div></section>`;
}
function renderBookings(){return pageHead('Reservations','View bookings, track upcoming rentals and prevent double bookings.',`${btn('Export CSV','export','export')}${btn('New reservation','plus','new-booking',true)}`)+notice()+`<div class="filterbar"><label class="search">${icon('search')}<input id="booking-search" aria-label="Search reservations" value="${h(search)}" placeholder="Search booking, customer, vehicle..." /></label><select class="select" id="status-filter" aria-label="Filter reservations by status">${['all','pending','confirmed','active','completed','cancelled'].map(s=>`<option value="${s}" ${statusFilter===s?'selected':''}>${s==='all'?'All statuses':titleCase(s)}</option>`).join('')}</select></div>${renderPlanner()}<section class="panel">${bookingTable(filteredBookings())}</section>`;}
function filteredFleet(){return db.vehicles.filter(v=>(fleetFilter==='all'||v.category===fleetFilter)&&[v.make,v.model,v.plate,v.category].some(x=>x.toLowerCase().includes(search.toLowerCase())));}
function renderFleet(){return pageHead('Vehicle fleet','Manage vehicles, pricing and maintenance availability.',btn('Add vehicle','plus','new-vehicle',true))+notice()+`<div class="filterbar"><label class="search">${icon('search')}<input id="fleet-search" aria-label="Search vehicles" value="${h(search)}" placeholder="Find a vehicle..." /></label><select class="select" id="fleet-filter">${['all','Economy','SUV','Premium','Luxury'].map(s=>`<option value="${s}" ${fleetFilter===s?'selected':''}>${s==='all'?'All categories':s}</option>`).join('')}</select></div><div class="fleet-cards">${filteredFleet().map(v=>{const occupied=db.bookings.some(b=>b.vehicleId===v.id&&b.status!=='cancelled'&&b.pickup<=today()&&b.dropoff>today());return `<article class="vehicle-card"><div class="vehicle-visual" style="--tint:${h(v.tint)}">${carArt()}<span class="visual-pill">${h(v.category)}</span></div><div class="vehicle-details"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><h3>${h(v.make)} ${h(v.model)}</h3><p>${h(v.plate)}</p></div>${tag(v.status==='maintenance'?'maintenance':occupied?'active':'ready')}</div><div class="vehicle-stats"><div><strong>${formatMoney(v.dayRate)}</strong><span> / day</span></div><button type="button" data-action="toggle-maintenance" data-id="${h(v.id)}">${v.status==='maintenance'?'Restore vehicle':'Maintenance'}</button></div></div></article>`}).join('')||'<div class="empty">No matching vehicles.</div>'}</div>`;}
function renderCustomers(){return pageHead('Customers','A simple CRM for rental relationships and customer history.',btn('Add customer','plus','new-customer',true))+notice()+`<div class="filterbar"><label class="search">${icon('search')}<input id="customer-search" aria-label="Search customers" value="${h(search)}" placeholder="Search customer names..." /></label></div><div class="customer-grid">${db.customers.filter(c=>[c.name,c.email,c.phone].some(x=>String(x).toLowerCase().includes(search.toLowerCase()))).map(c=>{let orders=db.bookings.filter(b=>b.customerId===c.id&&b.status!=='cancelled');let total=orders.filter(b=>b.status==='completed').reduce((s,b)=>s+b.total,0);return `<article class="customer-card"><div style="display:flex;gap:12px;align-items:center;margin-bottom:14px"><span class="avatar" style="width:42px;height:42px;border-radius:12px;font-size:12px">${h(initials(c.name))}</span><div><h3>${h(c.name)}</h3><p>Customer ${h(c.id)}</p></div></div><p>${icon('mail')} ${h(c.email)}</p><p style="margin-top:5px">${h(c.phone)}</p><div class="customer-bottom"><span>${orders.length} reservation${orders.length===1?'':'s'}</span><strong>${formatMoney(total)} spent</strong></div></article>`}).join('')||'<div class="empty">No matching customers.</div>'}</div>`;}
function renderAnalytics(){const m=metrics(db,today()), window=monthWindow(today());const categories=[...new Set(db.vehicles.map(v=>v.category))].sort().map(cat=>({name:cat,count:db.vehicles.filter(v=>v.category===cat).length}));const max=Math.max(...categories.map(x=>x.count),1);
 const completed=db.bookings.filter(b=>b.status==='completed');const lifetime=completed.reduce((s,b)=>s+b.total,0);
 return pageHead('Business analytics','Data-driven insights into performance, operations and demand.',btn('Download CSV','export','export'))+notice()+`<div class="stats">${stat('Realized revenue',formatMoney(lifetime),'money','#3075df','All completed demo rentals')}${stat('This month',formatMoney(m.revenue),'chart','#16a383',window.label)}${stat('Fleet utilization',`${m.utilization}%`,'trend','#a275dc','Overlapping days counted once')}${stat('Completed bookings',completed.length,'shield','#e4a149','Historic demo rentals')}</div><div class="analytics-grid"><section class="panel"><div class="panel-head"><div><h2>Completed rental revenue</h2><p>Monthly historical performance</p></div></div><div class="chart-area">${plotRevenue()}</div></section><section class="panel"><div class="panel-head"><div><h2>Fleet composition</h2><p>Vehicles grouped by segment</p></div></div><div style="padding:10px 24px 30px">${categories.map(c=>`<div class="category-bar"><span class="category-label">${h(c.name)}</span><div class="meter"><span style="width:${c.count/max*100}%"></span></div><span class="category-amount">${c.count}</span></div>`).join('')}<p style="font-size:11px;color:#91a0b3;line-height:1.8;margin-top:28px">Calculation: vehicle utilization = uniquely booked rental-days divided by available fleet-days in the current month. Demo bookings are generated relative to today's date.</p></div></section></div>`;
}
function renderPage(){const content={overview:renderOverview,bookings:renderBookings,fleet:renderFleet,customers:renderCustomers,analytics:renderAnalytics}[page]();document.querySelector('#workspace').innerHTML=content+`<footer class="footer"><span>© KODYRA · Working frontend demonstration, not a live rental business.</span><span><button class="link-button" data-action="backup">Backup JSON</button> &nbsp;·&nbsp; <button class="link-button" data-action="reset">Reset demo data</button> &nbsp;·&nbsp; <a href="https://github.com/Elghouali" target="_blank" rel="noopener noreferrer">GitHub ${icon('arrow')}</a></span></footer>`;
 document.querySelectorAll('.navitem').forEach(n=>{n.classList.toggle('active',n.dataset.page===page);if(n.dataset.page===page)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});document.querySelector('#crumb').textContent=page==='bookings'?'Reservations':titleCase(page);}
function showToast(message){document.querySelector('#toast-root').innerHTML=`<div class="toast" role="status">${h(message)}</div>`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>document.querySelector('#toast-root').replaceChildren(),3500);}
function save(){if(!saveData(db))showToast('Storage unavailable. Changes will reset when this tab closes.');}
function modal(title,body,footer){openModal=title;document.querySelector('#modal-root').innerHTML=`<div class="modal-backdrop" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="modal-header"><h2>${h(title)}</h2><button class="close-btn" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body">${body}</div><div class="modal-footer">${footer}</div></div></div>`;document.querySelector('.modal input,.modal select')?.focus();}
const field=(label,name,content)=>`<div class="field"><label for="f-${name}">${label}</label>${content}</div>`;
function newBookingModal(vehicleId='', pickupDay=''){
 const vehicles=db.vehicles.filter(v=>v.status!=='maintenance');if(!vehicles.length){showToast('No rentable vehicles.');return;}
 const pick=pickupDay || offsetDay(today(),1),drop=offsetDay(pick,3);
 const v=vehicles.find(v=>v.id===vehicleId)||vehicles[0];
 const body=`<form id="booking-form"><div class="form-row">${field('Customer','customer',`<select id="f-customer" name="customer" required>${db.customers.map(c=>`<option value="${h(c.id)}">${h(c.name)}</option>`).join('')}</select>`)}${field('Vehicle','vehicle',`<select id="f-vehicle" name="vehicle" required>${vehicles.map(v=>`<option value="${h(v.id)}" ${v.id===vehicleId?'selected':''}>${h(v.make)} ${h(v.model)} — ${formatMoney(v.dayRate)}/day</option>`).join('')}</select>`)}</div><div class="form-row">${field('Pick-up date','pickup',`<input id="f-pickup" type="date" name="pickup" min="${today()}" value="${pick}" required />`)}${field('Drop-off date','dropoff',`<input id="f-dropoff" type="date" name="dropoff" min="${offsetDay(today(),1)}" value="${drop}" required />`)}</div><div class="field"><label>Extras</label><div class="checkrow"><label><input type="checkbox" name="gps" /> GPS · 40 MAD/day</label><label><input type="checkbox" name="childSeat" /> Child seat · 25 MAD/day</label><label><input type="checkbox" name="delivery" /> Delivery · 150 MAD</label></div></div><div id="booking-error" aria-live="polite"></div><div class="quote-box"><div class="quote-total"><span>Estimated rental total</span><strong id="quote-total">${formatMoney(quoteRental(v,pick,drop).total)}</strong></div><small id="quote-details">3 rental days · No taxes, insurance, or deposit included · Availability checked at confirmation</small></div></form>`;
 modal('Create reservation',body,`<button class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" form="booking-form">${icon('check')} Confirm booking</button>`);
 updateQuote();
}
function updateQuote(){const form=document.querySelector('#booking-form');if(!form)return;const fd=new FormData(form);const vehicle=vehicleById(fd.get('vehicle'));const options={gps:fd.has('gps'),childSeat:fd.has('childSeat'),delivery:fd.has('delivery')};const total=document.querySelector('#quote-total'),detail=document.querySelector('#quote-details'),error=document.querySelector('#booking-error');
 try{const pickup=String(fd.get('pickup')),dropoff=String(fd.get('dropoff'));const quote=quoteRental(vehicle,pickup,dropoff,options);const conflict=hasBookingConflict(db.bookings,vehicle.id,pickup,dropoff);total.textContent=formatMoney(quote.total);detail.textContent=`${quote.days} rental days · ${formatMoney(vehicle.dayRate)} per day · Extras: ${formatMoney(quote.total-quote.base)} · Excludes deposit, taxes and insurance`;error.innerHTML=conflict?'<div class="error">Vehicle already reserved during the selected dates. Choose another vehicle or dates.</div>':'';}catch(e){total.textContent='—';detail.textContent='Choose valid rental dates.';error.innerHTML=`<div class="error">${h(e.message)}</div>`;}
}
function newVehicleModal(){modal('Add a vehicle',`<form id="vehicle-form"><div class="form-row">${field('Make','make','<input id="f-make" name="make" maxlength="35" required placeholder="e.g. Toyota"/>')}${field('Model','model','<input id="f-model" name="model" maxlength="35" required placeholder="e.g. Corolla"/>')}</div><div class="form-row">${field('License plate','plate','<input id="f-plate" name="plate" maxlength="18" required placeholder="e.g. CX-1234"/>')}${field('Daily rate (MAD)','rate','<input id="f-rate" name="rate" type="number" min="1" max="50000" required value="350"/>')}</div>${field('Category','category',`<select id="f-category" name="category"><option>Economy</option><option>SUV</option><option>Premium</option><option>Luxury</option></select>`)}<div id="vehicle-error"></div></form>`,`<button class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" form="vehicle-form" type="submit">${icon('plus')} Add vehicle</button>`)}
function newCustomerModal(){modal('Add a customer',`<form id="customer-form">${field('Full name','name','<input id="f-name" name="name" maxlength="65" autocomplete="name" required placeholder="e.g. Samir Haddad"/>')}${field('Email address','email','<input id="f-email" name="email" type="email" maxlength="120" required placeholder="name@example.com"/>')}${field('Phone','phone','<input id="f-phone" name="phone" maxlength="32" required placeholder="+212 ..."/>')}<div id="customer-error"></div></form>`,`<button class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" form="customer-form" type="submit">${icon('plus')} Add customer</button>`)}
function closeModal(){openModal='';document.querySelector('#modal-root').replaceChildren();}
function download(text,filename,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function route(target){page=target;search='';statusFilter='all';fleetFilter='all';document.querySelector('#sidebar').classList.remove('open');renderPage();window.scrollTo({top:0,behavior:'instant'});}
document.addEventListener('click',event=>{
 const nav=event.target.closest('[data-page]');if(nav){route(nav.dataset.page);return;}
 const a=event.target.closest('[data-action]');if(!a)return;
 const action=a.dataset.action;
 if(action==='menu'){document.querySelector('#sidebar').classList.toggle('open');return;}
 if(action==='new-booking'){newBookingModal(a.dataset.id, a.dataset.date);return;}
 if(action==='new-vehicle'){newVehicleModal();return;}
 if(action==='new-customer'){newCustomerModal();return;}
 if(action==='close-modal'){closeModal();return;}
 if(action==='export'){download('\uFEFF'+bookingCsv(db),'kodyra-fleetops-bookings.csv','text/csv;charset=utf-8');showToast('CSV downloaded.');return;}
 if(action==='backup'){download(JSON.stringify(db,null,2),'kodyra-fleetops-backup.json','application/json');showToast('JSON backup downloaded.');return;}
 if(action==='reset'){if(window.confirm('Reset all changes to the original fictional demo data?')){db=resetData();route('overview');showToast('Demo data restored.');}return;}
 if(action==='toggle-maintenance'){const v=vehicleById(a.dataset.id);if(!v)return;if(v.status!=='maintenance'&&db.bookings.some(b=>b.vehicleId===v.id&&b.status==='active'&&b.pickup<=today()&&b.dropoff>today())){showToast('Cannot place an active rental into maintenance.');return;}v.status=v.status==='maintenance'?'ready':'maintenance';save();renderPage();showToast(v.status==='maintenance'?'Vehicle marked for maintenance.':'Vehicle returned to service.');return;}
 if(action==='cancel'){const b=db.bookings.find(b=>b.id===a.dataset.id);if(!b)return;if(!window.confirm(`Cancel reservation ${b.id}?`))return;try{db.bookings=updateBookingStatus(db.bookings,b.id,'cancelled');save();renderPage();showToast('Reservation cancelled.');}catch(e){showToast(e.message);}return;}
 if(action==='advance'){const b=db.bookings.find(b=>b.id===a.dataset.id);if(!b)return;const next={pending:'confirmed',confirmed:'active',active:'completed'}[b.status];if(!next)return;const verb=next==='active'?'start this rental':next==='completed'?'complete this rental':'confirm this booking';if(!window.confirm(`Are you sure you want to ${verb}?`))return;try{db.bookings=updateBookingStatus(db.bookings,b.id,next);save();renderPage();showToast(`Reservation ${b.id} updated to ${next}.`);}catch(e){showToast(e.message);}return;}
});
document.addEventListener('input',e=>{if(e.target.closest('#booking-form')){updateQuote();return;}if(['booking-search','fleet-search','customer-search'].includes(e.target.id)){search=e.target.value;const cursor=e.target.selectionStart;renderPage();const replacement=document.getElementById(e.target.id);replacement?.focus();replacement?.setSelectionRange(cursor,cursor);}});
document.addEventListener('change',e=>{if(e.target.id==='status-filter'){statusFilter=e.target.value;renderPage();}if(e.target.id==='fleet-filter'){fleetFilter=e.target.value;renderPage();}if(e.target.closest('#booking-form'))updateQuote();});
document.addEventListener('submit',e=>{
 if(e.target.id==='booking-form'){
  e.preventDefault();const f=new FormData(e.target);const request={customerId:String(f.get('customer')),vehicleId:String(f.get('vehicle')),pickup:String(f.get('pickup')),dropoff:String(f.get('dropoff')),options:{gps:f.has('gps'),childSeat:f.has('childSeat'),delivery:f.has('delivery')}};
  try{const booking=generateBooking(request,db,today(),demoId);db.bookings.unshift(booking);save();closeModal();route('bookings');showToast(`Reservation ${booking.id.slice(0,8)} created successfully.`);}catch(err){document.querySelector('#booking-error').innerHTML=`<div class="error">${h(err.message)}</div>`;}return;
 }
 if(e.target.id==='vehicle-form'){
  e.preventDefault();const f=new FormData(e.target),make=String(f.get('make')).trim(),model=String(f.get('model')).trim(),plate=String(f.get('plate')).trim().toUpperCase(),rate=Number(f.get('rate'));
  if(!make||!model||!plate||!(rate>0&&rate<=50000)){document.querySelector('#vehicle-error').innerHTML='<div class="error">Complete all vehicle fields with a valid daily rate.</div>';return;}
  if(db.vehicles.some(v=>v.plate.toUpperCase()===plate)){document.querySelector('#vehicle-error').innerHTML='<div class="error">A vehicle with this license plate already exists.</div>';return;}
  db.vehicles.push({id:demoId(),make,model,plate,dayRate:rate,category:String(f.get('category')),status:'ready',tint:'#e6eafa'});save();closeModal();route('fleet');showToast('Vehicle added to the demo fleet.');return;
 }
 if(e.target.id==='customer-form'){
  e.preventDefault();const f=new FormData(e.target),name=String(f.get('name')).trim(),email=String(f.get('email')).trim(),phone=String(f.get('phone')).trim();if(!name||!email||!phone)return;
  if(db.customers.some(c=>c.email.toLowerCase()===email.toLowerCase())){document.querySelector('#customer-error').innerHTML='<div class="error">A customer with this email already exists.</div>';return;}
  db.customers.push({id:demoId(),name,email,phone});save();closeModal();route('customers');showToast('Customer added to the demo workspace.');
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openModal)closeModal();});
renderShell();
