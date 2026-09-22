# Manual check script for Step 5 (no pytest, kept simple).
# Starts a real uvicorn server on a test port, hits it with `requests`
# (already a dependency), then shuts it down. No new dependencies needed.
#
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step5_api

import subprocess
import sys
import time

import requests

TEST_PORT = 8001
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"

WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD"  # valid shape, no token here


def _wait_for_server(timeout_seconds=15):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=1)
            if response.status_code == 200:
                return True
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(0.5)
    return False


def test_scan_returns_full_result_for_real_token():
    response = requests.get(f"{BASE_URL}/scan", params={"address": WETH_ADDRESS})
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body.keys()) == {
        "address", "chain_id", "address_type", "score", "level", "reasons", "features"
    }
    assert body["address_type"] == "token"
    assert body["address"] == WETH_ADDRESS.lower()
    assert 0 <= body["score"] <= 100
    assert body["level"] in ("low", "medium", "high")
    assert isinstance(body["reasons"], list)
    assert isinstance(body["features"], dict)
    print(f"[PASS] /scan on real token (WETH) returns full result: score={body['score']} level={body['level']}")


def test_scan_invalid_address_returns_400():
    response = requests.get(f"{BASE_URL}/scan", params={"address": "not-an-address"})
    assert response.status_code == 400, response.text
    print("[PASS] /scan with a malformed address returns 400")


def test_non_token_address_is_scored_as_an_address():
    # This used to be a 404. Since Step 10, an address that isn't a token
    # falls back to being scored against GoPlus's malicious-address records.
    response = requests.get(f"{BASE_URL}/scan", params={"address": BURN_ADDRESS})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["address_type"] == "address"
    print(f"[PASS] a non-token address is scored as an address (score={body['score']}), not a 404")


def test_cors_header_present():
    response = requests.get(
        f"{BASE_URL}/scan",
        params={"address": WETH_ADDRESS},
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.headers.get("access-control-allow-origin") == "*"
    print("[PASS] CORS header is present, so the React app can call this API")


if __name__ == "__main__":
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(TEST_PORT)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        if not _wait_for_server():
            raise RuntimeError("Test server did not start in time")

        test_scan_returns_full_result_for_real_token()
        test_scan_invalid_address_returns_400()
        test_non_token_address_is_scored_as_an_address()
        test_cors_header_present()
        print("\nAll Step 5 checks completed.")
    finally:
        server_process.terminate()
        server_process.wait(timeout=5)
