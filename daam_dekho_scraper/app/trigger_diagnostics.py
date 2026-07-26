import os
import sys
import time
import datetime
import random
import traceback
from app.logger import get_logger

logger = get_logger("trigger_diagnostics")

class TriggerDiagnosticsEngine:
    """v3.1 Trigger Diagnostics & Request ID Tracking Engine."""

    def generate_request_id(self):
        date_str = datetime.datetime.now().strftime("%Y%m%d")
        rand_num = f"{random.randint(1, 999999):06d}"
        return f"SCR-{date_str}-{rand_num}"

    def trace_stage(self, request_id, stage, status="SUCCESS", details=None):
        ts = datetime.datetime.now().isoformat()
        logger.info(f"[{request_id}] Stage: '{stage}' | Status: {status} | Details: {details or {}}")
        return {
            "request_id": request_id,
            "timestamp": ts,
            "stage": stage,
            "status": status,
            "details": details or {}
        }

    def format_error_response(self, request_id, stage, exception_obj):
        err_type = type(exception_obj).__name__
        err_msg = str(exception_obj)
        tb_str = traceback.format_exc()

        logger.error(f"[{request_id}] FAILURE at Stage '{stage}': {err_type} - {err_msg}")

        return {
            "success": False,
            "status": "ERROR",
            "request_id": request_id,
            "stage": stage,
            "error_type": err_type,
            "message": err_msg,
            "traceback": tb_str,
            "timestamp": datetime.datetime.now().isoformat()
        }

    def inspect_subprocess(self, cmd_args, work_dir, pid=None, return_code=0, stdout="", stderr=""):
        return {
            "executable": sys.executable,
            "working_directory": os.path.abspath(work_dir or "."),
            "python_path": sys.path[0],
            "arguments": cmd_args,
            "pid": pid or os.getpid(),
            "return_code": return_code,
            "stdout_snippet": (stdout or "")[:500],
            "stderr_snippet": (stderr or "")[:500]
        }

trigger_diagnostics = TriggerDiagnosticsEngine()
