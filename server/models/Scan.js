// Mongoose model for one saved scan result, matching the shape returned by
// ml-service's /scan endpoint (see ../../ml-service/README.md).

const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
  {
    // No `lowercase: true`: legacy Bitcoin/Litecoin addresses are base58
    // and case-SENSITIVE, so lowercasing them saved a different, invalid
    // address. ml-service already normalises each chain correctly
    // (lowercases EVM and bech32, preserves base58), so store it as given.
    address: { type: String, required: true, trim: true },
    // Chain ids are usually numbers, but GoPlus also uses names like
    // "solana"/"tron", so this is stored as a string.
    chainId: { type: String, required: true, default: "1" },
    // Which scoring path ran: a token contract, or a plain wallet/contract.
    addressType: { type: String, enum: ["token", "address", "utxo_address"], default: "token" },
    score: { type: Number, required: true, min: 0, max: 100 },
    level: { type: String, required: true, enum: ["unknown", "low", "medium", "high"] },
    reasons: { type: [String], default: [] },
    features: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true, // adds createdAt / updatedAt automatically
  }
);

module.exports = mongoose.model("Scan", scanSchema);
