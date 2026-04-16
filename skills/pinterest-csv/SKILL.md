---
name: pinterest-csv
description: CSV and upload file formats accepted by the Pinterest Automation Dashboard (pins, boards, accounts, proxies, cookies, fingerprints). Use when importing or exporting bulk data.
---

# Pinterest Automation Dashboard — CSV Formats & Upload Guide

This document covers every CSV/file format accepted by the dashboard's import and upload endpoints, plus code examples for programmatic uploads.

---

## 1. Pins CSV (`username_pins.csv`)

Used for pin creation queue. Upload per-account or in bulk.

### Required Columns
| Column | Required | Description |
|--------|----------|-------------|
| `board_id` | Yes | Pinterest board ID to pin to |
| `image_url` | Yes | URL of the image to create as a pin |

### Optional Columns
| Column | Description |
|--------|-------------|
| `title` | Pin title |
| `description` | Pin description |
| `link` | Destination URL when pin is clicked |
| `alt_text` | Alt text for accessibility |
| `status` | `pending` (default), `created`, `scheduled`, `failed` |

### Example
```csv
board_id,image_url,title,description,link,alt_text,status
123456789,https://example.com/photo1.jpg,Easy Pasta Recipe,A quick weeknight dinner,https://myblog.com/pasta,Photo of pasta dish,pending
123456789,https://example.com/photo2.jpg,Garden Tips,,https://myblog.com/garden,,pending
```

### Upload Endpoints

**Single account:**
```
POST /api/accounts/<username>/pins/upload-csv
Content-Type: multipart/form-data
Field: csv (file)
```

**Bulk (multiple accounts):**
```
POST /api/import/pins
Content-Type: multipart/form-data
Field: csvs (files, named username_pins.csv) OR zip (single ZIP file)
```

ZIP structure:
```
pins_import.zip
├── familytablefood_pins.csv
├── mindfulrecipes_pins.csv
└── theglow_experience_pins.csv
```

### Python Upload Example
```python
import requests

BASE = "http://<host>:5000/api"
HEADERS = {"Authorization": "Bearer YOUR_API_KEY"}

# Single account
with open("mindfulrecipes_pins.csv", "rb") as f:
    resp = requests.post(
        f"{BASE}/accounts/mindfulrecipes/pins/upload-csv",
        headers=HEADERS,
        files={"csv": f}
    )
    print(resp.json())
    # {"success": true, "added": 25, "skipped": 0, "total": 25}

# Bulk (multiple files)
files = [
    ("csvs", open("user1_pins.csv", "rb")),
    ("csvs", open("user2_pins.csv", "rb")),
]
resp = requests.post(f"{BASE}/import/pins", headers=HEADERS, files=files)
print(resp.json())
```

---

## 2. Boards CSV (`username_boards.csv`)

Used to define boards for an account. Boards with names but no `board_id` will be created on Pinterest if cookies are available.

### Columns
| Column | Required | Aliases | Description |
|--------|----------|---------|-------------|
| `name` | Yes | `Board Name`, `board_name` | Board name |
| `board_id` | No | `Board ID` | Pinterest board ID (leave blank to create new) |
| `privacy` | No | — | `public` (default) or `secret` |
| `description` | No | — | Board description |

### Example
```csv
Board Name,Board ID,Privacy,description
Easy Recipes,123456789,public,Quick weeknight meals
Desserts,,public,Sweet treats and baking
Secret Board,,secret,Private collection
```

### Upload Endpoints

**Single account:**
```
POST /api/accounts/<username>/upload-boards
Content-Type: multipart/form-data
Field: csv (file)
```

**Bulk:**
```
POST /api/import/boards
Content-Type: multipart/form-data
Field: csvs (files, named username_boards.csv) OR zip (single ZIP file)
```

### Python Upload Example
```python
with open("mindfulrecipes_boards.csv", "rb") as f:
    resp = requests.post(
        f"{BASE}/accounts/mindfulrecipes/upload-boards",
        headers=HEADERS,
        files={"csv": f}
    )
    print(resp.json())
    # {"success": true, "board_count": 12, "synced": true, "fetched_boards": 12}
```

---

## 3. Save Queue (`username_saves.csv` / `username_saves.txt`)

Used to queue pins for saving (repinning) to specific boards.

### CSV Format
```csv
pin_id,board_id
987654321,123456789
111222333,123456789
444555666,789012345
```

### TXT Format (one pair per line)
```
987654321:123456789
111222333:123456789
444555666:789012345
```

Both formats accept `pin_id,board_id` or `pin_id:board_id` pairs.

### Upload Endpoints

**Single account:**
```
POST /api/accounts/<username>/save-queue/upload
Content-Type: multipart/form-data
Field: file (.csv or .txt)
```

**Bulk:**
```
POST /api/import/save-queue
Content-Type: multipart/form-data
Field: files (named username_saves.csv or username_saves.txt) OR zip (single ZIP file)
```

### Python Upload Example
```python
with open("mindfulrecipes_saves.csv", "rb") as f:
    resp = requests.post(
        f"{BASE}/accounts/mindfulrecipes/save-queue/upload",
        headers=HEADERS,
        files={"file": f}
    )
    print(resp.json())
    # {"success": true, "added": 50, "total": 50}
```

---

## 4. Cookies ZIP

Upload cookies and fingerprints for multiple accounts in one ZIP.

### ZIP Structure
```
cookies_update.zip
├── familytablefood/
│   ├── cookies.json
│   └── fingerprint.json
├── mindfulrecipes/
│   ├── cookies.json
│   └── fingerprint.json
└── newaccount/
    └── cookies.json
```

- Each folder name = Pinterest username
- `cookies.json` is required per folder
- `fingerprint.json` is optional
- Accounts must already exist in the database (won't create new ones)

### Upload Endpoint
```
POST /api/import/cookies
Content-Type: multipart/form-data
Field: zip (file)
```

### Python Upload Example
```python
with open("cookies_update.zip", "rb") as f:
    resp = requests.post(
        f"{BASE}/import/cookies",
        headers=HEADERS,
        files={"zip": f}
    )
    print(resp.json())
    # {"success": true, "updated_count": 3, "skipped_count": 0, "error_count": 0}
```

---

## 5. Adding Pins via JSON (No CSV)

You can also add pins one at a time via JSON:

```python
resp = requests.post(
    f"{BASE}/accounts/mindfulrecipes/pins/queue",
    headers=HEADERS,
    json={
        "board_id": "123456789",
        "image_url": "https://example.com/photo.jpg",
        "title": "My Pin",
        "description": "Great recipe",
        "link": "https://myblog.com/recipe",
    }
)
print(resp.json())
# {"success": true, "index": 0, "total": 1}
```

---

## 6. Adding Save Queue Items via JSON

Queue individual pins for saving:

```python
# Upload via file
import io

content = "pin_id,board_id\n987654321,123456789\n111222333,123456789"
resp = requests.post(
    f"{BASE}/accounts/mindfulrecipes/save-queue/upload",
    headers=HEADERS,
    files={"file": ("saves.csv", io.BytesIO(content.encode()), "text/csv")}
)
```

---

## Upload Size Limits

| Upload Type | Max Size |
|------------|----------|
| cookies.json / fingerprint.json | 5 MB each |
| ZIP file (cookies/pins/boards/saves) | 100 MB |
| Individual ZIP entry | 10 MB |
| ZIP entries count | 5,000 max |
| Boards CSV | 5 MB |

---

## Column Name Flexibility

The CSV parser is case-insensitive and accepts common aliases:

| Standard | Also Accepted |
|----------|---------------|
| `board_id` | `Board ID` |
| `image_url` | `Image URL` |
| `name` | `Board Name`, `board_name` |
| `pin_id` | `Pin ID` |

Headers are matched by lowercased, trimmed values.
