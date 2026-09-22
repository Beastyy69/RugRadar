// GET /api/scan?address=0x...&chain_id=1
//
// Thin proxy in front of ml-service's /scan endpoint: forwards the request,
// passes through ml-service's response (and error status codes) as-is, and
// saves successful results to MongoDB for history. Saving to history is
// best-effort - if it fails, we still return the scan result to the client
// rather than failing the whole request over a secondary feature.

const express = require("express");

const Scan = require("../models/Scan");

const router = express.Router();

router.get("/scan", async (req, res) => {
  const { address, chain_id: chainIdParam } = req.query;
  // Kept as a string: GoPlus uses names like "solana"/"tron" as well as numbers.
  // Defaults to "auto" to match ml-service: hardcoding "1" here silently
  // disabled chain auto-detection for every request that came through the API.
  const chainId = chainIdParam ? String(chainIdParam) : "auto";

  if (!address) {
    return res.status(400).json({ detail: "address query parameter is required" });
  }

  const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
  const url = `${mlServiceUrl}/scan?address=${encodeURIComponent(address)}&chain_id=${chainId}`;

  let mlResponse;
  try {
    mlResponse = await fetch(url);
  } catch (error) {
    return res.status(502).json({ detail: `Could not reach ml-service: ${error.message}` });
  }

  const body = await mlResponse.json().catch(() => null);

  if (!mlResponse.ok) {
    // Forward ml-service's status code (400/404/502/etc) and error detail as-is.
    return res.status(mlResponse.status).json(body || { detail: "ml-service returned an error" });
  }

  try {
    await Scan.create({
      address: body.address,
      // ml-service resolves "auto" to a real chain id - store that, not "auto".
      chainId: body.chain_id ?? chainId,
      addressType: body.address_type,
      score: body.score,
      level: body.level,
      reasons: body.reasons,
      features: body.features,
    });
  } catch (error) {
    console.error("Could not save scan to MongoDB (returning result anyway):", error.message);
  }

  return res.json(body);
});

module.exports = router;
