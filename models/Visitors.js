const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const VisitorSchema = new Schema({
  ipAddress: {
    type: String,
  },
  ipInfo: {
    type: JSON,
  },
  visits: {
    type: Number,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = Visitor = mongoose.model("visitors", VisitorSchema);
