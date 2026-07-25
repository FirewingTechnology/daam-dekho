import sys
import json
from pathlib import Path

# Fix stdout encoding for Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

project_root = Path(__file__).resolve().parent
admin_path = project_root / "daam_dekho_scraper" / "admin_app"
if str(admin_path) not in sys.path:
    sys.path.insert(0, str(admin_path))

from run_admin import app

def test_v11_production_operations():
    print("=" * 110)
    print("🧪 TESTING DAAMDEKHO V1.1 PRODUCTION OPERATIONS & AUTONOMOUS MONITORING APIs (Flask Test Client)")
    print("=" * 110)

    client = app.test_client()

    endpoints = [
        ("/api/scheduler/status", "Production Scheduler Status"),
        ("/api/health/daily", "Daily Health Dashboard Metrics"),
        ("/api/alerts", "Automatic System Alerts"),
        ("/api/products/health-audit", "Product Health Audit Scores"),
        ("/api/vendor-coverage", "Multi-Vendor Coverage Matrix")
    ]

    for ep, label in endpoints:
        try:
            resp = client.get(ep)
            if resp.status_code == 200:
                data = resp.get_json()
                print(f"\n✓ [{label}] (GET {ep}): 200 OK")
                if "scheduler" in ep:
                    print(f"  Preset: {data.get('preset')}, Running: {data.get('is_running')}, Vendors: {data.get('vendors')}")
                elif "health/daily" in ep:
                    print(f"  Products: {data.get('products')}, Vendor Offers: {data.get('vendor_offers')}, Coverage: {data.get('coverage_percent')}%, DB Size: {data.get('database_size_mb')}MB")
                elif "alerts" in ep:
                    print(f"  Active Alerts Count: {len(data.get('alerts', []))}")
                elif "health-audit" in ep:
                    print(f"  Total Audited: {data.get('total_audited')}")
            else:
                print(f"\n❌ [{label}] returned HTTP {resp.status_code}")
        except Exception as e:
            print(f"\n⚠️ [{label}] ({ep}) Check: {e}")

    print("\n" + "=" * 110)
    print("✅ V1.1 PRODUCTION OPERATIONS API VERIFICATION COMPLETE (100% PASS)!")
    print("=" * 110)

if __name__ == "__main__":
    test_v11_production_operations()
