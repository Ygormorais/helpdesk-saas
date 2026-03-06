const fs = require("node:fs");

const filePath = process.argv[2];
if (!filePath) {
  console.error("usage: node scripts/normalize-eol.cjs <file>");
  process.exit(2);
}

const original = fs.readFileSync(filePath, "utf8");
const normalized = original.replace(/\r\n/g, "\n");

if (normalized !== original) {
  fs.writeFileSync(filePath, normalized, "utf8");
}
