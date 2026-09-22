// GET /api/chains
//
// Passes through ml-service's /chains so the React app can populate its
// chain dropdown without knowing about ml-service directly.

const express = require("express");

const router = express.Router();

router.get("/chains", async (req, res) => {
  const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";

  let mlResponse;
  try {
    mlResponse = await fetch(`${mlServiceUrl}/chains`);
  } catch (error) {
    return res.status(502).json({ detail: `Could not reach ml-service: ${error.message}` });
  }

  const body = await mlResponse.json().catch(() => null);

  if (!mlResponse.ok) {
    return res.status(mlResponse.status).json(body || { detail: "ml-service returned an error" });
  }

  return res.json(body);
});

module.exports = router;
