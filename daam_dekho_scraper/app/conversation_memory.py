from app.database.manager import db_manager

class ConversationMemoryEngine:
    """Module 6: Conversation Memory Engine."""

    def save_chat_turn(self, session_id, sender, message, metadata=None):
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO ai_chat_history (session_id, sender, message, metadata_json)
            VALUES (?, ?, ?, ?)
        """, (session_id, sender, message, str(metadata or {})))

        conn.commit()
        conn.close()

    def get_history(self, session_id):
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT sender, message, timestamp FROM ai_chat_history WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
        rows = cursor.fetchall()
        conn.close()

        return [{"sender": r[0], "message": r[1], "timestamp": r[2]} for r in rows]

conversation_memory = ConversationMemoryEngine()
