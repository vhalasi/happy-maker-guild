# Blender worker

The app asks GPT-6 Astra to prepare a detailed scene brief and a complete Blender Python script, then submits both with the canonical model to an asynchronous Blender worker.

## Local renderer

This checkout includes Blender 5.1.2 in the ignored `.local/blender` directory and a local renderer. Start both the worker and app with:

```bash
bun run dev:blender
```

`BLENDER_WORKER_URL=http://127.0.0.1:4310` is already present in `.env.local`. Choose **Generate detailed model**. Astra's script is executed in a new ignored `.local/blender-jobs/<job-id>` directory and the completed GLB is returned to the app. To run the worker separately, use `bun run blender:worker` and launch the app as usual with `bun run dev`.

The local worker binds only to `127.0.0.1`, limits a job to ten minutes and retains the last 20,000 characters of Blender output in memory. It is intended for scripts generated from this app on this workstation. A shared or production worker must run each script in an isolated container or VM with no network and only the job directory mounted.

## Server configuration

Set these as server-side environment variables. Keep them out of browser-prefixed variables:

- `OPENAI_API_KEY`: Astra access.
- `BLENDER_WORKER_URL`: worker job endpoint, for example `https://worker.example.com/jobs`.
- `BLENDER_WORKER_TOKEN`: optional bearer token sent to the worker.

For local development, use the ignored `.env.local` file. Production should use the deployment platform's server-side secret configuration.

If no worker URL is configured, Astra's generated Blender script is available from the job chip's download button. It expects `OUTPUT_GLB` to point to its GLB output file when run in background Blender mode.

## Submit a job

The app sends `POST ${BLENDER_WORKER_URL}` with JSON:

```json
{
  "jobId": "app-generated-id",
  "modelVersion": 12,
  "title": "High detail interior and exterior",
  "generation_brief": "Astra-authored architectural brief",
  "fidelity_notes": "Astra-authored visual and material direction",
  "blender_python": "Astra-authored bpy script",
  "affected_entity_ids": ["room-1-1", "wall-1-2"],
  "model": { "schemaVersion": 1, "version": 12 }
}
```

Return a successful JSON response with the worker's job ID:

```json
{ "jobId": "worker-job-id" }
```

The worker should acknowledge quickly and do Blender work in the background. Run the model-authored script inside an isolated job container with no network, a temporary working directory, resource/time limits, and access only to its input and output files. Set `OUTPUT_GLB` to the allowed output path. Preserve dimensions and room/opening relationships from the model, use metres, and name GLB nodes with canonical entity IDs where possible. Never run generated Blender scripts in the web application's server process.

## Poll status

The app polls `GET ${BLENDER_WORKER_URL}/{jobId}`. Return one of:

```json
{
  "status": "queued | running | done | failed",
  "modelVersion": 12,
  "artifactUrl": "https://assets.example.com/model.glb",
  "message": "Optional status or error"
}
```

For a completed job, return an HTTPS GLB URL and the exact source `modelVersion`. The local worker uses an `http://127.0.0.1` URL, which the app also accepts during development. The app only displays an asset when its version still matches the current canonical model. Configure CORS on the asset host for the app origin. Use private, time-limited URLs if generated assets should not be public.
