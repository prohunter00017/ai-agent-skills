---
name: pinterest-api
description: Complete API reference for the Pinterest Automation Dashboard — endpoints, authentication, accounts, boards, pins, proxies, and scheduling. Use when an agent needs to call the dashboard's REST API.
---

# Pinterest Automation Dashboard — API Reference

API endpoints on the `/api/` prefix require authentication via either:
- **Session cookie** (browser login)
- **API key** in `Authorization: Bearer <key>` header

Base URL for API endpoints: `http://<host>:5000/api/`

Authentication endpoints (login/logout) are on the root path, not `/api/`.

---

## Authentication

These endpoints are **not** under `/api/` — they use the root URL `http://<host>:5000/`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with username/password. Sets session cookie. Body: form `username` + `password`. |
| GET | `/auth/logout` | Logout and clear session. |

```python
import requests

session = requests.Session()
session.post("http://host:5000/auth/login", data={"username": "admin", "password": "pass"})
```

For all subsequent examples, we use API key auth instead of session cookies:

```python
import requests

BASE = "http://host:5000/api"
HEADERS = {"Authorization": "Bearer YOUR_API_KEY"}
```

---

## Accounts

### List & Detail

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts` | List all accounts with stats (paginated). |
| GET | `/accounts/<username>` | Get full account detail: proxy, boards, stats, limits. |

**GET /accounts** query params:
- `page` (int, default 1)
- `per_page` (int, default 50, max 200)
- `search` (string) — filter by username
- `category` (string) — filter by category name
- `category_id` (int) — filter by category ID
- `proxy_mode` (string) — `iproyal`, `custom`, or `direct`
- `status` (string) — automation status filter
- `direct_save` (string) — filter by direct save enabled
- `week` (string) — filter by smart saves week

**Python:**
```python
resp = requests.get(f"{BASE}/accounts", headers=HEADERS, params={"per_page": 100})
data = resp.json()
# {"accounts": [...], "total": 13, "page": 1, "per_page": 100, "total_pages": 1,
#  "total_all": 13, "categories_tree": [...], "uncategorized_count": 2}

detail = requests.get(f"{BASE}/accounts/mindfulrecipes", headers=HEADERS).json()
# {"username": "mindfulrecipes", "has_cookies": true, "has_fingerprint": true,
#  "proxy": "http://...", "proxy_mode": "direct", "boards": [...], "board_count": 12,
#  "stats": {"total_sessions": 61, "total_saved": 357, "today_saves": 0, ...}}
```

**cURL:**
```bash
curl -H "Authorization: Bearer $KEY" "http://host:5000/api/accounts?per_page=100"
curl -H "Authorization: Bearer $KEY" "http://host:5000/api/accounts/mindfulrecipes"
```

### Add & Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/accounts/add` | Add single account. Multipart form: `username`, `cookies` (file), `fingerprint` (file, optional), `proxy`, `proxy_mode`, `category`. |
| POST | `/accounts/bulk-import` | Import multiple accounts from JSON body. |
| POST | `/accounts/bulk-upload` | Upload multiple accounts with files. Multipart form with folder structure. |
| POST | `/accounts/sync` | One-time CSV→DB import. Reads `accounts.csv` + `Accounts/` directories into DB. |

**Python — add single account:**
```python
with open("cookies.json", "rb") as c, open("fingerprint.json", "rb") as f:
    resp = requests.post(f"{BASE}/accounts/add", headers=HEADERS,
        data={"username": "myaccount", "proxy_mode": "iproyal", "category": "food"},
        files={"cookies": c, "fingerprint": f})
# {"success": true, "username": "myaccount", "sync": {"fetched_boards": 12, ...}}
```

**Python — bulk import (JSON):**
```python
resp = requests.post(f"{BASE}/accounts/bulk-import", headers=HEADERS, json={
    "accounts": [
        {"username": "user1", "proxy": "http://...", "category": "food"},
        {"username": "user2"}
    ]
})
# {"success": true, "imported": 2, "skipped": 0, "sync_queued": 2, "errors": []}
```

**cURL — add account:**
```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -F "username=myaccount" -F "proxy_mode=iproyal" -F "cookies=@cookies.json" \
  http://host:5000/api/accounts/add
```

### Modify

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT/POST | `/accounts/<username>/update` | Update account files/proxy/category. Multipart form: `cookies` (file), `fingerprint` (file), `proxy`, `category`, `category_id`. |
| POST | `/accounts/<username>/rename` | Rename account. Body: `{"new_username": "..."}` |
| POST | `/accounts/<username>/proxy-mode` | Set proxy mode. Body: `{"mode": "iproyal|custom|direct", "proxy": "..."}` |

**Python:**
```python
resp = requests.post(f"{BASE}/accounts/myaccount/proxy-mode", headers=HEADERS,
    json={"mode": "direct"})
# {"success": true, "proxy_mode": "direct", "proxy": "", "location": ""}
```

### Delete

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/accounts/<username>` | Delete single account (removes folder + DB records). |
| POST | `/accounts/batch/delete` | Batch delete. Body: `{"usernames": ["user1", "user2"]}` |

**cURL:**
```bash
curl -X DELETE -H "Authorization: Bearer $KEY" http://host:5000/api/accounts/myaccount
```

### Batch Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/accounts/batch/set-category` | Set category for multiple accounts. Body: `{"usernames": [...], "category_id": 5}` |
| POST | `/accounts/batch/proxy-mode` | Set proxy mode for multiple accounts. Body: `{"usernames": [...], "mode": "direct"}` |

### Sync Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts/sync-status` | Check bulk board sync progress after import. |

---

## Automation (Save)

### Enable/Disable

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/automation/<username>/enable` | Enable save automation for account. |
| POST | `/automation/<username>/disable` | Disable save automation for account. |
| POST | `/automation/batch/enable` | Batch enable. Body: `{"usernames": [...]}` |
| POST | `/automation/batch/disable` | Batch disable. Body: `{"usernames": [...]}` |

**Python:**
```python
requests.post(f"{BASE}/automation/mindfulrecipes/enable", headers=HEADERS)
# {"success": true, "message": "Automation enabled for mindfulrecipes"}

requests.post(f"{BASE}/automation/batch/enable", headers=HEADERS,
    json={"usernames": ["user1", "user2", "user3"]})
# {"success": true, "results": {"user1": "enabled", "user2": "enabled", ...}}
```

**cURL:**
```bash
curl -X POST -H "Authorization: Bearer $KEY" http://host:5000/api/automation/mindfulrecipes/enable
```

### Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/automation/status` | Get all automation statuses (running, sleeping, waiting, error). |

**Response:**
```json
{
  "jobs": {
    "mindfulrecipes": {
      "active": true, "status": "sleeping", "next_run": 1713300000,
      "sessions_today": 1, "sessions_remaining": 2,
      "pins_saved": 15, "pins_created": 0, "error": null
    }
  }
}
```

### Limits

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/accounts/<username>/saves-limit` | Set daily saves limit override. Body: `{"daily_saves_limit_max": 30}` or `{"clear": true}` |
| POST | `/automation/batch/saves-limit` | Batch set saves limit. Body: `{"usernames": [...], "daily_saves_limit_max": 30}` |

### Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts/<username>/schedule` | Get account schedule (smart automation managed). |
| POST | `/accounts/<username>/schedule` | Update schedule (currently smart-managed, returns info). |

---

## Automation (Create)

### Enable/Disable

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/automation/<username>/create/enable` | Enable create automation. |
| POST | `/automation/<username>/create/disable` | Disable create automation. |
| POST | `/automation/batch/create/enable` | Batch enable create. Body: `{"usernames": [...]}` |
| POST | `/automation/batch/create/disable` | Batch disable create. Body: `{"usernames": [...]}` |

### Status & Limits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/automation/create/status` | Get create automation statuses. |
| POST | `/accounts/<username>/creates-limit` | Set daily creates limit. Body: `{"daily_creates": 10}` |
| POST | `/automation/batch/creates-limit` | Batch set creates limit. Body: `{"usernames": [...], "daily_creates": 10}` |

---

## Direct Save

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/accounts/<username>/direct-save` | Toggle direct save. Body: `{"enabled": true}` |
| POST | `/accounts/batch/direct-save` | Batch toggle. Body: `{"usernames": [...], "enabled": true}` |

**Python:**
```python
requests.patch(f"{BASE}/accounts/mindfulrecipes/direct-save", headers=HEADERS,
    json={"enabled": True})
# {"success": true, "direct_save_enabled": true}
```

---

## Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts/<username>/boards` | List boards for account. |
| POST | `/accounts/<username>/sync-boards` | Fetch boards from Pinterest API and sync locally. |
| POST | `/accounts/<username>/create-board` | Create board(s) on Pinterest. |
| POST | `/accounts/<username>/upload-boards` | Upload boards CSV file. |
| DELETE | `/accounts/<username>/boards/<board_id>` | Delete a board on Pinterest. |

**POST /accounts/<username>/create-board** body (single):
```json
{"name": "Board Name", "description": "...", "privacy": "public"}
```

**POST /accounts/<username>/create-board** body (multiple):
```json
{
  "boards": [
    {"name": "Board 1", "description": "...", "privacy": "public"},
    {"name": "Board 2", "privacy": "secret"}
  ]
}
```

Or using names array:
```json
{"names": ["Board 1", "Board 2"], "description": "...", "privacy": "public"}
```

**Python — sync boards:**
```python
resp = requests.post(f"{BASE}/accounts/mindfulrecipes/sync-boards", headers=HEADERS)
# {"success": true, "fetched_boards": 12, "created_boards": 0, "errors": [],
#  "boards": [{"name": "Easy Recipes", "board_id": "123456789", "privacy": "public"}, ...]}
```

**Python — upload boards CSV:**
```python
with open("boards.csv", "rb") as f:
    resp = requests.post(f"{BASE}/accounts/mindfulrecipes/upload-boards",
        headers=HEADERS, files={"csv": f})
# {"success": true, "board_count": 12, "synced": true, "boards": [...]}
```

**cURL:**
```bash
curl -X POST -H "Authorization: Bearer $KEY" http://host:5000/api/accounts/mindfulrecipes/sync-boards
curl -X POST -H "Authorization: Bearer $KEY" -F "csv=@boards.csv" http://host:5000/api/accounts/mindfulrecipes/upload-boards
```

---

## Pin Queue (Create)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts/<username>/pins/queue` | List pin creation queue. Returns pins array + counts. |
| POST | `/accounts/<username>/pins/queue` | Add single pin to queue. |
| PUT | `/accounts/<username>/pins/queue/<index>` | Edit pin at index. |
| DELETE | `/accounts/<username>/pins/queue/<index>` | Remove pin at index. |
| POST | `/accounts/<username>/pins/upload-csv` | Upload pins CSV file to queue. |
| POST | `/accounts/<username>/pins/create-run` | Start pin creation job. Optional body: `{"indices": [0, 2, 5]}` |
| GET | `/accounts/<username>/pins/create-status` | Check pin creation job status. |

**POST /accounts/<username>/pins/queue** body:
```json
{
  "board_id": "123456789",
  "image_url": "https://example.com/image.jpg",
  "title": "My Pin",
  "description": "Pin description",
  "link": "https://example.com",
  "alt_text": "Alt text"
}
```

**Python — upload CSV and start creation:**
```python
with open("pins.csv", "rb") as f:
    resp = requests.post(f"{BASE}/accounts/mindfulrecipes/pins/upload-csv",
        headers=HEADERS, files={"csv": f})
# {"success": true, "added": 25, "skipped": 0, "total": 25}

requests.post(f"{BASE}/accounts/mindfulrecipes/pins/create-run", headers=HEADERS)
# {"success": true, "message": "Pin creation started for mindfulrecipes"}

import time
while True:
    status = requests.get(f"{BASE}/accounts/mindfulrecipes/pins/create-status",
        headers=HEADERS).json()
    print(f"{status['status']}: {status['created']}/{status['target']}")
    if status["status"] in ("completed", "failed", "idle"):
        break
    time.sleep(5)
```

**cURL:**
```bash
curl -H "Authorization: Bearer $KEY" -F "csv=@pins.csv" http://host:5000/api/accounts/mindfulrecipes/pins/upload-csv
curl -X POST -H "Authorization: Bearer $KEY" http://host:5000/api/accounts/mindfulrecipes/pins/create-run
curl -H "Authorization: Bearer $KEY" http://host:5000/api/accounts/mindfulrecipes/pins/create-status
```

---

## Save Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts/<username>/save-queue` | List save queue items with counts. |
| DELETE | `/accounts/<username>/save-queue/<index>` | Remove item at index. |
| POST | `/accounts/<username>/save-queue/upload` | Upload save queue file (.csv or .txt). |
| POST | `/accounts/<username>/save-queue/clear-done` | Remove all completed/failed items from queue. |

**Python:**
```python
with open("saves.csv", "rb") as f:
    resp = requests.post(f"{BASE}/accounts/mindfulrecipes/save-queue/upload",
        headers=HEADERS, files={"file": f})
# {"success": true, "added": 50, "total": 50}

queue = requests.get(f"{BASE}/accounts/mindfulrecipes/save-queue", headers=HEADERS).json()
# {"items": [...], "counts": {"total": 50, "pending": 48, "saved": 2, "failed": 0}}
```

---

## Bulk Import (Files)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/import/cookies` | Upload ZIP of cookies/fingerprints. Structure: `username/cookies.json`. |
| POST | `/import/pins` | Upload pin CSVs. Files named `username_pins.csv` or ZIP of them. |
| POST | `/import/save-queue` | Upload save queue files. Named `username_saves.csv` or `username_saves.txt`, or ZIP. |
| POST | `/import/boards` | Upload board CSVs. Files named `username_boards.csv` or ZIP of them. |

**Python — import cookies ZIP:**
```python
with open("cookies.zip", "rb") as f:
    resp = requests.post(f"{BASE}/import/cookies", headers=HEADERS, files={"zip": f})
# {"success": true, "updated_count": 5, "skipped_count": 0, "error_count": 0,
#  "updated": [{"username": "user1", "cookies": true, "fingerprint": true}, ...]}
```

**cURL:**
```bash
curl -X POST -H "Authorization: Bearer $KEY" -F "zip=@cookies.zip" http://host:5000/api/import/cookies
curl -X POST -H "Authorization: Bearer $KEY" -F "zip=@pins.zip" http://host:5000/api/import/pins
```

---

## Proxy Management

### IPRoyal Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/proxy/iproyal-config` | Get IPRoyal settings (password masked). |
| POST | `/proxy/iproyal-config` | Save IPRoyal settings. |

**POST /proxy/iproyal-config** body:
```json
{
  "username": "ipr_user",
  "password": "ipr_pass",
  "host": "geo.iproyal.com",
  "port": "12321",
  "lifetime": "24h",
  "high_end": "0",
  "skip_static": "0"
}
```

### City Pool

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/proxy/city-pool` | Get city pool + location usage counts. |
| POST | `/proxy/city-pool` | Update city pool. Body: `{"pool": [{"city": "chicago", "state": "illinois", "country": "us"}]}` |

### Proxy Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/proxy/generate` | Generate IPRoyal proxy for account. Body: `{"username": "...", "assign": true}` |
| POST | `/proxy/bulk-assign` | Assign IPRoyal proxies to all accounts. Body: `{"overwrite": false}` |
| POST | `/proxy/assign-cities` | Assign cities to accounts without one. |
| POST | `/proxy/test` | Test a proxy connection. Body: `{"proxy": "http://..."}` (omit to test IPRoyal config). |

**Python:**
```python
result = requests.post(f"{BASE}/proxy/test", headers=HEADERS,
    json={"proxy": "http://user:pass@host:port"}).json()
# {"ok": true, "ip": "1.2.3.4", "response_time": 1.23}

requests.post(f"{BASE}/proxy/bulk-assign", headers=HEADERS, json={"overwrite": False})
# {"ok": true, "assigned": 10, "skipped": 3, "total": 13}
```

**cURL:**
```bash
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"proxy":"http://user:pass@host:port"}' http://host:5000/api/proxy/test
```

---

## Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List all categories (flat). |
| GET | `/categories/tree` | Get categories as nested tree. |
| POST | `/categories` | Create category. Body: `{"name": "...", "parent_id": null}` |
| PUT | `/categories/<id>` | Rename/move category. Body: `{"name": "...", "parent_id": 5}` |
| DELETE | `/categories/<id>` | Delete category. |

**Python:**
```python
resp = requests.post(f"{BASE}/categories", headers=HEADERS,
    json={"name": "Food", "parent_id": None})
# {"success": true, "category": {"id": 1, "name": "Food", "parent_id": null, "path": "Food"}}
```

---

## Dashboard & Activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Dashboard overview: total accounts, sessions, saves, creates, pending pins. |
| GET | `/activity/recent` | Recent automation runs. Query: `?limit=50` (max 200). |
| GET | `/accounts/active-tasks` | Currently running tasks per account. |

**Python:**
```python
stats = requests.get(f"{BASE}/dashboard/stats", headers=HEADERS).json()
# {"total_accounts": 13, "connected_accounts": 3, "total_sessions": 61,
#  "total_saved": 758, "total_created": 0, "total_pending_pins": 0, ...}

recent = requests.get(f"{BASE}/activity/recent", headers=HEADERS, params={"limit": 10}).json()
# {"runs": [{"username": "mindfulrecipes", "run_type": "save", "pins_saved": 8, ...}, ...]}
```

**cURL:**
```bash
curl -H "Authorization: Bearer $KEY" http://host:5000/api/dashboard/stats
curl -H "Authorization: Bearer $KEY" "http://host:5000/api/activity/recent?limit=10"
```

---

## Analytics

### Profile Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analytics/check` | Start async analytics job (fetches Pinterest profile data for all accounts). |
| GET | `/analytics/status?job_id=<id>` | Poll job status. Returns results when complete. |

**Python:**
```python
job = requests.post(f"{BASE}/analytics/check", headers=HEADERS).json()
# {"job_id": "a1b2c3d4", "checker_username": "mindfulrecipes", "total": 13}

import time
while True:
    status = requests.get(f"{BASE}/analytics/status",
        headers=HEADERS, params={"job_id": job["job_id"]}).json()
    if status["status"] == "complete":
        for r in status["results"]:
            print(f"{r['username']}: {r['follower_count']} followers, {r['pin_count']} pins")
        break
    elif status["status"] == "error":
        print(f"Error: {status['error']}")
        break
    time.sleep(3)
```

### Analytics Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/dashboard` | System overview, daily trends, account performance, hourly distribution. Query: `?days=30` (max 90). |

**Response:**
```json
{
  "overview": {"today": {"saves": 15}, "yesterday": {"saves": 22}, "avg_7d": {"saves": 18}},
  "trends": [{"date": "2025-04-15", "saves": 22, "creates": 0, "sessions": 3}, ...],
  "performance": [{"username": "mindfulrecipes", "saves": 357, "sessions": 61}, ...],
  "hourly": [{"hour": 8, "saves": 5}, {"hour": 9, "saves": 8}, ...]
}
```

---

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health/accounts` | Health status for all accounts (healthy/warning/critical/inactive) with 24h stats. |

**Python:**
```python
health = requests.get(f"{BASE}/health/accounts", headers=HEADERS).json()
# {"summary": {"total": 13, "healthy": 2, "warning": 1, "critical": 0, "inactive": 10},
#  "accounts": [{"username": "mindfulrecipes", "health_status": "healthy",
#    "total_sessions_24h": 3, "total_saves_24h": 15, "failure_rate": 0, ...}, ...]}
```

**cURL:**
```bash
curl -H "Authorization: Bearer $KEY" http://host:5000/api/health/accounts
```

---

## Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/logs/accounts` | List accounts that have log files. |
| GET | `/logs/download-all` | Download all logs as ZIP. |
| GET | `/logs/download/<username>` | Download logs for single account as ZIP. |

**cURL:**
```bash
curl -H "Authorization: Bearer $KEY" -o all_logs.zip http://host:5000/api/logs/download-all
curl -H "Authorization: Bearer $KEY" -o user_logs.zip http://host:5000/api/logs/download/mindfulrecipes
```

---

## Simulator

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/simulator/status` | Get simulation status. |
| POST | `/simulator/start` | Start simulation. |
| POST | `/simulator/stop` | Stop running simulation. |
| GET | `/simulator/logs?since=<timestamp>` | Get simulation logs. |
| POST | `/simulator/cleanup-logs` | Clean up simulation log files. |

**POST /simulator/start** body:
```json
{
  "accounts": ["user1", "user2"],
  "days": 3,
  "fast": false,
  "max_workers": 6,
  "stages": [
    {"week": 1, "days": 3},
    {"week": 2, "days": 4}
  ]
}
```

---

## Backup & Restore

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/backup/settings` | Get S3 backup settings. |
| POST | `/backup/settings` | Save S3 backup settings. |
| POST | `/backup/test-connection` | Test S3 connection. |
| POST | `/backup/create` | Create a new backup. |
| GET | `/backup/list` | List available backups. |
| GET | `/backup/status` | Get current backup/restore status. |
| POST | `/backup/restore` | Restore from backup. Body: `{"key": "backup_key"}` |
| DELETE | `/backup/<key>` | Delete a backup. |

**Python:**
```python
requests.post(f"{BASE}/backup/create", headers=HEADERS)
# {"ok": true, "message": "Backup started"}

import time
while True:
    status = requests.get(f"{BASE}/backup/status", headers=HEADERS).json()
    if not status.get("running"):
        break
    time.sleep(10)

backups = requests.get(f"{BASE}/backup/list", headers=HEADERS).json()
# {"backups": [{"key": "backups/20250416_020000.tar.gz", "size": 1234567, ...}]}
```

**cURL:**
```bash
curl -X POST -H "Authorization: Bearer $KEY" http://host:5000/api/backup/create
curl -H "Authorization: Bearer $KEY" http://host:5000/api/backup/list
```

---

## Settings

### General

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get current settings (username, concurrency, version). |
| POST | `/settings/password` | Change password. Body: `{"current_password": "...", "new_password": "..."}` |
| POST | `/settings/username` | Change login username. Body: `{"new_username": "..."}` |
| POST | `/settings/concurrency` | Set max concurrent automations (1-20). Body: `{"max_concurrent": 6}` |

### Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/settings/secret-key/regenerate` | Regenerate Flask secret key (invalidates all sessions). |
| GET | `/settings/api-key` | Get API key info (exists, prefix). |
| POST | `/settings/api-key/regenerate` | Generate new API key. Returns the raw key once. |
| POST | `/settings/api-key/revoke` | Revoke API key. |

**Python:**
```python
result = requests.post(f"{BASE}/settings/api-key/regenerate", headers=HEADERS).json()
# {"ok": true, "api_key": "18ef47f3a...", "message": "Copy it now — it will not be shown again."}

info = requests.get(f"{BASE}/settings/api-key", headers=HEADERS).json()
# {"exists": true, "prefix": "18ef47f3", "masked": "18ef47f3...************************"}
```

### Smart Saves Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/smart-saves-schedule` | Get smart saves schedule (week thresholds + min/max saves). |
| POST | `/settings/smart-saves-schedule` | Update schedule. |
| POST | `/settings/smart-saves-schedule/reset` | Reset to defaults. |

**POST /settings/smart-saves-schedule** body:
```json
{
  "schedule": [
    {"day_threshold": 7, "min_saves": 3, "max_saves": 8},
    {"day_threshold": 14, "min_saves": 5, "max_saves": 15},
    {"day_threshold": 999999, "min_saves": 10, "max_saves": 25}
  ]
}
```

### Database & Reset

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/db-stats` | Get row counts for runs, daily_activity, automation_status, active_jobs, csv_pins. |
| POST | `/settings/reset/<target>` | Reset history. Target: `run-history`, `daily-activity`, `automation-status`, `active-jobs`, `all-history`. Body: `{"confirm": true}` |
| POST | `/settings/reset/csv-pins` | Reset all pin CSV statuses to pending. Body: `{"confirm": true}` |

---

## Error Responses

All errors return JSON with an `error` field:
```json
{"error": "Account not found"}
```

Common HTTP status codes:
- `400` — Bad request / validation error
- `401` — Not authenticated
- `403` — Forbidden (wrong password)
- `404` — Resource not found
- `409` — Conflict (already exists, already running)
- `500` — Server error
- `502` — Proxy error (proxy test failures)
