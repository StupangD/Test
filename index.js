const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const fs = require("fs");
const http = require("http");
const https = require("https");

const app = express();
require("dotenv").config();

const sslOptions = {
  keyPath: "./cert/privkey.pem",
  certPath: "./cert/fullchain.pem",
};

const routes = require("./routes");

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const db = process.env.MONGOURI;

mongoose
  .connect(db)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.warn(err));

app.get("/", (req, res) => {
  res.send(`
      <h1>Welcome to Our Service</h1>
      <p>This is the main endpoint of our backend service. If you're seeing this page, then the server is up and running!</p>
    `);
});

app.use("/api-cb", routes);

function sslFilesExist(options) {
  try {
    return fs.existsSync(options.keyPath) && fs.existsSync(options.certPath);
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Check if SSL files exist and run HTTPS if they do; otherwise, run HTTP
if (sslFilesExist(sslOptions)) {
  // They exist; set up and start the HTTPS server
  const httpsServerOptions = {
    key: fs.readFileSync(sslOptions.keyPath),
    cert: fs.readFileSync(sslOptions.certPath),
  };

  https.createServer(httpsServerOptions, app).listen(2554, () => {
    console.log("HTTPS server running on port 2554");
  });
} else {
// The SSL files don't exist; set up and start an HTTP server instead
http.createServer(app).listen(process.env.PORT, () => {
  console.log(`HTTP server running on port ${process.env.PORT}`);
});
}
