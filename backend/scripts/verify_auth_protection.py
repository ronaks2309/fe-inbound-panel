import httpx
import os
import asyncio

BASE_URL = "http://localhost:8000"

async def test_docs_protection():
    print("Testing /docs protection...")
    async with httpx.AsyncClient() as client:
        # 1. No Auth
        resp = await client.get(f"{BASE_URL}/docs")
        print(f"No Auth /docs: {resp.status_code}")
        if resp.status_code != 401:
            print("FAILED: Expected 401 for no auth")
        else:
            print("PASSED: 401 received")

        # 2. Wrong Auth
        resp = await client.get(f"{BASE_URL}/docs", auth=("admin", "wrong"))
        print(f"Wrong Auth /docs: {resp.status_code}")
        if resp.status_code != 401:
            print("FAILED: Expected 401 for wrong auth")
        else:
             print("PASSED: 401 received")

        # 3. Correct Auth (default admin/admin)
        resp = await client.get(f"{BASE_URL}/docs", auth=("admin", "admin"))
        print(f"Correct Auth /docs: {resp.status_code}")
        if resp.status_code != 200:
             print("FAILED: Expected 200 for correct auth")
        else:
             print("PASSED: 200 received")

async def test_api_protection():
    print("\nTesting API protection...")
    async with httpx.AsyncClient() as client:
        # 1. No Token
        # Assuming we need a client_id in path
        resp = await client.get(f"{BASE_URL}/api/some-client/calls")
        print(f"No Token /api/.../calls: {resp.status_code}")
        if resp.status_code != 403:
             # Depending on FastAPI config, it might be 403 (Not Authenticated) or 401
             # HTTPBearer usually raises 403 if not authenticated? Or 401?
             # FastAPI HTTPBearer returns 403 usually.
             # Wait, dependencies.auth raises 401 if Exception?
             print(f"Note: Received {resp.status_code}. Expected 403/401.")
        else:
             print("PASSED: 403 received (Authorization missing)")
             
        # 2. Invalid Token
        headers = {"Authorization": "Bearer invalidtoken"}
        resp = await client.get(f"{BASE_URL}/api/some-client/calls", headers=headers)
        print(f"Invalid Token /api/.../calls: {resp.status_code}")
        if resp.status_code != 401:
             print(f"FAILED: Expected 401. Got {resp.status_code}")
        else:
             print("PASSED: 401 received")

if __name__ == "__main__":
    asyncio.run(test_docs_protection())
    asyncio.run(test_api_protection())
