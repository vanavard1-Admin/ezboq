const fs = require("fs");
const crypto = require("crypto");

const secret = process.env.LINE_CHANNEL_SECRET;
if (!secret) {
  console.error("Missing LINE_CHANNEL_SECRET in env");
  process.exit(1);
}

const payloadPath = process.argv[2] || __dirname + "/payload.json";
const raw = fs.readFileSync(payloadPath);

const sig = crypto.createHmac("sha256", secret).update(raw).digest("base64");
process.stdout.write(sig);
