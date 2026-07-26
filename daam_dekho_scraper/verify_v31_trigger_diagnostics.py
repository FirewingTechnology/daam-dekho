import unittest
from app.trigger_diagnostics import trigger_diagnostics
from app.database_diagnostics import database_diagnostics
from app.health_checker import health_checker
from app.auto_recovery_engine import auto_recovery_engine

class TestV31TriggerDiagnostics(unittest.TestCase):

    def test_request_id_and_tracing(self):
        """Verify standardized Request ID generation and stage tracing."""
        req_id = trigger_diagnostics.generate_request_id()
        self.assertTrue(req_id.startswith("SCR-"))

        trace = trigger_diagnostics.trace_stage(req_id, "TEST_STAGE", status="SUCCESS")
        self.assertEqual(trace['request_id'], req_id)
        self.assertEqual(trace['stage'], "TEST_STAGE")

        err = trigger_diagnostics.format_error_response(req_id, "FLASK_ROUTE", ValueError("Test exception"))
        self.assertFalse(err['success'])
        self.assertEqual(err['error_type'], "ValueError")

    def test_subprocess_inspection(self):
        """Verify subprocess diagnostic details capture."""
        sub = trigger_diagnostics.inspect_subprocess(["python", "pipeline.py"], ".")
        self.assertIn("executable", sub)
        self.assertEqual(sub['arguments'], ["python", "pipeline.py"])

    def test_database_diagnostics(self):
        """Verify 7-point database diagnostic checks."""
        db_diag = database_diagnostics.diagnose_database()
        self.assertEqual(db_diag['status'], "HEALTHY")
        self.assertTrue(db_diag['file_exists'])
        self.assertTrue(db_diag['connection_opened'])
        self.assertTrue(db_diag['write_permission'])

    def test_preflight_health_checker(self):
        """Verify 10-point pre-flight health checker."""
        health = health_checker.run_preflight_checks()
        self.assertEqual(health['overall_status'], "HEALTHY")
        self.assertEqual(health['total_checks'], 10)

    def test_auto_recovery_engine(self):
        """Verify automatic recovery routines."""
        rec = auto_recovery_engine.recover_database_lock()
        self.assertEqual(rec['status'], "RECOVERED")

if __name__ == '__main__':
    unittest.main()
