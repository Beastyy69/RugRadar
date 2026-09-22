// Manual check script for Step 2. Connects to the real MongoDB in .env,
// creates one throwaway Scan document, verifies it, then deletes it -
// nothing is left behind in the database.
//
// Run from the server/ directory:
//   node test/test-step2-db.js

require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../db/connect");
const Scan = require("../models/Scan");

async function run() {
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    throw new Error("Not connected to MongoDB - check MONGODB_URI in .env");
  }
  console.log("[PASS] Connected to MongoDB");

  const testScan = await Scan.create({
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    chainId: 1,
    score: 10,
    level: "low",
    reasons: ["test reason"],
    features: { is_honeypot: false },
  });
  console.log("[PASS] created a test Scan document with id", testScan._id.toString());

  console.log("[PASS] a scan document saves and round-trips");

  // Base58 Bitcoin addresses are case-SENSITIVE. The model used to lowercase
  // every address, which silently turned real Bitcoin addresses into invalid
  // ones in scan history. It must store them exactly as given.
  const btcAddress = "123WBUDmSJv4GctdVEz6Qq6z8nXSKrJ4KX";
  const btcScan = await Scan.create({
    address: btcAddress,
    chainId: "btc",
    addressType: "utxo_address",
    score: 100,
    level: "high",
  });
  if (btcScan.address !== btcAddress) {
    throw new Error(`Bitcoin address was altered on save: ${btcScan.address}`);
  }
  await Scan.deleteOne({ _id: btcScan._id });
  console.log("[PASS] a case-sensitive Bitcoin address is stored unchanged");

  const fetched = await Scan.findById(testScan._id);
  if (!fetched) {
    throw new Error("could not fetch the created scan back from MongoDB");
  }
  console.log("[PASS] fetched the created scan back from MongoDB");

  await Scan.deleteOne({ _id: testScan._id });
  console.log("[PASS] cleaned up the test document (nothing left behind)");

  await mongoose.disconnect();
  console.log("\nAll Step 2 checks completed.");
}

run().catch((error) => {
  console.error("Step 2 test failed:", error.message);
  process.exit(1);
});
