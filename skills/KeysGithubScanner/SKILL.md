---
name: KeysGithubScanner
description: Step-by-step guide for creating a new API key scanner that searches GitHub for exposed API keys, downloads matching files, extracts keys with regex patterns, and validates them against the real service API. Use when building or extending the KeysGithubScanner toolkit with a new service scanner.
---

# KeysGithubScanner - New Scanner Creation Guide

Comprehensive guide for creating a new API key scanner. Any AI agent can follow this guide to build a scanner for any API service.

---

## Table of Contents

1. [Overview](#overview)
2. [Scanner Directory Structure](#scanner-directory-structure)
3. [Step-by-Step Creation](#step-by-step-creation)
4. [File Templates](#file-templates)
5. [config.py Detailed Specification](#configpy-detailed-specification)
6. [scanner_fast.py Detailed Specification](#scanner_fastpy-detailed-specification)
7. [run.py Detailed Specification](#runpy-detailed-specification)
8. [unified_launcher.py Integration](#unified_launcherpy-integration)
9. [Search Query Generation](#search-query-generation)
10. [Testing Your Scanner](#testing-your-scanner)
11. [Troubleshooting](#troubleshooting)
12. [Examples](#examples)

---

## Overview

This project scans GitHub for exposed API keys by:
1. Searching GitHub code with keyword queries
2. Downloading matching files
3. Extracting API keys using regex patterns
4. Validating keys against the actual service API

Each scanner is self-contained in a `{service}-scanner/` directory.

---

## Scanner Directory Structure

```
{service}-scanner/
├── run.py              # Interactive menu (entry point)
├── config.py           # API settings & search queries
├── scanner_fast.py     # Parallel GitHub scanner
├── validator.py        # (Optional) Key validator
├── tokens.txt          # GitHub PATs — fallback only; prefer GITHUB_PERSONAL_ACCESS_TOKEN env var
├── keys.txt            # Found API keys
├── found_keys.json     # Keys with metadata
├── scan_progress.json  # Resume tracking
└── validation_report.json  # Validation results
```

---

## Step-by-Step Creation

### Step 1: Create the Directory

```bash
mkdir {service}-scanner
cd {service}-scanner
```

### Step 2: Create config.py

Create `config.py` with:
- API endpoint URL
- File paths
- Parallelism settings
- 100-500+ search queries

### Step 3: Create scanner_fast.py

Copy from `deepseek-scanner/scanner_fast.py` and modify:
- Class name
- API key regex pattern
- File processing logic

### Step 4: Create run.py

Copy from `deepseek-scanner/run.py` and modify:
- Banner text
- Scanner name

### Step 5: Add to unified_launcher.py

- Add entry to `SCANNERS` dict
- Add runner function
- Add to `run_all_scanners()` if desired

### Step 6: Test

```bash
python {service}-scanner/run.py
```

---

## File Templates

### Minimal config.py Template

```python
#!/usr/bin/env python3
"""
{SERVICE} Scanner Configuration
API Key Pattern: {describe the pattern}
Example: {example_key}
"""

SERVICE_API_URL = "https://api.service.com/endpoint"
SERVICE_NAME = "{Service}"

TOKENS_FILE = "tokens.txt"
FOUND_KEYS_FILE = "keys.txt"
FOUND_KEYS_JSON = "found_keys.json"
SCAN_PROGRESS_FILE = "scan_progress.json"
VALIDATION_REPORT = "validation_report.json"

DELAY_BETWEEN_QUERIES = 0.8
MAX_RESULTS_PER_QUERY = 1000
MAX_PAGES = 10
PARALLEL_QUERIES = 15
PARALLEL_FILE_DOWNLOADS = 10
VALIDATION_TIMEOUT = 10

SEARCH_QUERIES = [
    # Environment variables
    '"SERVICE_API_KEY" extension:env',
    'SERVICE_API_KEY= extension:env',

    # SDK imports
    '"service" extension:py',
    'import service',
    'from service import',

    # API URLs
    '"api.service.com"',
    '"https://api.service.com"',

    # Language-specific
    '"service" language:Python',
    '"service" extension:js',

    # Config files
    '.env "SERVICE_API_KEY"',
    'config.json "service"',

    # Add 100+ more queries covering all variations...
]

print(f"Loaded {len(SEARCH_QUERIES)} search queries for {SERVICE_NAME}")
```

### Minimal scanner_fast.py Template

```python
#!/usr/bin/env python3
"""
{SERVICE} Scanner - Fast Parallel Mode
"""

import os
import sys
import re
import json
import time
from datetime import datetime
from typing import List, Dict, Set
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
    from tqdm import tqdm
    from colorama import init, Fore, Style
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "requests", "tqdm", "colorama"])
    import requests
    from tqdm import tqdm
    from colorama import init, Fore, Style

init()
from config import *

class TokenManager:
    def __init__(self, tokens):
        self.tokens = tokens
        self.token_usage = {i: 0 for i in range(len(tokens))}
        self.token_last_used = {i: 0 for i in range(len(tokens))}

    def get_available_token(self):
        current_time = time.time()
        best_token = None
        min_usage = float('inf')

        for idx, usage in self.token_usage.items():
            time_since_use = current_time - self.token_last_used[idx]
            if time_since_use > 2 and usage < min_usage:
                best_token = idx
                min_usage = usage

        if best_token is not None:
            self.token_usage[best_token] += 1
            self.token_last_used[best_token] = current_time
            return best_token, self.tokens[best_token]

        time.sleep(2)
        idx = 0
        self.token_usage[idx] += 1
        self.token_last_used[idx] = time.time()
        return idx, self.tokens[idx]

class ServiceFastScanner:
    def __init__(self):
        self.tokens = self.load_github_tokens()
        self.token_manager = TokenManager(self.tokens)
        self.found_keys = set()
        self.processed_queries = set()
        self.progress = self.load_progress()
        self.sessions = [requests.Session() for _ in self.tokens]
        self.session = requests.Session()

    def load_github_tokens(self) -> List[str]:
        # 1. Prefer the GITHUB_PERSONAL_ACCESS_TOKEN environment variable.
        #    Supports a single token or several comma/newline-separated tokens.
        env_value = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN", "").strip()
        if env_value:
            tokens = [t.strip() for t in re.split(r"[,\n]", env_value) if t.strip()]
            if tokens:
                print(f"{Fore.GREEN}Loaded {len(tokens)} GitHub token(s) from "
                      f"GITHUB_PERSONAL_ACCESS_TOKEN")
                return tokens

        # 2. Fallback: read tokens from tokens.txt (one per line, # for comments).
        if os.path.exists(TOKENS_FILE):
            with open(TOKENS_FILE, 'r') as f:
                tokens = [line.strip() for line in f
                          if line.strip() and not line.startswith('#')]
            if tokens:
                print(f"{Fore.GREEN}Loaded {len(tokens)} GitHub tokens from {TOKENS_FILE}")
                return tokens

        print(f"{Fore.RED}Error: no GitHub tokens found.")
        print(f"{Fore.YELLOW}Set the GITHUB_PERSONAL_ACCESS_TOKEN environment variable, "
              f"or add tokens to {TOKENS_FILE} (one per line).")
        sys.exit(1)

    def load_progress(self) -> Dict:
        if os.path.exists(SCAN_PROGRESS_FILE):
            try:
                with open(SCAN_PROGRESS_FILE, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {"processed_queries": [], "timestamp": None}

    def save_progress(self):
        self.progress["processed_queries"] = list(self.processed_queries)
        self.progress["timestamp"] = datetime.now().isoformat()
        with open(SCAN_PROGRESS_FILE, 'w') as f:
            json.dump(self.progress, f, indent=2)

    def extract_keys_from_content(self, content: str) -> List[Dict]:
        # MODIFY THIS: Replace with actual API key regex pattern
        pattern = r'YOUR_PATTERN_HERE'

        found_items = []
        seen_in_content = set()
        matches = re.finditer(pattern, content, re.IGNORECASE)

        for match in matches:
            key = match.group(0)
            if key in seen_in_content:
                continue
            seen_in_content.add(key)

            # MODIFY THIS: Add length/format validation if needed
            found_items.append({
                "key": key,
                "length": len(key),
                "service": SERVICE_NAME,
                "timestamp": datetime.now().isoformat()
            })
        return found_items

    def _parse_link_header(self, link_header: str):
        if not link_header:
            return None
        next_pattern = r'<([^>]+)>;\s*rel="next"'
        match = re.search(next_pattern, link_header)
        return match.group(1) if match else None

    def search_github_query(self, query: str, query_idx: int) -> List[Dict]:
        results = []
        next_url = None
        first_page = True

        while len(results) < MAX_RESULTS_PER_QUERY:
            try:
                token_idx, token = self.token_manager.get_available_token()
                headers = {
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "API-Key-Scanner"
                }
                session = self.sessions[token_idx]

                if first_page:
                    response = session.get(
                        "https://api.github.com/search/code",
                        headers=headers,
                        params={"q": query, "per_page": 100},
                        timeout=10
                    )
                    first_page = False
                else:
                    if next_url:
                        response = session.get(next_url, headers=headers, timeout=10)
                    else:
                        break

                if response.status_code == 403:
                    time.sleep(5)
                    continue
                if response.status_code != 200:
                    break

                data = response.json()
                items = data.get("items", [])
                if not items:
                    break

                results.extend(items)
                link_header = response.headers.get('Link', '')
                next_url = self._parse_link_header(link_header)
                if not next_url:
                    break
                time.sleep(0.5)

            except Exception:
                break

        return results[:MAX_RESULTS_PER_QUERY]

    def _get_raw_url(self, html_url):
        if 'github.com' in html_url and '/blob/' in html_url:
            return html_url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
        return html_url

    def download_file_content(self, file_url: str) -> str:
        try:
            raw_url = self._get_raw_url(file_url)
            response = self.session.get(raw_url, timeout=15, headers={'User-Agent': 'API-Key-Scanner'})
            if response.status_code == 200:
                return response.text
        except:
            pass
        return ""

    def process_file(self, item: Dict) -> List[Dict]:
        found_items = []
        try:
            file_url = item.get("html_url", "")
            repository = item.get("repository", {}).get("full_name", "")
            content = self.download_file_content(file_url)
            if content:
                keys = self.extract_keys_from_content(content)
                for key_data in keys:
                    if key_data["key"] not in self.found_keys:
                        self.found_keys.add(key_data["key"])
                        key_data["file_url"] = file_url
                        key_data["repository"] = repository
                        found_items.append(key_data)
        except:
            pass
        return found_items

    def save_keys(self, new_keys: List[Dict]):
        with open(FOUND_KEYS_FILE, 'a') as f:
            for item in new_keys:
                f.write(f"{item['key']}\n")

        existing_data = {"keys": [], "scan_info": {}}
        if os.path.exists(FOUND_KEYS_JSON):
            try:
                with open(FOUND_KEYS_JSON, 'r') as f:
                    existing_data = json.load(f)
            except:
                pass

        existing_data["keys"].extend(new_keys)
        existing_data["scan_info"]["last_scan"] = datetime.now().isoformat()
        existing_data["scan_info"]["total_keys"] = len(existing_data["keys"])

        with open(FOUND_KEYS_JSON, 'w') as f:
            json.dump(existing_data, f, indent=2)

    def scan(self):
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{SERVICE_NAME} Scanner - FAST MODE")
        print(f"{'='*60}{Style.RESET_ALL}\n")

        self.processed_queries = set(self.progress.get("processed_queries", []))
        queries_to_process = [q for q in SEARCH_QUERIES if q not in self.processed_queries]

        if not queries_to_process:
            print(f"{Fore.YELLOW}All queries processed. Delete {SCAN_PROGRESS_FILE} to restart.")
            return

        print(f"Queries to process: {len(queries_to_process)}")
        print(f"Parallel queries: {PARALLEL_QUERIES}")

        total_found = 0
        batch_size = min(PARALLEL_QUERIES, len(self.tokens))

        with tqdm(total=len(queries_to_process), desc="Overall Progress") as pbar:
            for i in range(0, len(queries_to_process), batch_size):
                batch = queries_to_process[i:i+batch_size]
                all_results = []

                with ThreadPoolExecutor(max_workers=batch_size) as executor:
                    futures = [(q, executor.submit(self.search_github_query, q, idx)) for idx, q in enumerate(batch)]
                    for query, future in futures:
                        try:
                            results = future.result(timeout=30)
                            all_results.extend(results)
                            self.processed_queries.add(query)
                        except:
                            self.processed_queries.add(query)
                        pbar.update(1)

                if all_results:
                    new_keys = []
                    with ThreadPoolExecutor(max_workers=PARALLEL_FILE_DOWNLOADS) as executor:
                        futures = [executor.submit(self.process_file, item) for item in all_results]
                        for future in as_completed(futures):
                            try:
                                keys = future.result(timeout=10)
                                new_keys.extend(keys)
                                for key_data in keys:
                                    print(f"\n{Fore.GREEN}Found: {key_data['key']}")
                            except:
                                pass

                    if new_keys:
                        self.save_keys(new_keys)
                        total_found += len(new_keys)

                self.save_progress()

        print(f"\n{Fore.CYAN}Scan Complete!")
        print(f"Total new keys found: {total_found}")
        print(f"Total unique keys: {len(self.found_keys)}")

def main():
    scanner = ServiceFastScanner()
    try:
        scanner.scan()
    except KeyboardInterrupt:
        print(f"\nInterrupted by user")
        scanner.save_progress()
    except Exception as e:
        print(f"Error: {e}")
        scanner.save_progress()

if __name__ == "__main__":
    main()
```

### Minimal run.py Template

```python
#!/usr/bin/env python3
"""
{SERVICE} Scanner Runner
"""

import os
import sys
import time
from datetime import datetime

try:
    from colorama import init, Fore, Style
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "colorama"])
    from colorama import init, Fore, Style

init()

def print_banner():
    print(f"{Fore.CYAN}{'='*60}")
    print(f"{SERVICE_NAME} API Key Scanner")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    print(f"{Fore.YELLOW}Pattern: YOUR_API_KEY_PATTERN{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}Example: YOUR_EXAMPLE_KEY{Style.RESET_ALL}\n")

def check_tokens():
    # Prefer the env var.
    env_value = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN", "").strip()
    if env_value:
        import re
        tokens = [t.strip() for t in re.split(r"[,\n]", env_value) if t.strip()]
        if tokens:
            print(f"{Fore.GREEN}Found {len(tokens)} GitHub token(s) "
                  f"in GITHUB_PERSONAL_ACCESS_TOKEN")
            return True

    # Fallback to tokens.txt.
    if not os.path.exists("tokens.txt"):
        print(f"{Fore.YELLOW}No GITHUB_PERSONAL_ACCESS_TOKEN set and tokens.txt not found.")
        print("Creating tokens.txt as a fallback...")
        with open("tokens.txt", 'w') as f:
            f.write("# Add your GitHub tokens here, one per line.\n")
            f.write("# Or, recommended: set the GITHUB_PERSONAL_ACCESS_TOKEN env var instead.\n")
        return False

    with open("tokens.txt", 'r') as f:
        tokens = [line.strip() for line in f if line.strip() and not line.startswith('#')]

    if not tokens:
        print(f"{Fore.RED}No tokens found. Set GITHUB_PERSONAL_ACCESS_TOKEN "
              f"or add tokens to tokens.txt.")
        return False

    print(f"{Fore.GREEN}Found {len(tokens)} GitHub tokens in tokens.txt")
    return True

def get_stats():
    stats = {"keys_found": 0, "keys_validated": 0, "working_keys": 0}
    if os.path.exists("keys.txt"):
        with open("keys.txt", 'r') as f:
            stats["keys_found"] = len([l for l in f if l.strip()])
    if os.path.exists("validation_report.json"):
        import json
        with open("validation_report.json", 'r') as f:
            report = json.load(f)
            stats["keys_validated"] = report.get("total_keys_tested", 0)
            stats["working_keys"] = report.get("working_keys", 0)
    return stats

def main():
    print_banner()

    if not check_tokens():
        sys.exit(1)

    while True:
        stats = get_stats()
        print(f"\n{Fore.CYAN}Current Stats:")
        print(f"  Keys found: {stats['keys_found']}")
        print(f"  Keys validated: {stats['keys_validated']}")
        print(f"  Working keys: {stats['working_keys']}")

        print(f"\n{Fore.CYAN}Options:")
        print("1. Run Standard Scanner (slower)")
        print("2. Run Fast Scanner (parallel)")
        print("3. Validate Found Keys")
        print("4. View Results")
        print("5. Clean/Reset Progress")
        print("6. Exit")

        choice = input(f"\n{Fore.YELLOW}Select option (1-6): {Style.RESET_ALL}").strip()

        if choice == '1':
            os.system(f"{sys.executable} scanner.py")
        elif choice == '2':
            os.system(f"{sys.executable} scanner_fast.py")
        elif choice == '3':
            if stats["keys_found"] == 0:
                print(f"{Fore.YELLOW}No keys found yet!")
            else:
                os.system(f"{sys.executable} validator.py")
        elif choice == '4':
            files = ["keys.txt", "found_keys.json", "validation_report.json", "working_keys.txt"]
            for f in files:
                if os.path.exists(f):
                    print(f"  {f}")
        elif choice == '5':
            confirm = input("Delete progress? (y/n): ").strip().lower()
            if confirm == 'y':
                for f in ["scan_progress.json", "keys.txt", "found_keys.json"]:
                    if os.path.exists(f):
                        os.remove(f)
                print("Cleaned!")
        elif choice == '6':
            break

        if choice in ['1', '2', '3']:
            input(f"\n{Fore.YELLOW}Press Enter...{Style.RESET_ALL}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\nGoodbye!")
    except Exception as e:
        print(f"Error: {e}")
```

---

## config.py Detailed Specification

### Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `SERVICE_API_URL` | string | API endpoint for validation |
| `SERVICE_NAME` | string | Display name for the service |
| `TOKENS_FILE` | string | Path to GitHub tokens file |
| `FOUND_KEYS_FILE` | string | Path to output keys file |
| `FOUND_KEYS_JSON` | string | Path to JSON output |
| `SCAN_PROGRESS_FILE` | string | Path to progress file |
| `VALIDATION_REPORT` | string | Path to validation report |
| `SEARCH_QUERIES` | list | List of GitHub search queries |

### Optional Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DELAY_BETWEEN_QUERIES` | 0.8 | Delay between API calls |
| `MAX_RESULTS_PER_QUERY` | 1000 | Max results per query |
| `MAX_PAGES` | 10 | Max pagination pages |
| `PARALLEL_QUERIES` | 15 | Parallel search threads |
| `PARALLEL_FILE_DOWNLOADS` | 10 | Parallel download threads |
| `VALIDATION_TIMEOUT` | 10 | Timeout for validation requests |

### SEARCH_QUERIES Structure

Each query is a GitHub search string. Organize by category:

1. **Environment variables**: `'SERVICE_API_KEY extension:env'`
2. **SDK imports**: `'"service" extension:py'`, `'require("service")'`
3. **API URLs**: `'"api.service.com"'`, `'"https://api.service.com/v1"'`
4. **Language-specific**: `'"service" language:Python'`
5. **File extensions**: `'"service" extension:json'`
6. **Config files**: `'.env "SERVICE_KEY"'`, `'config.json "service"'`
7. **Code patterns**: `'"api_key = "sk-""'`, `'"const token = "'`
8. **Authorization**: `'"Bearer" "service"'`, `'"Authorization: ApiKey" "service"'`

---

## scanner_fast.py Detailed Specification

### Class: TokenManager

Manages GitHub token rotation to avoid rate limits.

```python
class TokenManager:
    def __init__(self, tokens: List[str]):
        self.tokens = tokens
        self.token_usage = {i: 0 for i in range(len(tokens))}
        self.token_last_used = {i: 0 for i in range(len(tokens))}

    def get_available_token(self) -> tuple:
        """Returns (token_index, token) with lowest usage"""
        # Implements cooldown and load balancing
```

### Class: ServiceFastScanner

Main scanner class with these key methods:

| Method | Purpose |
|--------|---------|
| `load_github_tokens()` | Load tokens from file |
| `load_progress()` | Load saved scan progress |
| `save_progress()` | Persist progress to disk |
| `extract_keys_from_content(content)` | Regex extraction |
| `search_github_query(query, idx)` | GitHub API search |
| `download_file_content(url)` | Get raw file content |
| `process_file(item)` | Extract keys from file |
| `save_keys(new_keys)` | Write keys to output |
| `scan()` | Main scanning loop |

### Key Regex Patterns by Service Type

| Service Type | Pattern Example |
|--------------|------------------|
| `sk-` prefix + 32 hex | `r'sk-[a-f0-9]{32}'` |
| API key + secret | `r'[A-Za-z0-9]{20,50}'` |
| Bearer tokens | `r'Bearer [A-Za-z0-9_-]+'` |
| UUID-based | `r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'` |

---

## run.py Detailed Specification

### Required Functions

| Function | Purpose |
|----------|---------|
| `print_banner()` | Display scanner header |
| `check_tokens()` | Verify tokens.txt exists |
| `get_stats()` | Get current scan statistics |
| `main()` | Interactive menu loop |

### Menu Options (Standard)

1. **Run Standard Scanner** - Sequential processing
2. **Run Fast Scanner** - Parallel processing (recommended)
3. **Validate Found Keys** - Test keys against API
4. **View Results** - List output files
5. **Clean/Reset Progress** - Delete scan state
6. **Exit** - Quit

---

## unified_launcher.py Integration

### Step 1: Add to SCANNERS Dict

Find the `SCANNERS` dict and add:

```python
SCANNERS = {
    # ... existing entries ...
    86: ("ServiceName Scanner", "key pattern description", "run_service_scanner"),
}
```

### Step 2: Add Runner Function

```python
def run_service_scanner():
    """Run ServiceName scanner"""
    print(f"\n{Fore.CYAN}🔷 Starting ServiceName Scanner...{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}Target: YOUR_KEY_PATTERN{Style.RESET_ALL}\n")

    if not check_tokens("service-scanner"):
        return

    scanner_path = os.path.join(SCRIPT_DIR, "service-scanner")
    subprocess.run([sys.executable, "run.py"], cwd=scanner_path)
```

### Step 3: (Optional) Add to run_all_scanners()

If you want the scanner included in "run all" mode, add a call to `run_service_scanner()` in the `run_all_scanners()` function.

---

## Search Query Generation

### Query Categories to Cover

1. **Service name variations**: `service`, `Service`, `SERVICE`, `service-api`
2. **SDK patterns**:
   - Python: `import service`, `from service import`
   - JavaScript: `require("service")`, `import from "service"`
   - Go: `import "service"`, `service.NewClient()`
3. **Environment variables**:
   - `SERVICE_API_KEY`, `SERVICE_KEY`, `SERVICE_SECRET`
   - `SERVICE_TOKEN`, `SERVICE_PASSWORD`
4. **API endpoints**:
   - `api.service.com`, `service.com/api`
   - `https://api.service.com/v1`
5. **Configuration files**:
   - `.env`, `.env.local`, `.env.production`
   - `config.json`, `settings.json`, `credentials.json`
   - `docker-compose.yml`, `kubernetes/*.yaml`
6. **Code patterns**:
   - `api_key = "xxx"`, `apiKey: "xxx"`
   - `Authorization: Bearer xxx`
   - `Authorization: ApiKey xxx`
7. **Documentation**:
   - `README.md`, `API.md`, `DOC.md`
8. **Error messages**:
   - `"invalid api key"`, `"authentication failed"`

### Query Format Examples

```
# Basic service name
"service" extension:py
"service" language:JavaScript

# With API key pattern
"sk-" "service"
"api_key" "service"

# Specific file types
"service" filename:.env
"service" path:.github/workflows

# Environment variables
SERVICE_API_KEY extension:env
process.env.SERVICE_API_KEY

# Bearer tokens
"Bearer" "api.service.com"
```

---

## Testing Your Scanner

### Test Data Preparation

1. Provide GitHub PATs in **either** of the following ways (env var preferred):
   - **Recommended:** set the `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable.
     For multiple tokens, separate them with commas or newlines:
     ```bash
     export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxx,ghp_yyy,ghp_zzz"
     ```
   - **Fallback:** create a `tokens.txt` file with one token per line.
2. Add a known test API key to `keys.txt` for validation testing.

### Run Tests

```bash
# Test scanner
cd service-scanner
python run.py
# Select option 2 (Fast Scanner)

# Test validator
python run.py
# Select option 3 (Validate)
```

### Verify Output Files

- `keys.txt` - Should contain found keys
- `found_keys.json` - Should contain keys with metadata
- `scan_progress.json` - Should show processed queries
- `validation_report.json` - Should show validation results

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No tokens found" | No env var and tokens.txt missing/empty | Set `GITHUB_PERSONAL_ACCESS_TOKEN` env var, or add tokens to tokens.txt |
| "403 Forbidden" | Rate limit exceeded | Wait or add more tokens |
| "No keys found" | Pattern incorrect | Verify regex in scanner_fast.py |
| "All queries processed" | Progress file not cleared | Delete scan_progress.json |
| Import errors | Dependencies not installed | Run: `pip install requests tqdm colorama` |

### Token Rate Limits

- Authenticated search: 30 queries/minute
- Unauthenticated: 10 queries/minute
- Use multiple tokens for faster scanning

### Debug Mode

Add to `scanner_fast.py` for debugging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## Examples

### Example 1: DeepSeek Scanner Pattern

```python
# Pattern: sk- + 32 hex characters
pattern = r'sk-[a-f0-9]{32}'
```

### Example 2: OpenAI Scanner Pattern

```python
# Pattern: sk-proj- or sk- prefix
pattern = r'sk-(?:proj-)?[a-zA-Z0-9_-]+'
```

### Example 3: Bearer Token Pattern

```python
# Pattern: Bearer token in Authorization header
pattern = r'Bearer\s+[A-Za-z0-9_-]+'
```

### Example 4: Multi-Format Pattern

```python
# Multiple formats supported
patterns = [
    r'sk-[a-f0-9]{32}',           # DeepSeek style
    r'sk-proj-[a-zA-Z0-9_-]+',    # OpenAI proj style
    r'Bearer\s+[A-Za-z0-9_-]+',   # Bearer style
]
```

---

## Checklist

Before declaring a scanner complete:

- [ ] `config.py` has 100+ search queries
- [ ] `config.py` has correct API URL
- [ ] `scanner_fast.py` has correct regex pattern
- [ ] `run.py` displays correct banner and options
- [ ] Entry added to `unified_launcher.py`
- [ ] Tested with: `python service-scanner/run.py`
- [ ] Verified `keys.txt` contains found keys
- [ ] Progress resumes correctly after interruption

---

## File Summary

| File | Purpose | Required |
|------|---------|----------|
| `config.py` | API config & queries | Yes |
| `scanner_fast.py` | GitHub scanning | Yes |
| `run.py` | Interactive menu | Yes |
| `validator.py` | Key validation | No (custom) |
| `GITHUB_PERSONAL_ACCESS_TOKEN` env var | GitHub PATs (preferred) | Yes — or `tokens.txt` |
| `tokens.txt` | GitHub PATs (fallback) | Auto-created if env var not set |

---

## Quick Copy

Copy these directories as templates:
- `deepseek-scanner/` - Full-featured example
- `sunoapi-scanner/` - Simpler example
- `minimax-scanner/` - Minimal example