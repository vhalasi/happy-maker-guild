import { spawn } from "node:child_process";

const runner = process.env.BUN_RUNTIME ?? "bun";
const worker = spawn(process.execPath, ["scripts/blender-worker.mjs"], { stdio: "inherit" });
const app = spawn(runner, ["run", "dev"], { stdio: "inherit" });

function stop() {
  worker.kill("SIGTERM");
  app.kill("SIGTERM");
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
worker.on("exit", (code) => {
  if (code && app.exitCode === null) app.kill("SIGTERM");
});
app.on("exit", (code) => {
  if (worker.exitCode === null) worker.kill("SIGTERM");
  process.exitCode = code ?? 1;
});
