// Connects to MongoDB using MONGODB_URI from .env.
//
// If the connection fails or the URI is missing, we log a clear error but
// don't crash the whole server - the health/proxy endpoints can still run
// even if scan history can't be saved. Step 3's save logic handles a down
// database per-request instead of taking the whole API offline.

const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is not set in .env - scan history will not be saved.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Could not connect to MongoDB:", error.message);
  }
}

module.exports = connectDB;
