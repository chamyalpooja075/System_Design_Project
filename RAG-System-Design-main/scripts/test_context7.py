#!/usr/bin/env python3
"""
Test script to verify connectivity and documentation retrieval
with the Context7 Model Context Protocol (MCP) server.
"""

import os
import json
import urllib.request
import urllib.error

ENDPOINT = "https://mcp.context7.com/mcp"
API_KEY = os.environ.get("CONTEXT7_API_KEY", "").strip()

if not API_KEY and os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("CONTEXT7_API_KEY="):
                API_KEY = line.split("=", 1)[1].strip()
                break

def send_rpc(method: str, params: dict, req_id: int = 1):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"

    payload = {
        "jsonrpc": "2.0",
        "id": req_id,
        "method": method,
        "params": params,
    }

    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            raw = res.read().decode("utf-8")
            # Parse SSE message line
            for line in raw.splitlines():
                if line.startswith("data: "):
                    return json.loads(line[6:])
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        return {"error": {"code": e.code, "message": str(e)}}
    except Exception as e:
        return {"error": {"code": -1, "message": str(e)}}

def main():
    print(f"[Context7] Testing endpoint: {ENDPOINT}")
    if API_KEY:
        print("[Context7] API Key detected: Yes (Authenticated mode)")
    else:
        print("[Context7] API Key detected: No (Public / Community mode)")

    # 1. Initialize Handshake
    init_res = send_rpc("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "Antigravity-Client", "version": "1.0"},
    }, req_id=1)
    
    if "result" in init_res and "serverInfo" in init_res["result"]:
        server = init_res["result"]["serverInfo"]
        print(f"[Context7] Connected to {server.get('name')} v{server.get('version')}")
    else:
        print(f"[Context7] Handshake error: {init_res}")
        return False

    # 2. List Tools
    tools_res = send_rpc("tools/list", {}, req_id=2)
    tool_names = [t["name"] for t in tools_res.get("result", {}).get("tools", [])]
    print(f"[Context7] Available MCP tools: {', '.join(tool_names)}")

    # 3. Resolve Library ID (e.g. Prisma)
    print("[Context7] Testing 'resolve-library-id' for 'Prisma'...")
    resolve_res = send_rpc("tools/call", {
        "name": "resolve-library-id",
        "arguments": {
            "libraryName": "Prisma",
            "query": "Prisma models and sqlite datasource",
        },
    }, req_id=3)

    resolve_text = ""
    if "result" in resolve_res:
        content = resolve_res["result"].get("content", [])
        if content:
            resolve_text = content[0].get("text", "")
            print(f"[Context7] Successfully resolved libraries ({len(resolve_text)} chars)")
    
    # 4. Query Documentation
    print("[Context7] Testing 'query-docs' for libraryId '/prisma/web'...")
    query_res = send_rpc("tools/call", {
        "name": "query-docs",
        "arguments": {
            "libraryId": "/prisma/web",
            "query": "sqlite datasource",
            "language": "TypeScript",
        },
    }, req_id=4)

    if "result" in query_res:
        content = query_res["result"].get("content", [])
        if content:
            snippet = content[0].get("text", "")[:250].strip()
            print(f"[Context7] Retrieved documentation snippet:\n---\n{snippet}\n---")
            print("[Context7] Documentation retrieval verification PASSED.")
            return True

    print(f"[Context7] Retrieval failed: {query_res}")
    return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
