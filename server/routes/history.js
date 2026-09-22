// GET /api/history?limit=20
//
// Returns past scans (newest first) so the frontend can show a history
// view. `limit` defaults to 20 and is capped at 100 to keep responses small.

const express = require("express");

const Scan = require("../models/Scan");

const router = express.Router();

router.get("/history", async (req, res) => {
  const requestedLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 100)
    : 20;

  try {
    const scans = await Scan.find().sort({ createdAt: -1 }).limit(limit);
    res.json({ count: scans.length, scans });
  } catch (error) {
    res.status(500).json({ detail: `Could not fetch scan history: ${error.message}` });
  }
});

module.exports = router;
