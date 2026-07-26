class SmartRejectionEngine:
    """Module 8: Smart Rejection Rationale Engine."""

    VALID_REASONS = [
        "Wrong RAM", "Wrong Storage", "Wrong CPU", "Wrong GPU",
        "Wrong Series", "Wrong Category", "Accessory Mismatch",
        "Refurbished", "Bundle", "International Model", "Duplicate Candidate"
    ]

    def log_rejection(self, session_id, vendor_name, raw_title, reason, expected=None, actual=None):
        clean_reason = reason if reason in self.VALID_REASONS else "Hardware Spec Mismatch"
        
        rejection_entry = {
            "session_id": session_id,
            "vendor_name": vendor_name,
            "raw_title": raw_title,
            "rejected_reason": clean_reason,
            "expected_attribute": expected or "N/A",
            "actual_attribute": actual or "N/A"
        }
        return rejection_entry

smart_rejection_engine = SmartRejectionEngine()
