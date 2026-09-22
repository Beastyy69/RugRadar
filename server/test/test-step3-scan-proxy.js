// Manual check script for Step 3.
// Precondition: ml-service must already be running (see ../../ml-service/README.md).
// Spawns this Express server on a separate test port, hits it, then tears down.
// Any Scan documents this test creates in MongoDB are deleted afterward.
//
// Run from the server/ directory:
//   node test/test-step3-scan-proxy.js

const { spawn } = require("child_process");
const path = require("path");

require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../db/connect");
const Scan = require("../models/Scan");

const TEST_PORT = 4099;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD"; // valid shape, no token here

async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return true;
    } catch {
      // server not up yet, keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function testScanReturnsFullResult() {
  const res = await fetch(`${BASE_URL}/api/scan?address=${WETH_ADDRESS}`);
  const body = await res.json();
  if (res.status !== 200) throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(body)}`);
  for (const key of ["address", "score", "level", "reasons", "features"]) {
    if (!(key in body)) throw new Error(`missing key '${key}' in response`);
  }
  if (body.score < 0 || body.score > 100) throw new Error("score out of range");
  console.log(`[PASS] /api/scan on real token (WETH) returns full result: score=${body.score} level=${body.level}`);
}

async function testMissingAddressReturns400() {
  const res = await fetch(`${BASE_URL}/api/scan`);
  if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
  console.log("[PASS] /api/scan with no address query param returns 400");
}

async function testInvalidAddressReturns400() {
  const res = await fetch(`${BASE_URL}/api/scan?address=not-an-address`);
  if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
  console.log("[PASS] /api/scan with a malformed address returns 400 (forwarded from ml-service)");
}

async function testNonTokenAddressIsScoredAsAnAddress() {
  // This used to be a 404. Since the universal-scan change, an address that
  // isn't a token is scored against GoPlus's malicious-address records.
  const res = await fetch(`${BASE_URL}/api/scan?address=${BURN_ADDRESS}`);
  if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
  const body = await res.json();
  if (body.address_type !== "address") throw new Error(`expected address_type 'address', got '${body.address_type}'`);
  console.log(`[PASS] a non-token address is scored as an address (score=${body.score}), not a 404`);
}

async function testCorsHeaderPresent() {
  const res = await fetch(`${BASE_URL}/api/scan?address=${WETH_ADDRESS}`, {
    headers: { Origin: "http://localhost:3000" },
  });
  const header = res.headers.get("access-control-allow-origin");
  if (header !== "*") throw new Error(`expected CORS header '*', got '${header}'`);
  console.log("[PASS] CORS header is present, so the React app can call this API");
}

async function testScanWasSavedToMongoDB() {
  await connectDB();
  const saved = await Scan.findOne({ address: WETH_ADDRESS.toLowerCase() }).sort({ createdAt: -1 });
  if (!saved) throw new Error("expected a saved Scan document for WETH, found none");
  console.log("[PASS] successful scan was saved to MongoDB with score", saved.score);

  // Clean up so re-running this script doesn't pile up junk in real history.
  const { deletedCount } = await Scan.deleteMany({ address: WETH_ADDRESS.toLowerCase() });
  console.log(`[PASS] cleaned up ${deletedCount} test document(s) for WETH`);
  await mongoose.disconnect();
}

async function main() {
  const serverProcess = spawn("node", ["index.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: "ignore",
  });

  try {
    const up = await waitForServer();
    if (!up) throw new Error("test server did not start in time - is ml-service running?");

    await testScanReturnsFullResult();
    await testMissingAddressReturns400();
    await testInvalidAddressReturns400();
    await testNonTokenAddressIsScoredAsAnAddress();
    await testCorsHeaderPresent();
    await testScanWasSavedToMongoDB();

    console.log("\nAll Step 3 checks completed.");
  } finally {
    serverProcess.kill();
  }
}

main().catch((error) => {
  console.error("Step 3 test failed:", error.message);
  process.exit(1);
});
