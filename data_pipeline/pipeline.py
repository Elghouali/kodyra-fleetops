"""Local FleetOps ETL: JSON extract -> validated relational model -> SQL marts.

No third-party Python dependencies, secrets, cloud services, or external data.
This pipeline is an illustrative, reproducible engineering sample.
"""
import argparse
import csv
import json
import sqlite3
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any


class QualityError(ValueError):
    """Raised when input data fails a required integrity rule."""


def validate(raw: dict[str, Any]) -> dict[str, int]:
    if not isinstance(raw, dict) or raw.get("version") != 1:
        raise QualityError("Unsupported snapshot schema version")
    for name in ("vehicles", "customers", "bookings"):
        if not isinstance(raw.get(name), list):
            raise QualityError(f"Missing or invalid collection: {name}")
        ids = [row.get("id") for row in raw[name]]
        if any(not isinstance(v, str) or not v for v in ids):
            raise QualityError(f"Missing {name} ID")
        if len(set(ids)) != len(ids):
            raise QualityError(f"Duplicate {name} IDs")

    vehicle_ids = {v["id"] for v in raw["vehicles"]}
    customer_ids = {c["id"] for c in raw["customers"]}
    for vehicle in raw["vehicles"]:
        if not isinstance(vehicle.get("dayRate"), (int, float)) or vehicle["dayRate"] < 0:
            raise QualityError(f"Invalid rate for {vehicle['id']}")
    for booking in raw["bookings"]:
        if booking.get("vehicleId") not in vehicle_ids:
            raise QualityError(f"Unknown vehicle in booking {booking['id']}")
        if booking.get("customerId") not in customer_ids:
            raise QualityError(f"Unknown customer in booking {booking['id']}")
        if booking.get("status") not in {"pending", "confirmed", "active", "completed", "cancelled"}:
            raise QualityError(f"Invalid booking status {booking['id']}")
        try:
            pickup = date.fromisoformat(booking["pickup"])
            dropoff = date.fromisoformat(booking["dropoff"])
        except (TypeError, ValueError, KeyError) as exc:
            raise QualityError(f"Invalid date for booking {booking['id']}") from exc
        if dropoff <= pickup:
            raise QualityError(f"Non-positive duration for booking {booking['id']}")
        if not isinstance(booking.get("total"), (int, float)) or booking["total"] < 0:
            raise QualityError(f"Invalid total for booking {booking['id']}")
    return {"vehicles": len(vehicle_ids), "customers": len(customer_ids), "bookings": len(raw["bookings"])}


def initialize(conn: sqlite3.Connection) -> None:
    conn.executescript("""
      PRAGMA foreign_keys=ON;
      CREATE TABLE dim_vehicle (
        vehicle_id TEXT PRIMARY KEY, make TEXT NOT NULL, model TEXT NOT NULL,
        category TEXT NOT NULL, plate TEXT NOT NULL UNIQUE, daily_rate REAL NOT NULL);
      CREATE TABLE dim_customer (
        customer_id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE fact_booking (
        booking_id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL REFERENCES dim_vehicle(vehicle_id),
        customer_id TEXT NOT NULL REFERENCES dim_customer(customer_id),
        pickup_date TEXT NOT NULL, dropoff_date TEXT NOT NULL,
        rental_days INTEGER NOT NULL CHECK(rental_days > 0),
        status TEXT NOT NULL, total_mad REAL NOT NULL CHECK(total_mad >= 0));
      CREATE INDEX idx_fact_booking_dropoff_status ON fact_booking(dropoff_date, status);
      CREATE INDEX idx_fact_booking_vehicle_dates ON fact_booking(vehicle_id, pickup_date, dropoff_date);
      CREATE VIEW mart_monthly_revenue AS
        SELECT substr(dropoff_date,1,7) AS revenue_month,
               count(*) AS completed_bookings,
               round(sum(total_mad),2) AS recognized_revenue_mad
        FROM fact_booking
        WHERE status = 'completed'
        GROUP BY substr(dropoff_date,1,7);
      CREATE VIEW mart_vehicle_performance AS
        SELECT v.vehicle_id, v.make || ' ' || v.model AS vehicle,
               v.category, count(b.booking_id) AS completed_rentals,
               coalesce(sum(b.total_mad),0) AS recognized_revenue_mad,
               coalesce(sum(b.rental_days),0) AS completed_rental_days
        FROM dim_vehicle v
        LEFT JOIN fact_booking b ON b.vehicle_id=v.vehicle_id AND b.status='completed'
        GROUP BY v.vehicle_id;
    """)


def load(conn: sqlite3.Connection, raw: dict[str, Any]) -> None:
    with conn:
        conn.executemany(
            "INSERT INTO dim_vehicle VALUES (?,?,?,?,?,?)",
            [(v["id"],v["make"],v["model"],v["category"],v["plate"],v["dayRate"]) for v in raw["vehicles"]],
        )
        # Customer emails and phone numbers are intentionally omitted from analytics marts.
        conn.executemany("INSERT INTO dim_customer VALUES (?,?)", [(c["id"],c["name"]) for c in raw["customers"]])
        conn.executemany(
            "INSERT INTO fact_booking VALUES (?,?,?,?,?,?,?,?)",
            [(b["id"], b["vehicleId"], b["customerId"], b["pickup"], b["dropoff"],
              (date.fromisoformat(b["dropoff"]) - date.fromisoformat(b["pickup"])).days,
              b["status"], b["total"]) for b in raw["bookings"]],
        )


def csv_from_query(conn: sqlite3.Connection, query: str, output: Path) -> int:
    cursor = conn.execute(query)
    rows = cursor.fetchall()
    with output.open('w', encoding='utf-8', newline='') as f:
        writer=csv.writer(f)
        writer.writerow([d[0] for d in cursor.description])
        writer.writerows(rows)
    return len(rows)


def run_pipeline(input_path: Path, output_dir: Path) -> dict:
    raw = json.loads(input_path.read_text(encoding='utf-8'))
    counts = validate(raw)
    output_dir.mkdir(parents=True, exist_ok=True)
    dbpath = output_dir / 'fleetops_warehouse.sqlite'
    if dbpath.exists(): dbpath.unlink()
    conn = sqlite3.connect(dbpath)
    try:
        initialize(conn)
        load(conn, raw)
        monthly = csv_from_query(conn, 'SELECT * FROM mart_monthly_revenue ORDER BY revenue_month', output_dir/'monthly_revenue.csv')
        fleet = csv_from_query(conn, 'SELECT * FROM mart_vehicle_performance ORDER BY recognized_revenue_mad DESC', output_dir/'fleet_performance.csv')
        fk = conn.execute('PRAGMA foreign_key_check').fetchall()
        if fk: raise QualityError(f'Foreign key violations: {len(fk)}')
        verified_bookings = conn.execute('SELECT count(*) FROM fact_booking').fetchone()[0]
        if verified_bookings != counts['bookings']: raise QualityError('Fact booking row count mismatch')
        quality = {
            'status': 'pass',
            'snapshot_date': raw.get('seededAt'),
            'source_row_counts': counts,
            'warehouse_fact_rows': verified_bookings,
            'foreign_key_violations': len(fk),
            'monthly_report_rows': monthly,
            'fleet_report_rows': fleet,
            'pipeline_note': 'Fictional data. No real business records or customer contacts are used.'
        }
        (output_dir/'quality_report.json').write_text(json.dumps(quality,indent=2)+'\n',encoding='utf-8')
        return quality
    finally:
        conn.close()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,default=Path('data/demo-snapshot.json'))
    parser.add_argument('--out',type=Path,default=Path('outputs'))
    args=parser.parse_args()
    result=run_pipeline(args.input,args.out)
    print(json.dumps(result,indent=2))

if __name__=='__main__':
    main()
