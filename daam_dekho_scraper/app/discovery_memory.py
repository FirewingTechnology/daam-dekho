from app.database.manager import db_manager

class DiscoveryMemoryEngine:
    """Module 9: Discovery Memory & Query Learning Engine."""

    def record_query_conversion(self, original_query, successful_query, conversion_rate=1.0):
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO query_expansions (original_query, expanded_query, source_module, conversion_rate)
            VALUES (?, ?, 'DiscoveryMemory', ?)
        """, (original_query, successful_query, conversion_rate))

        conn.commit()
        conn.close()

    def get_best_query_override(self, query):
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT expanded_query FROM query_expansions 
            WHERE LOWER(original_query) = LOWER(?) 
            ORDER BY conversion_rate DESC LIMIT 1
        """, (query,))
        row = cursor.fetchone()
        conn.close()

        return row[0] if row else query

discovery_memory = DiscoveryMemoryEngine()
