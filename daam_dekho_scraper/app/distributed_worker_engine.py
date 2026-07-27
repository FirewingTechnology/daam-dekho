import threading
import time
import psutil
from app.crawl_session_manager import crawl_session_manager
from app.crawl_queue_manager import crawl_queue_manager
from app.candidate_cache import candidate_cache
from app.pdp_verifier import pdp_verifier
from app.intelligent_stop_engine import intelligent_stop_engine
from app.logger import get_logger

logger = get_logger("distributed_worker_engine")

class DistributedWorkerEngine:
    """Enterprise Parallel Vendor Worker Engine."""

    def __init__(self):
        self.active_workers = {}
        self.stop_event = threading.Event()

    def start_distributed_crawl(self, session_info: dict, scraper_pipeline):
        session_uuid = session_info["session_uuid"]
        vendors = session_info.get("vendors") or ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales']
        query = session_info.get("brand") or session_info.get("category") or "Samsung"
        max_pages = session_info.get("max_pages", 3)
        max_products = session_info.get("max_products", 50)
        category = session_info.get("category", "Mobiles")

        self.stop_event.clear()

        def worker_thread_func(vendor_name):
            worker_id = f"WRK-{vendor_name.upper()}-{session_uuid[:6]}"
            self.active_workers[vendor_name] = worker_id
            logger.info(f"🚀 Worker {worker_id} launched for vendor '{vendor_name}'")

            items_found = 0
            accepted = 0
            rejected = 0
            duplicates = 0
            pages_done = 0

            try:
                if vendor_name in scraper_pipeline.scrapers:
                    scraper = scraper_pipeline.scrapers[vendor_name]
                    
                    for page in range(1, max_pages + 1):
                        if self.stop_event.is_set():
                            logger.info(f"Worker {worker_id} stopping on admin signal.")
                            break

                        # Update Heartbeat
                        proc = psutil.Process()
                        mem_mb = round(proc.memory_info().rss / (1024 * 1024), 2)
                        cpu_pct = proc.cpu_percent()

                        crawl_session_manager.update_worker_heartbeat(
                            worker_id=worker_id,
                            session_uuid=session_uuid,
                            vendor_name=vendor_name,
                            status="CRAWLING",
                            page=page,
                            total_pages=max_pages,
                            items=items_found,
                            accepted=accepted,
                            rejected=rejected,
                            duplicates=duplicates,
                            stage=f"Scanning Page {page}",
                            memory=mem_mb,
                            cpu=cpu_pct
                        )

                        # Crawl Page
                        try:
                            raw_items = scraper.scrape(query, category=category, max_pages=1, max_results=max_products) or []
                        except Exception:
                            raw_items = scraper.scrape(query, category=category) or []

                        items_found += len(raw_items)
                        pages_done += 1

                        for item in raw_items:
                            u = item.get('product_link') or item.get('url')
                            if not u:
                                continue

                            crawl_queue_manager.push("candidate", item)

                            if candidate_cache.is_seen(u):
                                duplicates += 1
                                continue

                            candidate_cache.mark_seen(u, vendor=vendor_name)
                            crawl_queue_manager.push("pdp", item)

                            # Verify PDP
                            is_valid, conf, reason = pdp_verifier.verify_candidate(item)
                            if is_valid:
                                accepted += 1
                                crawl_queue_manager.push("save", item)
                            else:
                                rejected += 1

                            crawl_queue_manager.mark_completed()

                        # Evaluate Stop Rules
                        should_stop, reason = intelligent_stop_engine.should_stop(
                            current_page=page,
                            max_pages=max_pages,
                            items_found=items_found,
                            duplicate_count=duplicates
                        )

                        if should_stop:
                            logger.info(f"Worker {worker_id} stopping: {reason}")
                            break

                        time.sleep(1)

            except Exception as e:
                logger.error(f"Worker {worker_id} crashed: {e}")
            finally:
                crawl_session_manager.update_worker_heartbeat(
                    worker_id=worker_id,
                    session_uuid=session_uuid,
                    vendor_name=vendor_name,
                    status="COMPLETED",
                    page=pages_done,
                    total_pages=max_pages,
                    items=items_found,
                    accepted=accepted,
                    rejected=rejected,
                    duplicates=duplicates,
                    stage="Done"
                )

        threads = []
        for v in vendors:
            t = threading.Thread(target=worker_thread_func, args=(v,), daemon=True)
            threads.append(t)
            t.start()

        return self.active_workers

    def stop_all(self):
        self.stop_event.set()
        logger.info("Signaled all distributed worker threads to stop.")

distributed_worker_engine = DistributedWorkerEngine()
