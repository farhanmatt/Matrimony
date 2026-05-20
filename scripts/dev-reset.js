const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const nextDir = path.join(process.cwd(), ".next");
const nextBin = require.resolve("next/dist/bin/next");

fs.rmSync(nextDir, { recursive: true, force: true });

const child = spawn(process.execPath, [nextBin, "dev", "--turbo"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
