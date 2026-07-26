from app.database.manager import db_manager

class DiscoveryPlaybackEngine:
    """Module 11: Discovery Session Replay & Playback Engine."""

    def get_session_replay(self, session_uuid):
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM discovery_sessions WHERE session_uuid = ?", (session_uuid,))
        sess = cursor.fetchone()
        if not sess:
            conn.close()
            return {"status": "error", "message": "Session UUID not found"}

        sess_dict = dict(zip([d[0] for d in cursor.description], sess))
        sid = sess_dict['id']

        cursor.execute("SELECT * FROM vendor_queries WHERE session_id = ?", (sid,))
        v_queries = [dict(zip([d[0] for d in cursor.description], r)) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM rejection_logs WHERE session_id = ?", (sid,))
        rejections = [dict(zip([d[0] for d in cursor.description], r)) for r in cursor.fetchall()]

        conn.close()

        return {
            "session_summary": sess_dict,
            "vendor_queries_executed": v_queries,
            "rejection_audit_trail": rejections,
            "replay_status": "COMPLETED"
        }

discovery_playback = DiscoveryPlaybackEngine()
