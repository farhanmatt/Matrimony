const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const tempDir = path.join(process.cwd(), ".tmp", "prisma-cli");
fs.mkdirSync(tempDir, { recursive: true });

const incompatibleGenerateFlags = new Set([
  "--no-engine",
  "--data-proxy",
  "--accelerate",
]);

const prismaArgs = process.argv
  .slice(2)
  .filter((arg) => !incompatibleGenerateFlags.has(arg));

const env = {
  ...process.env,
  TEMP: tempDir,
  TMP: tempDir,
  TMPDIR: tempDir,
};

delete env.PRISMA_GENERATE_NO_ENGINE;
delete env.PRISMA_GENERATE_DATAPROXY;
delete env.PRISMA_GENERATE_ACCELERATE;

const prismaCliPath = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCliPath, ...prismaArgs], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
