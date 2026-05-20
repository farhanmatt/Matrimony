const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const tempDir = path.join(process.cwd(), ".tmp", "prisma-cli");
fs.mkdirSync(tempDir, { recursive: true });

const env = {
  ...process.env,
  TEMP: tempDir,
  TMP: tempDir,
  TMPDIR: tempDir,
};

const prismaCliPath = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCliPath, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
