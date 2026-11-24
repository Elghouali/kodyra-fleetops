# KODYRA FleetOps

**A working engineering showcase for rental-agency operations.** A premium, mobile-responsive, zero-backend demo built with standard browser modules, modern CSS, and pure JavaScript domain rules.

![FleetOps dashboard](assets/desktop-preview.png)

> **This is a portfolio demonstration, not a production rental management system.** Vehicles, bookings, names, addresses, and revenue figures are fictitious. Records live in the visitor's browser (`localStorage`). No payments, real-time synchronization, emails, or actual rental inventory integrations are provided.

## Try it

Run locally using either Python or another static HTTP server:

```bash
python3 -m http.server 4173
```

Open **http://localhost:4173**. It must be served over HTTP (not opened with `file://`) because the application uses ES modules.

No npm installation, database, API keys, container, third-party web service, or paid hosting is needed.

## Functional product features

| Area | Working behavior |
| --- | --- |
| Operations overview | Fictional fleet KPIs, confirmed/active bookings, recent reservations, revenue chart |
| Reservation management | Create a reservation, select customer/vehicle/dates, quote extras, validate overlaps, update booking status |
| Pricing rules | Calendar-day rental rates + opt-in GPS, child seat and delivery charges |
| Fleet | Browse/filter vehicles; add vehicles; mark vehicles under maintenance; prevent maintenance when currently rented |
| Customers | Browse customer records; add a customer; inspect fictional spend and reservation counts |
| Analytics | Revenue of completed rentals, rolling revenue chart, fleet category breakdown, unique booked-day utilization |
| Export | Download bookings as CSV and all demo data as JSON backup |
| Local persistence | Changes persist in this browser; one-click reset recreates sample state |
| Accessibility | Semantic landmarks, button labels, keyboard-accessible forms and feedback |
| Privacy | No requests to analytics, external fonts, images, or APIs; no remote storage |

### Rental booking domain decisions

- A rental interval is **[pick-up date, drop-off date)** (exclusive end). Returning a vehicle on the same date another rental begins is permitted.
- Drop-off must occur after pick-up. New bookings cannot start in the past.
- Pending, confirmed, active, and completed booking intervals occupy the vehicle. Cancelled intervals do not.
- Past completed rental income is recognized in the month of drop-off. Confirmed/active reservations are separate pipeline projections, not earned revenue.
- Utilization calculates uniquely occupied rental-days per vehicle over a month, preventing double-counting of overlapping demo intervals.
- Pricing currently excludes insurance, security deposits, taxes, location and country-specific regulations.
- New bookings begin as `confirmed`. Allowed lifecycle: `pending → confirmed → active → completed`; pending or confirmed reservations can be cancelled. Finalized records are immutable in the UI.

## Offline data engineering extension (Python + SQLite)

The repository also contains a reproducible **ETL and data-quality pipeline** to demonstrate backend/data engineering skills without paying for cloud services.

```bash
node scripts/export-fixtures.mjs
python3 -m data_pipeline.pipeline --input data/demo-snapshot.json --out outputs
python3 -m unittest discover -s tests/python -v
```

The pipeline validates duplicate identifiers, referential integrity, dates, nonnegative amounts and schema versions; then loads a relational SQLite warehouse with **customer and vehicle dimensions plus a booking fact table**. It exposes SQL views for monthly realized revenue and per-vehicle performance, exports CSV reports, and produces a machine-readable data-quality summary. No personal contact details are loaded into the analytical dimensions.

Both the interactive JavaScript dashboard and the Python analytics pipeline operate on **fictional data**. Their snapshots differ by design: the browser seeds relative to the visitor's current date, while the CLI uses a deterministic sample date so reports and tests can be reproduced. The ETL warehouse is a local portfolio example, not a hosted production integration.

## Engineering architecture

```text
index.html                 SPA mount and SEO metadata
styles.css                 Responsive visual system
src/app.js                 Browser UI and event-driven application controller
src/domain.js              Pure booking, pricing, status, analytics and CSV functions
src/demo.js                Deterministic fictitious records relative to browser date
src/storage.js             Local persistence and schema guard
assets/desktop-preview.png  Browser-verified demo screenshot
assets/favicon.svg         Original vector mark
scripts/build.mjs          Zero-dependency build to dist/
tests/domain.test.js       Node built-in test runner
data_pipeline/pipeline.py   Offline Python ETL, SQLite warehouse and CSV reports
data/demo-snapshot.json    Deterministic fictional dataset
tests/python/              Python unittest data-quality cases
.github/workflows/ci.yml  Tests, syntax checks and build on pushes/PRs
_headers                   Deployment security headers for Cloudflare Pages
```

### Test and build

Requires Node 20+ only.

```bash
npm test
npm run check
npm run build
python3 -m unittest discover -s tests/python -v
```

The static site is exported to `dist/`. No `npm install` required.

## Deployment: $0 static hosting

**Cloudflare Pages recommended:**
1. Create an **empty GitHub repository** named `kodyra-fleetops`.
2. Add these project files to the repository and push to `main`.
3. In Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
4. Choose the repository and configure:
   - Framework preset: **None**
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**
   - Root directory: repository root
5. Deploy to the assigned `*.pages.dev` URL. The exact subdomain depends on availability.

**Alternatively:** Cloudflare Pages direct upload using the generated `dist/` directory.

No domain purchase or managed backend is necessary for the demo. Check the hosting provider's current limits and terms before relying on free service commercially.

## Production roadmap

This product is intentionally a *working demonstration* rather than a production SaaS. Before deploying for real clients, prioritize:
1. Server-side user authentication, permissions, audit history, managed database and transactional booking guarantees.
2. Handling same-day pick-up/drop-off **times** and country-specific pricing, insurance and taxes.
3. Server-authoritative collision prevention with database exclusion constraints or serializable transactions.
4. Secure payments, customer privacy controls, backups, GDPR/local compliance and verified notifications.
5. End-to-end integration tests, monitoring, production deployment and support.

**Do not store actual personal information in this demo.** Browser storage is not encrypted or access controlled.

## Built by KODYRA

A flagship software + data engineering portfolio example for [KODYRA](https://github.com/Elghouali). Contact: elghoualizakariae@gmail.com.

*No real client outcomes or production deployments are claimed.*

## Vehicle profiles for agency discovery

FleetOps now provides illustrative vehicle images, plausible **fictional** model-year/mileage/fuel/gearbox details, a vehicle detail view, maintenance actions, and a direct route to a reservation. The demo is designed to support a discovery conversation about real agency workflows; it is **not** evidence that any particular rental vehicle or customer exists. For the ten original fictional vehicles, we now display **real photographs of representative car models** from Wikimedia Commons (CC0), with source links documented in [Vehicle Photography](docs/VEHICLE_PHOTOGRAPHY.md). They are **not photographs of the fictional inventory**, and their color, trim and model year may differ. The actual JPEG files are bundled with the application and served from the same origin, eliminating external image redirects. If an asset fails to load or a new vehicle is added, a lightweight placeholder illustration appears.

The detail fields are optional for previously saved browser demo data, while seeded vehicles contain complete examples. The app continues to store data locally in the browser; a production multi-user system needs authentication, shared storage, backup, auditability, security testing and deployment support.
