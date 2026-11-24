import copy
import json
import tempfile
import unittest
from pathlib import Path

from data_pipeline.pipeline import QualityError, run_pipeline, validate


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot = json.loads(Path('data/demo-snapshot.json').read_text(encoding='utf-8'))

    def test_valid_seed(self):
        summary=validate(self.snapshot)
        self.assertGreater(summary['bookings'], 20)
        self.assertEqual(summary['vehicles'], 10)

    def test_duplicate_id_is_rejected(self):
        data=copy.deepcopy(self.snapshot)
        data['bookings'].append(copy.deepcopy(data['bookings'][0]))
        with self.assertRaisesRegex(QualityError,'Duplicate bookings IDs'): validate(data)

    def test_unknown_vehicle_is_rejected(self):
        data=copy.deepcopy(self.snapshot)
        data['bookings'][0]['vehicleId']='NOT_A_VEHICLE'
        with self.assertRaisesRegex(QualityError,'Unknown vehicle'): validate(data)

    def test_invalid_date_is_rejected(self):
        data=copy.deepcopy(self.snapshot)
        data['bookings'][0]['dropoff']=data['bookings'][0]['pickup']
        with self.assertRaisesRegex(QualityError,'Non-positive duration'): validate(data)

    def test_pipeline_exports_query_results_and_warehouse(self):
        with tempfile.TemporaryDirectory() as temp:
            result=run_pipeline(Path('data/demo-snapshot.json'),Path(temp))
            self.assertEqual(result['status'],'pass')
            self.assertEqual(result['warehouse_fact_rows'],len(self.snapshot['bookings']))
            self.assertTrue((Path(temp)/'monthly_revenue.csv').exists())
            self.assertTrue((Path(temp)/'fleet_performance.csv').exists())
            self.assertTrue((Path(temp)/'quality_report.json').exists())
            self.assertTrue((Path(temp)/'fleetops_warehouse.sqlite').exists())

if __name__=='__main__': unittest.main()
