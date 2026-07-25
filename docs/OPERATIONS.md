# 🛠️ DaamDekho Operations & Runbook Manual

**Document Version**: 1.0.0  
**Document Status**: `APPROVED`  
**Target Audience**: DevOps Engineers, Site Reliability Engineers (SREs), System Administrators  

---

## 1️⃣ Production Environment Variables

### Backend Node.js Environment (`app/backend-node/.env`)

```env
NODE_ENV=production
PORT=8001
JWT_SECRET=production_jwt_secret_key_change_in_prod
ALLOWED_ORIGINS=https://daamdekho.com,https://www.daamdekho.com
DATABASE_PATH=../../daamdekho.db
```

### Frontend React Environment (`app/frontend/.env.production`)

```env
VITE_URL=https://api.daamdekho.com/api
```

---

## 2️⃣ Deployment & Application Lifecycle

### PM2 Process Manager Commands

```bash
# Start backend server under PM2 cluster
pm2 start server.js --name "daamdekho-api" -i max

# Zero-downtime application reload
pm2 reload daamdekho-api

# View application status and memory consumption
pm2 status

# Restart application
pm2 restart daamdekho-api
```

### Nginx Reverse Proxy Configuration Snippet

```nginx
server {
    listen 443 ssl http2;
    server_name api.daamdekho.com;

    ssl_certificate /etc/letsencrypt/live/api.daamdekho.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.daamdekho.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 3️⃣ Health Checks & System Monitoring

- **API Health Check Endpoint**: `GET https://api.daamdekho.com/health`
  - Expected Response: `{"status": "healthy", "timestamp": "2026-07-24T16:45:00.000Z"}`
- **Automated Uptime Probe**: UptimeRobot configured for 5-minute interval HTTP checks on `/health`.

---

## 4️⃣ Database Backup & Restoration

### Backup Execution (Hourly Cron)

```bash
# Create SQLite online backup snapshot
sqlite3 daamdekho.db ".backup 'backups/daamdekho_$(date +%Y%m%d_%H%M%S).db'"
```

### Restoration Execution

```bash
# Stop application process
pm2 stop daamdekho-api

# Restore database snapshot
cp backups/daamdekho_20260724_150000.db daamdekho.db

# Restart application process
pm2 start daamdekho-api
```

---

## 5️⃣ Log Locations & Log Rotation

- **Node.js API Access Logs**: `app/backend-node/logs/access.log`
- **Node.js Error Logs**: `app/backend-node/logs/error.log`
- **Scraper Execution Logs**: `daam_dekho_scraper/logs/scraper.log`
- **PM2 Log Streams**: `pm2 logs daamdekho-api`

---

## 6️⃣ Scheduled Scraper Operations

- **Execution Cadence**: Hourly scraper jobs managed via Python pipeline.
- **Single Vendor Execution Rule**: Never run more than one vendor scraper at a time to prevent IP blocking.
- **Command**:
  ```bash
  python verify_scraping_pipeline.py
  ```

---

## 7️⃣ Incident Response Triage

1. **P0 Issue (Complete Outage / API Down)**:
   - Run `pm2 status` and check `pm2 logs daamdekho-api --err`.
   - Issue `pm2 reload daamdekho-api`.
2. **P1 Issue (Incorrect Matching / Stale Prices)**:
   - Execute `python test_e2e_verification_suite.py` to verify matching logic.
   - Inspect data cleaner logs in `daam_dekho_scraper/logs/`.
