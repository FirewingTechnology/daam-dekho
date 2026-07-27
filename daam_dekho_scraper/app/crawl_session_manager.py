import uuid
import json
import sqlite3
from datetime import datetime
from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("crawl_session_manager")

class CrawlSessionManager:
    """Enterprise Distributed Crawl Session Manager with Resume Tokens and Heartbeats."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()

    def create_session(self, discovery_mode, brand=None, category=None, vendors=None, max_pages=3, max_products=50):
        session_uuid = f"CS-{uuid.uuid4().hex[:12].upper()}"
        resume_token = f"TOKEN-{uuid.uuid4().hex[:16].upper()}"
        vendors_str = json.dumps(vendors or ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'])

        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO crawl_sessions (
                session_uuid, discovery_mode, brand, category, vendors, status, resume_token, max_pages, max_products
            ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
        ''', (session_uuid, discovery_mode, brand or '', category or 'Mobiles', vendors_str, resume_token, max_pages, max_products))
        conn.commit()
        conn.close()

        logger.info(f"Created Crawl Session {session_uuid} [Mode: {discovery_mode}] with Resume Token: {resume_token}")
        return {
            "session_uuid": session_uuid,
            "resume_token": resume_token,
            "discovery_mode": discovery_mode,
            "brand": brand,
            "category": category,
            "vendors": vendors,
            "max_pages": max_pages,
            "max_products": max_products,
            "status": "ACTIVE"
        }

    def get_session(self, session_uuid):
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM crawl_sessions WHERE session_uuid = ?", (session_uuid,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "session_uuid": row[1],
            "discovery_mode": row[2],
            "brand": row[3],
            "category": row[4],
            "vendors": json.loads(row[5]) if row[5] else [],
            "status": row[6],
            "resume_token": row[7],
            "max_pages": row[8],
            "max_products": row[9],
            "pages_crawled": row[10],
            "products_found": row[11],
            "accepted_count": row[12],
            "rejected_count": row[13],
            "duplicate_count": row[14],
            "master_created": row[15],
            "started_at": row[16],
            "completed_at": row[17]
        }

    def update_session_progress(self, session_uuid, pages=0, found=0, accepted=0, rejected=0, duplicates=0, master=0, status=None):
        conn = self.db.get_connection()
        cursor = conn.cursor()
        if status:
            cursor.execute('''
                UPDATE crawl_sessions 
                SET pages_crawled = pages_crawled + ?,
                    products_found = products_found + ?,
                    accepted_count = accepted_count + ?,
                    rejected_count = rejected_count + ?,
                    duplicate_count = duplicate_count + ?,
                    master_created = master_created + ?,
                    status = ?,
                    completed_at = CASE WHEN ? IN ('COMPLETED', 'STOPPED', 'FAILED') THEN CURRENT_TIMESTAMP ELSE completed_at END
                WHERE session_uuid = ?
            ''', (pages, found, accepted, rejected, duplicates, master, status, status, session_uuid))
        else:
            cursor.execute('''
                UPDATE crawl_sessions 
                SET pages_crawled = pages_crawled + ?,
                    products_found = products_found + ?,
                    accepted_count = accepted_count + ?,
                    rejected_count = rejected_count + ?,
                    duplicate_count = duplicate_count + ?,
                    master_created = master_created + ?
                WHERE session_uuid = ?
            ''', (pages, found, accepted, rejected, duplicates, master, session_uuid))
        conn.commit()
        conn.close()

    def update_worker_heartbeat(self, worker_id, session_uuid, vendor_name, status, page=1, total_pages=1, items=0, accepted=0, rejected=0, duplicates=0, stage="Scanning", memory=0.0, cpu=0.0):
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO crawl_workers (
                worker_id, session_uuid, vendor_name, status, current_page, total_pages,
                items_found, accepted, rejected, duplicates, current_stage, memory_mb, cpu_percent, last_heartbeat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(worker_id) DO UPDATE SET
                status=excluded.status,
                current_page=excluded.current_page,
                total_pages=excluded.total_pages,
                items_found=excluded.items_found,
                accepted=excluded.accepted,
                rejected=excluded.rejected,
                duplicates=excluded.duplicates,
                current_stage=excluded.current_stage,
                memory_mb=excluded.memory_mb,
                cpu_percent=excluded.cpu_percent,
                last_heartbeat=CURRENT_TIMESTAMP
        ''', (worker_id, session_uuid, vendor_name, status, page, total_pages, items, accepted, rejected, duplicates, stage, memory, cpu))
        conn.commit()
        conn.close()

crawl_session_manager = CrawlSessionManager()
