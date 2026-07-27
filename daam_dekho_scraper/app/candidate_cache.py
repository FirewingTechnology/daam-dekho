import hashlib
import sqlite3
from app.database.manager import DatabaseManager
from app.logger import get_logger

logger = get_logger("candidate_cache")

class CandidateCache:
    """High-Speed Candidate Cache to prevent duplicate PDP processing."""

    def __init__(self, db_manager=None):
        self.db = db_manager or DatabaseManager()
        self._mem_cache = set()
        self._load_cache()

    def _load_cache(self):
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT url_hash FROM candidate_cache")
            rows = cursor.fetchall()
            for r in rows:
                self._mem_cache.add(r[0])
            conn.close()
            logger.info(f"Loaded {len(self._mem_cache)} cached candidate URL hashes into memory.")
        except Exception as e:
            logger.error(f"Failed to load candidate cache: {e}")

    def hash_url(self, url: str) -> str:
        clean_u = url.split('?')[0].rstrip('/').lower()
        return hashlib.sha256(clean_u.encode('utf-8')).hexdigest()

    def is_seen(self, url: str, sku: str = None, canonical_url: str = None) -> bool:
        u_hash = self.hash_url(url)
        if u_hash in self._mem_cache:
            return True
        return False

    def mark_seen(self, url: str, vendor: str, sku: str = None, canonical_url: str = None, product_hash: str = None):
        u_hash = self.hash_url(url)
        self._mem_cache.add(u_hash)

        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO candidate_cache (url_hash, url, vendor, sku, canonical_url, product_hash)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(url_hash) DO NOTHING
            ''', (u_hash, url, vendor, sku or '', canonical_url or '', product_hash or ''))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error marking candidate URL seen in DB: {e}")

candidate_cache = CandidateCache()
