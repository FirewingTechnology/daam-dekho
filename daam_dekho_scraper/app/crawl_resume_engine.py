from app.crawl_session_manager import crawl_session_manager
from app.logger import get_logger

logger = get_logger("crawl_resume_engine")

class CrawlResumeEngine:
    """Resume Engine — Restores Crawl State from Resume Tokens."""

    def resume_from_token(self, resume_token: str) -> dict:
        conn = crawl_session_manager.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT session_uuid FROM crawl_sessions WHERE resume_token = ?", (resume_token,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            logger.error(f"Invalid or expired resume token: {resume_token}")
            return {"status": "ERROR", "message": "Resume token not found"}

        session_uuid = row[0]
        session_info = crawl_session_manager.get_session(session_uuid)
        
        # Resume state: continue from last page
        last_page = session_info.get("pages_crawled", 1) + 1
        logger.info(f"Resuming Session {session_uuid} from Page {last_page} using token {resume_token}")

        crawl_session_manager.update_session_progress(session_uuid, status="RESUMED")

        return {
            "status": "SUCCESS",
            "session_uuid": session_uuid,
            "resume_from_page": last_page,
            "session_info": session_info
        }

crawl_resume_engine = CrawlResumeEngine()
