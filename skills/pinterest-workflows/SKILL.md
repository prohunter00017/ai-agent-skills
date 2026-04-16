---
name: pinterest-workflows
description: Step-by-step workflow recipes for common Pinterest Automation Dashboard tasks — onboarding accounts, bulk scheduling pins, managing proxies, and monitoring jobs. Use when building an end-to-end automation flow.
---

# Pinterest Automation Dashboard — Workflow Recipes

Step-by-step recipes for common tasks using the API. All examples use Python with `requests`.

## Setup

```python
import requests
import time

BASE = "http://<host>:5000/api"
API_KEY = "YOUR_API_KEY"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def api(method, path, **kwargs):
    resp = getattr(requests, method)(f"{BASE}{path}", headers=HEADERS, **kwargs)
    resp.raise_for_status()
    return resp.json()
```

---

## Recipe 1: Onboard a New Account (Full Setup)

Add account → assign proxy → create boards → enable automation.

```python
# 1. Add account with cookies + fingerprint
with open("cookies.json", "rb") as c, open("fingerprint.json", "rb") as f:
    resp = requests.post(
        f"{BASE}/accounts/add",
        headers=HEADERS,
        data={"username": "mynewaccount", "proxy_mode": "iproyal", "category": "food"},
        files={"cookies": c, "fingerprint": f}
    )
    print(resp.json())
    # Boards are auto-synced from Pinterest after adding

# 2. Check boards were synced
boards = api("get", "/accounts/mynewaccount/boards")
print(f"Found {boards['count']} boards")

# 3. If you need additional boards, create them
api("post", "/accounts/mynewaccount/create-board", json={
    "names": ["Easy Dinners", "Healthy Snacks", "Desserts"],
    "privacy": "public"
})

# 4. Enable save automation
api("post", "/automation/mynewaccount/enable")

# 5. Verify automation is running
status = api("get", "/automation/status")
print(status["jobs"].get("mynewaccount", {}).get("status"))
```

---

## Recipe 2: Bulk Onboard Multiple Accounts

Upload a ZIP with all account cookies, then enable automation.

```python
# 1. Upload cookies ZIP (folders: username/cookies.json + fingerprint.json)
with open("all_accounts.zip", "rb") as f:
    resp = requests.post(
        f"{BASE}/import/cookies",
        headers=HEADERS,
        files={"zip": f}
    )
    result = resp.json()
    print(f"Updated: {result['updated_count']}, Skipped: {result['skipped_count']}")

# 2. Assign IPRoyal proxies to all accounts without one
api("post", "/proxy/bulk-assign", json={"overwrite": False})

# 3. Sync boards for all accounts
usernames = [a["username"] for a in api("get", "/accounts")["accounts"]]
for username in usernames:
    try:
        api("post", f"/accounts/{username}/sync-boards")
        print(f"Synced boards for {username}")
    except Exception as e:
        print(f"Failed {username}: {e}")
    time.sleep(2)  # Rate limit

# 4. Batch enable automation
api("post", "/automation/batch/enable", json={"usernames": usernames})
```

---

## Recipe 3: Queue and Run Pin Creation

Load pins from CSV, queue them, and run creation.

```python
username = "mindfulrecipes"

# 1. Upload pins CSV
with open(f"{username}_pins.csv", "rb") as f:
    resp = requests.post(
        f"{BASE}/accounts/{username}/pins/upload-csv",
        headers=HEADERS,
        files={"csv": f}
    )
    print(f"Added {resp.json()['added']} pins")

# 2. Check the queue
queue = api("get", f"/accounts/{username}/pins/queue")
print(f"Queue: {queue['counts']}")

# 3. Start creation (all pending pins)
api("post", f"/accounts/{username}/pins/create-run")

# 4. Poll until complete
while True:
    status = api("get", f"/accounts/{username}/pins/create-status")
    print(f"Status: {status['status']} — {status['created']}/{status['target']} created")
    if status["status"] in ("completed", "failed", "idle"):
        break
    time.sleep(5)
```

---

## Recipe 4: Distribute Pins Across Multiple Accounts

Load a master pin list and distribute to accounts by board.

```python
import csv
import io

# Master list: each row has username, board_id, image_url, title, etc.
master_pins = [
    {"username": "user1", "board_id": "111", "image_url": "https://...", "title": "Pin 1"},
    {"username": "user2", "board_id": "222", "image_url": "https://...", "title": "Pin 2"},
]

# Group by username
from collections import defaultdict
by_user = defaultdict(list)
for pin in master_pins:
    by_user[pin["username"]].append(pin)

# Upload per account
for username, pins in by_user.items():
    for pin in pins:
        api("post", f"/accounts/{username}/pins/queue", json={
            "board_id": pin["board_id"],
            "image_url": pin["image_url"],
            "title": pin.get("title", ""),
            "description": pin.get("description", ""),
            "link": pin.get("link", ""),
        })
    print(f"Queued {len(pins)} pins for {username}")
```

---

## Recipe 5: Load Save Queue for Direct Save

Queue pins for saving (repinning) and enable direct save mode.

```python
username = "mindfulrecipes"

# 1. Upload save queue
with open(f"{username}_saves.csv", "rb") as f:
    resp = requests.post(
        f"{BASE}/accounts/{username}/save-queue/upload",
        headers=HEADERS,
        files={"file": f}
    )
    print(f"Added {resp.json()['added']} items to save queue")

# 2. Enable direct save (uses queue instead of browsing for pins)
api("patch", f"/accounts/{username}/direct-save", json={"enabled": True})

# 3. Enable automation (will process the save queue)
api("post", f"/automation/{username}/enable")
```

---

## Recipe 6: Monitor System Health

Check account health, identify problems, and take action.

```python
# 1. Get health overview
health = api("get", "/health/accounts")
summary = health["summary"]
print(f"Total: {summary['total']} | Healthy: {summary['healthy']} | "
      f"Warning: {summary['warning']} | Critical: {summary['critical']}")

# 2. Find critical accounts
critical = [a for a in health["accounts"] if a["health_status"] == "critical"]
for acc in critical:
    print(f"CRITICAL: {acc['username']} — {acc['last_error']}")

# 3. Disable automation for critical accounts
if critical:
    api("post", "/automation/batch/disable",
        json={"usernames": [a["username"] for a in critical]})

# 4. Check dashboard stats
stats = api("get", "/dashboard/stats")
print(f"Connected: {stats['connected_accounts']}/{stats['total_accounts']}")
print(f"Total sessions: {stats['total_sessions']}, Total saved: {stats['total_saved']}")
```

---

## Recipe 7: Configure IPRoyal Proxy Setup

Set up IPRoyal residential proxies and assign to accounts.

```python
# 1. Configure IPRoyal credentials
api("post", "/proxy/iproyal-config", json={
    "username": "your_iproyal_user",
    "password": "your_iproyal_pass",
    "host": "geo.iproyal.com",
    "port": "12321",
    "lifetime": "24h",
    "high_end": "0",
    "skip_static": "0"
})

# 2. Set city pool (proxies rotate through these locations)
api("post", "/proxy/city-pool", json={
    "pool": [
        {"city": "chicago", "state": "illinois", "country": "us"},
        {"city": "houston", "state": "texas", "country": "us"},
        {"city": "miami", "state": "florida", "country": "us"},
    ]
})

# 3. Test proxy connection
result = api("post", "/proxy/test")
print(f"Proxy IP: {result['ip']}, Response time: {result['response_time']}s")

# 4. Assign proxies to all accounts
api("post", "/proxy/bulk-assign", json={"overwrite": True})

# 5. Verify assignments
config = api("get", "/proxy/iproyal-config")
for loc in config["location_counts"]:
    print(f"{loc['proxy_city']}/{loc['proxy_state']}: {loc['cnt']} accounts")
```

---

## Recipe 8: Run Simulation (Test Automation)

Dry-run automation without actually interacting with Pinterest.

```python
# 1. Get available accounts
accounts = [a["username"] for a in api("get", "/accounts")["accounts"]]

# 2. Start simulation
api("post", "/simulator/start", json={
    "accounts": accounts[:3],  # Test with 3 accounts
    "days": 3,
    "fast": True,              # Speed up simulation
    "max_workers": 6,
    "stages": [
        {"week": 1, "days": 2},
        {"week": 2, "days": 1}
    ]
})

# 3. Monitor progress
while True:
    status = api("get", "/simulator/status")
    print(f"Status: {status['status']}")
    if status["status"] in ("idle", "completed", "error"):
        break
    time.sleep(5)

# 4. Get logs
logs = api("get", "/simulator/logs?since=0")
for entry in logs["logs"][-10:]:
    print(entry)
```

---

## Recipe 9: Backup and Restore

Create S3 backups and restore when needed.

```python
# 1. Configure S3 backup settings
api("post", "/backup/settings", json={
    "endpoint": "https://s3.eu-central-1.s4.mega.io",
    "region": "eu-central-1",
    "bucket": "pinterest-automation-web",
    "access_key": "YOUR_ACCESS_KEY",
    "secret_key": "YOUR_SECRET_KEY",
    "auto_enabled": True,
    "interval_days": 3,
    "preferred_hour_et": 2
})

# 2. Test connection
api("post", "/backup/test-connection")

# 3. Create manual backup
api("post", "/backup/create")

# 4. Poll backup status
while True:
    status = api("get", "/backup/status")
    if not status.get("running"):
        break
    time.sleep(10)

# 5. List available backups
backups = api("get", "/backup/list")
for b in backups.get("backups", []):
    print(f"{b['key']} — {b.get('size', 'unknown')}")

# 6. Restore from backup (if needed)
# api("post", "/backup/restore", json={"key": "backups/20250416_020000.tar.gz"})
```

---

## Recipe 10: Analytics Check

Fetch live Pinterest profile data for all accounts.

```python
# 1. Start analytics check
job = api("post", "/analytics/check")
job_id = job["job_id"]
print(f"Checking {job['total']} accounts using {job['checker_username']}")

# 2. Poll until complete
while True:
    status = api("get", f"/analytics/status?job_id={job_id}")
    if status["status"] == "complete":
        for result in status["results"]:
            if result.get("error"):
                print(f"  {result['username']}: ERROR")
            else:
                print(f"  {result['username']}: {result['follower_count']} followers, "
                      f"{result['pin_count']} pins")
        break
    elif status["status"] == "error":
        print(f"Error: {status['error']}")
        break
    print(f"Progress: {status['progress']}/{job['total']} ({status['current']})")
    time.sleep(3)
```

---

## Recipe 11: Category Organization

Organize accounts into categories for easier management.

```python
# 1. Create category hierarchy
food = api("post", "/categories", json={"name": "Food"})
food_id = food["category"]["id"]

api("post", "/categories", json={"name": "Recipes", "parent_id": food_id})
api("post", "/categories", json={"name": "Restaurants", "parent_id": food_id})
api("post", "/categories", json={"name": "Gift Cards"})

# 2. Assign accounts to categories
api("post", "/accounts/batch/set-category", json={
    "usernames": ["familytablefood", "mindfulrecipes"],
    "category_id": food_id
})

# 3. View category tree
tree = api("get", "/categories/tree")
for node in tree["tree"]:
    print(f"{'  ' * node.get('depth', 0)}{node['name']} ({node.get('account_count', 0)} accounts)")
```

---

## Recipe 12: API Key Management

Generate and manage API keys for programmatic access.

```python
# These require session auth (browser login) initially:

# 1. Generate API key (via browser session or existing key)
result = api("post", "/settings/api-key/regenerate")
new_key = result["api_key"]
print(f"New API key: {new_key}")
print("Save this key — it won't be shown again!")

# 2. Check API key status
info = api("get", "/settings/api-key")
print(f"Key exists: {info['exists']}, Prefix: {info['prefix']}")

# 3. Revoke API key (if compromised)
# api("post", "/settings/api-key/revoke")
```

---

## cURL Equivalents

For quick one-off commands:

```bash
# List accounts
curl -H "Authorization: Bearer $API_KEY" http://<host>:5000/api/accounts

# Enable automation
curl -X POST -H "Authorization: Bearer $API_KEY" \
  http://<host>:5000/api/automation/mindfulrecipes/enable

# Dashboard stats
curl -H "Authorization: Bearer $API_KEY" http://<host>:5000/api/dashboard/stats

# Upload pins CSV
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -F "csv=@mindfulrecipes_pins.csv" \
  http://<host>:5000/api/accounts/mindfulrecipes/pins/upload-csv

# Test proxy
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"proxy": "http://user:pass@host:port"}' \
  http://<host>:5000/api/proxy/test

# Health check
curl -H "Authorization: Bearer $API_KEY" http://<host>:5000/api/health/accounts
```
