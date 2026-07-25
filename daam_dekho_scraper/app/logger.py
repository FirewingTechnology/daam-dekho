import logging
import sys
import os
from pathlib import Path
from app.config import LOG_DIR, LOG_FILE

def get_logger(name: str):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        fmt = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

        # Console handler — force UTF-8
        console_handler = logging.StreamHandler(sys.stdout)
        try:
            if hasattr(sys.stdout, "reconfigure"):
                sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
        console_handler.setFormatter(fmt)

        # Primary File handler
        file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
        file_handler.setFormatter(fmt)

        logger.addHandler(console_handler)
        logger.addHandler(file_handler)

        # Channel-specific file loggers
        log_dir = Path(LOG_DIR)
        os.makedirs(log_dir, exist_ok=True)
        
        channel_name = "scrape.log"
        if "matcher" in name or "match" in name:
            channel_name = "matching.log"
        elif "clean" in name or "valid" in name:
            channel_name = "validation.log"
        elif "image" in name:
            channel_name = "images.log"
        elif "url" in name:
            channel_name = "urls.log"

        channel_handler = logging.FileHandler(log_dir / channel_name, encoding="utf-8")
        channel_handler.setFormatter(fmt)
        logger.addHandler(channel_handler)

    return logger
