// Express entry point.

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./db/connect");
const scanRouter = require("./routes/scan");
const historyRouter = require("./routes/history");
const chainsRouter = require("./routes/chains");

const app = express();
const PORT = process.env.PORT || 4000;

// Allow the React app (any localhost port during development) to call this
// API directly from the browser. Wide open ("*") is fine for this ideathon
// prototype since there's no auth/cookies involved - lock this down to
// specific origins before any real deployment.
app.use(cors({ origin: "*", methods: ["GET"] }));

app.get("/", (req, res) => {
  res.json({ message: "Scam Token Risk Scorer backend is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", scanRouter);
app.use("/api", historyRouter);
app.use("/api", chainsRouter);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});
