# KeysGithubScanner - New Scanner Creation Guide

## Project Overview

This project scans GitHub for exposed API keys across 85+ services. Each service has its own scanner directory with a consistent structure.

## Scanner Directory Structure

Each scanner lives in `{service}-scanner/` directory with these core files:

```
{service}-scanner/
├── run.py              # Interactive menu entry point
├── config.py           # Configuration, API settings, search queries
├── scanner_fast.py     # Parallel GitHub scanning implementation
├── tokens.txt          # GitHub tokens (auto-created on first run)
├── keys.txt            # Found API keys (output)
├── found_keys.json     # Detailed found keys with metadata
└── scan_progress.json  # Scan progress for resume capability
```

## Core Files Specification

### 1. config.py

```python
#!/usr/bin/env python3
"""
{SERVICE} Scanner Configuration
API Key Pattern: {pattern description}
Example: {example_key}
"""

# API Configuration
SERVICE_API_URL = "https://api.service.com/endpoint"

# File paths
TOKENS_FILE = "tokens.txt"
FOUND_KEYS_FILE = "keys.txt"
FOUND_KEYS_JSON = "found_keys.json"
SCAN_PROGRESS_FILE = "scan_progress.json"
VALIDATION_REPORT = "validation_report.json"

# Scanning settings
DELAY_BETWEEN_QUERIES = 0.8
MAX_RESULTS_PER_QUERY = 1000
MAX_PAGES = 10
PARALLEL_QUERIES = 15
PARALLEL_FILE_DOWNLOADS = 10
VALIDATION_TIMEOUT = 10

# Search queries for {SERVICE} API keys
SEARCH_QUERIES = [
    # SDK/Package specific queries
    '"service" extension:json',
    'require("service")',
    'from "service"',
    'import service',

    # Environment variable patterns
    'SERVICE_API_KEY= extension:env',
    'process.env.SERVICE_API_KEY',

    # Direct API key patterns
    '"api.service.com" "sk-"',
    '"https://api.service.com" "sk-"',

    # Language-specific queries
    '"service" language:Python',
    '"service" extension:py',
    '"service" language:JavaScript',
    '"service" extension:js',

    # Configuration files
    '.env "SERVICE_API_KEY"',
    'config.json "service"',

    # Authorization headers
    '"Authorization" "Bearer sk-" service',

    # ... (100-500+ queries for comprehensive coverage)
]

print(f"Loaded {len(SEARCH_QUERIES)} search queries for {SERVICE} API keys")
```

### 2. scanner_fast.py

Key components:
- `TokenManager` class: Manages GitHub token rotation with rate limit handling
- `extract_keys_from_content()`: Regex-based key extraction
- `search_github_query()`: GitHub API search with pagination via Link headers
- `download_file_content()`: Raw file download from GitHub
- `process_file()`: Extract keys from individual files
- `save_keys()`: Persist found keys to keys.txt and found_keys.json
- `scan()`: Main parallel scanning with ThreadPoolExecutor

### 3. run.py

Interactive menu with options:
1. Run Standard Scanner (sequential)
2. Run Fast Scanner (parallel) - recommended
3. Validate Found Keys
4. View Results
5. Clean/Reset Progress
6. Exit

## Adding New Scanner to unified_launcher.py

Add entry to `SCANNERS` dict (lines 33-119):

```python
SCANNERS = {
    # ... existing entries ...
    86: ("NewService Scanner", "pattern description", "run_new_service_scanner"),
}
```

Add runner function:

```python
def run_new_service_scanner():
    """Run NewService scanner"""
    print(f"\n{Fore.CYAN}🔮 Starting NewService Scanner...{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}Target: YOUR_API_KEY_PATTERN{Style.RESET_ALL}\n")

    if not check_tokens("newservice-scanner"):
        return

    scanner_path = os.path.join(SCRIPT_DIR, "newservice-scanner")
    subprocess.run([sys.executable, "run.py"], cwd=scanner_path)
```

## API Key Pattern Examples

| Service | Pattern | Example |
|---------|---------|---------|
| DeepSeek | `sk-` + 32 hex | `sk-9d3fbd6fbd1d4b749e2e035182bb023e` |
| OpenAI | `sk-proj-*` or `sk-*` | `sk-proj-xxxxxx` |
| Claude | `sk-ant-api03-` + 48 chars | `sk-ant-api03-xxxxxx` |
| Gemini | `AIza` + 35 chars | `AIzaSyDxxxxxx` |

## Search Query Strategy

Generate queries covering:
1. SDK/package imports (`import service`, `require("service")`)
2. Environment variables (`SERVICE_API_KEY=`, `process.env.SERVICE_API_KEY`)
3. Direct API URLs (`api.service.com`, `https://api.service.com`)
4. Language-specific (`language:Python`, `extension:py`, `extension:js`)
5. Config files (`.env`, `config.json`, `settings.json`)
6. Authorization headers (`Bearer token`, `Authorization: ApiKey`)
7. Code patterns (`api_key = "sk-"`, `const apiKey = "sk-"`)
8. Error messages related to the service

## Standard File Paths

All scanners use these consistent file path variables:
- `TOKENS_FILE = "tokens.txt"` - GitHub Personal Access Tokens
- `FOUND_KEYS_FILE = "keys.txt"` - Raw found keys (one per line)
- `FOUND_KEYS_JSON = "found_keys.json"` - Keys with metadata
- `SCAN_PROGRESS_FILE = "scan_progress.json"` - Resume progress
- `VALIDATION_REPORT = "validation_report.json"` - Validation results

## Parallelism Settings

Typical values from existing scanners:
- `PARALLEL_QUERIES = 15-20` - Concurrent GitHub API queries
- `PARALLEL_FILE_DOWNLOADS = 10-30` - Concurrent file downloads
- `MAX_RESULTS_PER_QUERY = 1000` - Max results per search query

## Quick Start Template

1. Create directory: `{service}-scanner/`
2. Create `config.py` with API URL, file paths, and 100+ search queries
3. Create `scanner_fast.py` using DeepSeek scanner as template
4. Create `run.py` menu using DeepSeek scanner as template
5. Add entry to `unified_launcher.py`
6. Test with: `python {service}-scanner/run.py`

## Notes

- Validators are custom per-service and not covered by this skill
- GitHub tokens need `repo` scope for code search
- Token rate limit: 30 search queries/minute for authenticated requests
- Use `TokenManager` class for automatic token rotation and cooldown
- Progress is saved after each batch for resume capability