import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const host = process.env.BLENDER_WORKER_HOST ?? "127.0.0.1";
const port = Number(process.env.BLENDER_WORKER_PORT ?? 4310);
const blender = process.env.BLENDER_BIN ?? join(root, ".local", "blender", "Blender.app", "Contents", "MacOS", "Blender");
const jobsRoot = resolve(process.env.BLENDER_JOBS_DIR ?? join(root, ".local", "blender-jobs"));
const timeoutMs = Number(process.env.BLENDER_JOB_TIMEOUT_MS ?? 10 * 60 * 1000);
const jobs = new Map();

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json", ...headers });
  response.end(JSON.stringify(body));
}

function allowedJobId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,160}$/.test(value);
}

async function requestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 750_000) throw new Error("Job payload is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function runJob(job) {
  const child = spawn(blender, ["--background", "--python", job.scriptPath], {
    cwd: job.directory,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: job.directory,
      TMPDIR: join(job.directory, "tmp"),
      OUTPUT_GLB: job.outputPath,
      BLENDER_USER_CONFIG: join(job.directory, "config"),
      BLENDER_USER_SCRIPTS: join(job.directory, "scripts"),
      BLENDER_USER_DATAFILES: join(job.directory, "data"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  const append = (chunk) => { log = `${log}${chunk}`.slice(-20_000); };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
  child.on("error", (error) => {
    clearTimeout(timer);
    jobs.set(job.id, { ...job, status: "failed", message: error.message, log });
  });
  child.on("close", (code, signal) => {
    clearTimeout(timer);
    if (code === 0 && existsSync(job.outputPath)) {
      jobs.set(job.id, { ...job, status: "done", message: "GLB generated", log });
    } else {
      const reason = signal === "SIGKILL" ? `Render exceeded ${Math.round(timeoutMs / 60_000)} minutes.` : `Blender exited with code ${code ?? "unknown"}.`;
      jobs.set(job.id, { ...job, status: "failed", message: reason, log });
    }
  });
}

async function createJob(body) {
  if (!allowedJobId(body.jobId) || typeof body.blender_python !== "string" || body.blender_python.length > 500_000) {
    throw new Error("Invalid Blender job.");
  }
  if (typeof body.modelVersion !== "number") throw new Error("Missing model version.");
  if (!existsSync(blender)) throw new Error(`Blender was not found at ${blender}.`);
  const directory = resolve(jobsRoot, body.jobId);
  if (!directory.startsWith(`${jobsRoot}/`)) throw new Error("Unsafe job path.");
  await rm(directory, { recursive: true, force: true });
  await Promise.all([mkdir(join(directory, "tmp"), { recursive: true }), mkdir(join(directory, "config"), { recursive: true }), mkdir(join(directory, "scripts"), { recursive: true }), mkdir(join(directory, "data"), { recursive: true })]);
  const scriptPath = join(directory, "scene.py");
  const outputPath = join(directory, "scene.glb");
  await writeFile(scriptPath, body.blender_python, { encoding: "utf8", mode: 0o600 });
  const job = { id: body.jobId, directory, scriptPath, outputPath, modelVersion: body.modelVersion, status: "running", message: "Blender is generating the scene." };
  jobs.set(job.id, job);
  runJob(job);
  return job;
}

await mkdir(jobsRoot, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${host}:${port}`);
    if (request.method === "POST" && url.pathname === "/") {
      const job = await createJob(await requestBody(request));
      return send(response, 202, { jobId: job.id });
    }
    const asset = url.pathname.match(/^\/([^/]+)\/asset$/);
    if (request.method === "GET" && asset && allowedJobId(asset[1])) {
      const job = jobs.get(asset[1]);
      if (!job || job.status !== "done") return send(response, 404, { error: "Asset not available." });
      response.writeHead(200, { "Content-Type": "model/gltf-binary", "Cache-Control": "no-store" });
      response.end(await readFile(job.outputPath));
      return;
    }
    const status = url.pathname.match(/^\/([^/]+)$/);
    if (request.method === "GET" && status && allowedJobId(status[1])) {
      const job = jobs.get(status[1]);
      if (!job) return send(response, 404, { error: "Unknown job." });
      return send(response, 200, {
        status: job.status,
        modelVersion: job.modelVersion,
        message: job.message,
        ...(job.status === "done" ? { artifactUrl: `http://${host}:${port}/${job.id}/asset` } : {}),
      });
    }
    return send(response, 404, { error: "Not found." });
  } catch (error) {
    return send(response, 400, { error: error instanceof Error ? error.message : "Worker request failed." });
  }
});

server.listen(port, host, () => {
  console.log(`Blender worker listening at http://${host}:${port}`);
  console.log(`Using ${basename(blender)} from ${dirname(blender)}`);
});
