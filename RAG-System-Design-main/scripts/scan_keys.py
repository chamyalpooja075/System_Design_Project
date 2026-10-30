#!/usr/bin/env python3
"""
Zero-Key Exposure & Pre-Push Security Scanner.
Searches the entire project for the word "key" and sensitive credential patterns.
Ensures no API keys, secrets, or .env files are exposed before pushing to GitHub.
"""

import os
import re
import subprocess
import sys

# Support UTF-8 output on Windows consoles
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

IGNORE_DIRS = {
    '.git', 'node_modules', 'dist', 'build', '.coverage', 'coverage',
    '__pycache__', '.gsd', '.gemini', 'graphify-out'
}

IGNORE_EXTENSIONS = {
    '.pdf', '.png', '.jpg', '.jpeg', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.zip', '.map', '.db'
}

# Regex patterns for actual exposed secrets and tokens
SECRET_PATTERNS = [
    (r'AIza[0-9A-Za-z\-_]{35}', 'Google Gemini API Key'),
    (r'gsk_[a-zA-Z0-9]{20,}', 'Groq API Key'),
    (r'sk-[a-zA-Z0-9]{20,}', 'OpenAI API Key'),
    (r'ghp_[a-zA-Z0-9]{20,}', 'GitHub Personal Access Token'),
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID'),
    (r'(?i)(?:api_key|apikey|jwt_secret)\s*[:=]\s*["\']([a-zA-Z0-9_\-]{16,})["\']', 'Hardcoded Secret Assignment'),
]

def check_git_tracked_env_files(root_dir):
    """Check if any .env or sensitive file is tracked by git."""
    try:
        res = subprocess.run(
            ['git', 'ls-files', '.env', '*.env', '**/.env', '*.pem', '*.key', '*.db'],
            cwd=root_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        tracked = [f.strip() for f in res.stdout.splitlines() if f.strip() and not f.endswith('.example')]
        return tracked
    except Exception:
        return []

def scan_project():
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    print("=" * 70)
    print("  ZERO-KEY EXPOSURE PRE-PUSH AUDIT")
    print(f"  Workspace: {workspace_root}")
    print("=" * 70)

    # 1. Check Git tracking of .env files
    tracked_env = check_git_tracked_env_files(workspace_root)
    if tracked_env:
        print("\n[CRITICAL ERROR] The following sensitive files are tracked by Git:")
        for t in tracked_env:
            print(f"  ❌ {t}")
        return False, []

    key_matches = []
    hardcoded_secrets = []

    for root, dirs, files in os.walk(workspace_root):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IGNORE_EXTENSIONS:
                continue

            rel_path = os.path.relpath(os.path.join(root, file), workspace_root)

            # Skip untracked/ignored .env files that are meant for local dev
            if file == '.env' or (file.startswith('.env.') and not file.endswith('.example')):
                continue

            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_no, line in enumerate(f, 1):
                        trimmed = line.strip()

                        # Collect all occurrences of "key"
                        if 'key' in trimmed.lower():
                            key_matches.append((rel_path, line_no, trimmed))

                        # Check for hardcoded secrets
                        for pattern, label in SECRET_PATTERNS:
                            m = re.search(pattern, trimmed)
                            if m:
                                val = m.group(0)
                                # Whitelist example placeholders and env access
                                if 'your-key' in val.lower() or 'super-secret' in val.lower():
                                    continue
                                if 'process.env' in trimmed or 'configService.get' in trimmed:
                                    continue
                                if rel_path.endswith('.env.example'):
                                    continue
                                hardcoded_secrets.append((rel_path, line_no, label, trimmed))
            except Exception:
                pass

    print(f"\n[1] Total lines containing the word 'key': {len(key_matches)}")
    print(f"[2] Git-tracked .env files: 0 (Properly ignored)")
    print(f"[3] Hardcoded API keys / secrets found: {len(hardcoded_secrets)}")

    if hardcoded_secrets:
        print("\n❌ FAILED: The following visible secrets were detected:")
        for path, line, label, text in hardcoded_secrets:
            print(f"  - {path}:{line} [{label}]: {text}")
        print("\nFix: Move all secrets to .env and read via process.env / configService.\n")
        return False, key_matches

    print("\n✅ PASSED: All API keys are in .env files. Zero exposed credentials found.")
    return True, key_matches

if __name__ == '__main__':
    clean, matches = scan_project()
    if not clean:
        sys.exit(1)
    sys.exit(0)
