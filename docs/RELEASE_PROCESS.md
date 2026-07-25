# 🚀 DaamDekho Release Process & Operational Manual

**Document Version**: 1.0.0  
**Document Status**: `APPROVED`  

## 1. Release Classification

- **Patch (`v1.0.x`)**: Security vulnerabilities, bug fixes, performance tuning, logging & monitoring updates.
- **Minor (`v1.x`)**: Backward-compatible UI polish, documentation, non-breaking enhancements.
- **Major (`v2.0`)**: Version 2.x business capabilities (Affiliate Marketing, User Accounts, Price Drop Alerts, AI recommendations).

## 2. Mandatory Pre-Deployment Checklist

Every production deployment must satisfy:
- [x] Build successful (`npm run build`)
- [x] E2E Automated Verification Suite passed (`python test_e2e_verification_suite.py`)
- [x] Security review & rate limiting verified
- [x] Database snapshot backup taken
- [x] Rollback plan verified
- [x] `/api/health` check passing
- [x] Sentry error tracking active

## 3. Rollback Procedure

In the event of a P0/P1 incident:
1. Halt deployment rollout immediately.
2. Execute PM2 process rollback (`pm2 reload app --update-env`).
3. Restore database snapshot if schema migration occurred.
4. Verify system health via `/api/health`.
5. Conduct Root Cause Analysis (RCA) and publish incident report.
