// Manual check script for Step 4.
// Precondition: ml-service must already be running (see ../../ml-service/README.md).
// Spawns this Express server on a separate test port, scans 2 tokens to
// populate history, checks /api/history, then deletes its own test data.
//
// Run from the server/ directory:
//   node test/test-step4-history.js

const { spawn } = require("child_process");
const path = require("path");

require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../db/connect");
const Scan = require("../models/Scan");

const TEST_PORT = 4098;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

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

async function scanToken(address) {
  const res = await fetch(`${BASE_URL}/api/scan?address=${address}`);
  if (!res.ok) throw new Error(`scan of ${address} failed with status ${res.status}`);
  return res.json();
}

async function testHistoryContainsRecentScans() {
  await scanToken(WETH_ADDRESS);
  await scanToken(UNI_ADDRESS);

  const res = await fetch(`${BASE_URL}/api/history`);
  if (!res.ok) throw new Error(`expected 200, got ${res.status}`);
  const body = await res.json();

  if (!Array.isArray(body.scans)) throw new Error("expected body.scans to be an array");
  if (body.scans.length < 2) throw new Error(`expected at least 2 scans, got ${body.scans.length}`);

  const addresses = body.scans.map((s) => s.address);
  if (!addresses.includes(WETH_ADDRESS.toLowerCase()) || !addresses.includes(UNI_ADDRESS.toLowerCase())) {
    throw new Error("expected both just-scanned tokens to appear in history");
  }
  console.log(`[PASS] /api/history includes both just-scanned tokens (count=${body.count})`);
}

async function testHistoryIsSortedNewestFirst() {
  const res = await fetch(`${BASE_URL}/api/history`);
  const body = await res.json();
  const timestamps = body.scans.map((s) => new Date(s.createdAt).getTime());
  const sorted = [...timestamps].sort((a, b) => b - a);
  if (JSON.stringify(timestamps) !== JSON.stringify(sorted)) {
    throw new Error("expected history to be sorted newest first");
  }
  console.log("[PASS] /api/history is sorted newest first");
}

async function testHistoryRespectsLimit() {
  const res = await fetch(`${BASE_URL}/api/history?limit=1`);
  const body = await res.json();
  if (body.scans.length !== 1) throw new Error(`expected exactly 1 result, got ${body.scans.length}`);
  console.log("[PASS] /api/history?limit=1 returns exactly 1 result");
}

async function cleanupTestData() {
  await connectDB();
  const { deletedCount } = await Scan.deleteMany({
    address: { $in: [WETH_ADDRESS.toLowerCase(), UNI_ADDRESS.toLowerCase()] },
  });
  console.log(`[PASS] cleaned up ${deletedCount} test document(s) (nothing left behind in real history)`);
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

    await testHistoryContainsRecentScans();
    await testHistoryIsSortedNewestFirst();
    await testHistoryRespectsLimit();

    console.log("\nAll Step 4 checks completed.");
  } finally {
    serverProcess.kill();
    await cleanupTestData();
  }
}

main().catch((error) => {
  console.error("Step 4 test failed:", error.message);
  process.exit(1);
});
