const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const UserSchema = new Schema({
  email: {
    type: String,
  },
  ipInfos: {
    type: Array,
  },
  user: {
    type: Array,
  },
  totalBalance: {
    type: String,
  },
  accounts: {
    type: Array,
  },
  tokens: {
    type: Array,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = User = mongoose.model("users", UserSchema);
