import sys
from app.intent_router import intent_router
from app.query_preview import query_preview
from app.command_history import command_history
from app.logger import get_logger

logger = get_logger("scraper_pipeline")

class ScraperCommandPipeline:
    """v3.0 Scraper Command Line & Pipeline Runner."""

    def run_command(self, query, operator="Administrator"):
        logger.info(f"Command Center received scraping command: '{query}'")

        preview = query_preview.analyze_query_preview(query)
        if preview['status'] == "REJECTED":
            logger.warning(f"Command '{query}' REJECTED by Query Validator.")
            return preview

        execution = intent_router.route_and_execute(query)
        cmd_uuid = command_history.record_command(query, preview, execution_result=execution, operator=operator)

        return {
            "status": "SUCCESS",
            "command_uuid": cmd_uuid,
            "preview": preview,
            "execution": execution
        }

pipeline = ScraperCommandPipeline()

if __name__ == '__main__':
    q = sys.argv[1] if len(sys.argv) > 1 else "Samsung Galaxy S25 Ultra"
    res = pipeline.run_command(q)
    print(res)
