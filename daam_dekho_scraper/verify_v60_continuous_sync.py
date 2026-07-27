import unittest
import os
import sys

# Ensure root import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.product_lifecycle_engine import product_lifecycle_engine
from app.smart_refresh_engine import smart_refresh_engine
from app.event_detection_engine import event_detection_engine
from app.vendor_sync_engine import vendor_sync_engine
from app.offer_decay_engine import offer_decay_engine
from app.catalog_health_engine import catalog_health_engine
from app.continuous_scheduler import continuous_scheduler
from app.product_alert_engine import product_alert_engine
from app.self_healing_engine import self_healing_engine

class TestDaamDekhoV60ContinuousSync(unittest.TestCase):

    def test_01_product_lifecycle_transitions(self):
        res = product_lifecycle_engine.transition_state(1, 'ACTIVE', 'Verified by live PDP')
        self.assertEqual(res["status"], "SUCCESS")

        state = product_lifecycle_engine.get_state(1)
        self.assertEqual(state, 'ACTIVE')

        res_disc = product_lifecycle_engine.transition_state(1, 'DISCONTINUED', 'All vendors stopped selling')
        self.assertEqual(res_disc["status"], "SUCCESS")
        self.assertEqual(product_lifecycle_engine.get_state(1), 'DISCONTINUED')

    def test_02_smart_refresh_intervals(self):
        inv_active = smart_refresh_engine.determine_refresh_interval(price_volatility="NORMAL", lifecycle_state="ACTIVE")
        self.assertEqual(inv_active, 60)

        inv_vol = smart_refresh_engine.determine_refresh_interval(price_volatility="HIGH", lifecycle_state="ACTIVE")
        self.assertEqual(inv_vol, 30)

        inv_disc = smart_refresh_engine.determine_refresh_interval(price_volatility="NORMAL", lifecycle_state="DISCONTINUED")
        self.assertEqual(inv_disc, 10080)

    def test_03_immutable_event_stream(self):
        rec = event_detection_engine.record_event(1, "PRICE_DROP", "39999", "37999", vendor="amazon")
        self.assertEqual(rec["status"], "RECORDED")

        evs = event_detection_engine.get_events(1)
        self.assertGreater(len(evs), 0)
        self.assertEqual(evs[0]["event_type"], "PRICE_DROP")

    def test_04_vendor_sync_health(self):
        vh = vendor_sync_engine.get_vendor_health()
        self.assertIn("amazon", vh)
        self.assertIn("flipkart", vh)

    def test_05_offer_decay_without_deletion(self):
        res = offer_decay_engine.mark_offer_expired(101, "Disappeared from PDP")
        self.assertEqual(res["status"], "EXPIRED")

    def test_06_catalog_freshness_and_health(self):
        score = catalog_health_engine.get_freshness_score(1)
        self.assertGreaterEqual(score, 90)

        summary = catalog_health_engine.get_catalog_health_summary()
        self.assertEqual(summary["overall_health_status"], "OPTIMAL")

    def test_07_continuous_scheduler_lifecycle(self):
        start_res = continuous_scheduler.start_scheduler()
        self.assertIn(start_res["status"], ["STARTED", "ALREADY_RUNNING"])
        self.assertTrue(continuous_scheduler._running)

        stop_res = continuous_scheduler.stop_scheduler()
        self.assertEqual(stop_res["status"], "STOPPED")

    def test_08_product_alerts(self):
        created = product_alert_engine.check_and_create_alert(1, "PRICE_DROP_10PCT", "Price dropped by 12% to Rs. 34,999")
        self.assertEqual(created["status"], "ALERT_CREATED")

        alerts = product_alert_engine.get_active_alerts()
        self.assertGreater(len(alerts), 0)

    def test_09_self_healing_repair_loop(self):
        heal_res = self_healing_engine.run_self_healing_cycle()
        self.assertEqual(heal_res["status"], "SUCCESS")

if __name__ == "__main__":
    unittest.main()
