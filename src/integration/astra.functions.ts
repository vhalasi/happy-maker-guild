import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applyOperation, calculateQuantities, validateModel, type DesignOperation } from "@/engine/operations";
import type { ProjectModel } from "@/engine/model";

const designInput = z.object({
  text: z.string().trim().min(1).max(4000),
  selectedEntityId: z.string().nullable(),
  modelJson: z.string().max(200_000),
  recentContext: z.string().max(12_000).default(""),
});

const operationSchema = z.object({
  type: z.enum(["resize_room", "move_wall", "change_material"]),
  target_id: z.string().nullable(),
  width: z.number().positive().nullable(),
  length: z.number().positive().nullable(),
  dx: z.number().nullable(),
  dz: z.number().nullable(),
  material: z.string().nullable(),
}).strict();
const blenderDraftSchema = z.object({
  title: z.string().min(1).max(160),
  generation_brief: z.string().min(1).max(12000),
  fidelity_notes: z.string().min(1).max(12000),
  affected_entity_ids: z.array(z.string().min(1).max(160)).max(500),
  blender_python: z.string().min(1).max(500_000),
}).strict();

const proposalTool = {
  type: "function",
  name: "draft_architecture_proposal",
  description: "Draft explicit, reviewable edits to the current building. Never claim a change has been applied. Use only operations supported by the schema; ask a clarifying question in the final answer if the request cannot be safely expressed.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      operations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["resize_room", "move_wall", "change_material"] },
            target_id: { type: ["string", "null"] },
            width: { type: ["number", "null"] },
            length: { type: ["number", "null"] },
            dx: { type: ["number", "null"] },
            dz: { type: ["number", "null"] },
            material: { type: ["string", "null"] },
          },
          required: ["type", "target_id", "width", "length", "dx", "dz", "material"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "summary", "operations"],
    additionalProperties: false,
  },
} as const;

const blenderTool = {
  type: "function",
  name: "prepare_blender_generation",
  description: "Prepare a high-fidelity Blender generation job for work requiring detailed architectural geometry, materials, lighting, or bespoke assets. Describe a complete generation brief that preserves the canonical building layout and stable entity IDs. Do not claim Blender has run.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      generation_brief: { type: "string" },
      fidelity_notes: { type: "string" },
      affected_entity_ids: { type: "array", items: { type: "string" } },
      blender_python: { type: "string" },
    },
    required: ["title", "generation_brief", "fidelity_notes", "affected_entity_ids", "blender_python"],
    additionalProperties: false,
  },
} as const;

const conceptTool = {
  type: "function",
  name: "create_project_concept",
  description: "Create a coherent first-pass architectural layout from the user's brief. Use metre dimensions, sensible room adjacencies and circulation, and fit rooms inside the supplied site. Include enough rooms to reflect the requested program. This is a design concept for user review, not permit-ready construction documentation.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      building_name: { type: "string" },
      site_width: { type: "number" },
      site_length: { type: "number" },
      design_notes: { type: "string" },
      levels: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            elevation: { type: "number" },
            height: { type: "number" },
            rooms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" }, x: { type: "number" }, z: { type: "number" },
                  width: { type: "number" }, length: { type: "number" }, floor_material: { type: "string" },
                  openings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" }, kind: { type: "string", enum: ["door", "window"] },
                        side: { type: "string", enum: ["north", "east", "south", "west"] },
                        width: { type: "number" }, height: { type: "number" }, sill_height: { type: "number" },
                        offset: { type: "number" }, material: { type: "string" },
                      },
                      required: ["name", "kind", "side", "width", "height", "sill_height", "offset", "material"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["name", "x", "z", "width", "length", "floor_material", "openings"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "elevation", "height", "rooms"],
          additionalProperties: false,
        },
      },
    },
    required: ["building_name", "site_width", "site_length", "design_notes", "levels"],
    additionalProperties: false,
  },
} as const;

type ResponsesOutputItem = {
  type?: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  output_text?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type ResponsesPayload = {
  id?: string;
  output?: ResponsesOutputItem[];
  output_text?: string;
  error?: { message?: string };
};

function serverEnv(name: string) {
  const global = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  const vite = import.meta.env as Record<string, string | undefined>;
  return global.process?.env?.[name] ?? vite[name];
}

async function callAstra(input: unknown, tools: readonly unknown[]): Promise<ResponsesPayload> {
  const apiKey = serverEnv("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Astra is not configured on the server. Add OPENAI_API_KEY to the server environment.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-6-astra",
      reasoning: { effort: "max" },
      max_output_tokens: 24_000,
      input,
      tools,
      tool_choice: "auto",
    }),
  });
  const payload = (await response.json()) as ResponsesPayload;
  if (!response.ok) throw new Error(payload.error?.message ?? `Astra request failed (${response.status}).`);
  return payload;
}

type BlenderDraft = { title: string; generation_brief: string; fidelity_notes: string; affected_entity_ids: string[]; blender_python: string };

async function submitBlenderDraft(job: BlenderDraft, model: ProjectModel) {
  const jobId = crypto.randomUUID();
  const workerUrl = serverEnv("BLENDER_WORKER_URL");
  const shared = { title: job.title, generation_brief: job.generation_brief, fidelity_notes: job.fidelity_notes, affected_entity_ids: job.affected_entity_ids, jobId, modelVersion: model.version };
  if (!workerUrl) return { ...shared, status: "needs-worker" as const, blenderPython: job.blender_python };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const workerToken = serverEnv("BLENDER_WORKER_TOKEN");
  if (workerToken) headers["Authorization"] = `Bearer ${workerToken}`;
  const workerResponse = await fetch(workerUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...job, jobId, modelVersion: model.version, model }),
  });
  if (!workerResponse.ok) throw new Error(`Blender worker rejected the job (${workerResponse.status}).`);
  const result = (await workerResponse.json().catch(() => ({}))) as { jobId?: string };
  return { ...shared, jobId: result.jobId ?? jobId, status: "queued" as const, blenderPython: undefined };
}

function outputText(response: ResponsesPayload) {
  if (response.output_text) return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n");
}

function operationsFromArgs(raw: string): { title: string; summary: string; operations: DesignOperation[] } {
  const value = JSON.parse(raw) as { title: string; summary: string; operations: unknown[] };
  const operations = value.operations.map((entry) => {
    const item = operationSchema.parse(entry);
    if (!item.target_id) throw new Error("A proposed operation is missing its target entity.");
    if (item.type === "resize_room") {
      if (item.width === null && item.length === null) throw new Error("Room resize needs a width or length.");
      return { type: item.type, roomId: item.target_id, ...(item.width === null ? {} : { width: item.width }), ...(item.length === null ? {} : { length: item.length }) } as DesignOperation;
    }
    if (item.type === "move_wall") {
      if (item.dx === null || item.dz === null) throw new Error("Wall movement needs both dx and dz.");
      return { type: item.type, wallId: item.target_id, dx: item.dx, dz: item.dz } as DesignOperation;
    }
    if (item.material === null) throw new Error("Material change needs a material name.");
    return { type: item.type, entityId: item.target_id, material: item.material } as DesignOperation;
  });
  return { title: value.title, summary: value.summary, operations };
}

export const askAstra = createServerFn({ method: "POST" })
  .validator(designInput)
  .handler(async ({ data }) => {
    const model = JSON.parse(data.modelJson) as ProjectModel;
    const context = [
      `Selected entity: ${data.selectedEntityId ?? "none"}`,
      `Recent conversation:\n${data.recentContext || "(none)"}`,
      `Canonical building model (version ${model.version}):\n${JSON.stringify(model)}`,
      `User request: ${data.text}`,
    ].join("\n\n");
    const system = "You are the architectural design intelligence for Vibe Architect. Use expert architectural reasoning. Consider the entire supplied building and its relationships, not just isolated prompt words. For a request needing a concrete model change, call draft_architecture_proposal with explicit metre-based values and stable entity IDs; never assert proposed edits are already applied. When a request needs high-fidelity detailed geometry, complex materials, lighting, or bespoke assets, call prepare_blender_generation. Ask concise clarifying questions when intent is ambiguous. Preserve site and building constraints, explain tradeoffs, and never invent measurements or engineering approvals. The app will validate and preview operations before the user accepts them.";
    const first = await callAstra([{ role: "system", content: system }, { role: "user", content: context }], [proposalTool, blenderTool]);
    const items = first.output ?? [];
    const proposalCall = items.find((item) => item.type === "function_call" && item.name === "draft_architecture_proposal");
    const blenderCall = items.find((item) => item.type === "function_call" && item.name === "prepare_blender_generation");

    if (proposalCall?.arguments) {
      const draft = operationsFromArgs(proposalCall.arguments);
      let preview = model;
      for (const operation of draft.operations) preview = applyOperation(preview, operation).model;
      const before = calculateQuantities(model);
      const after = calculateQuantities(preview);
      return {
        reply: outputText(first) || "Astra has drafted a change for your review.",
        proposal: {
          id: crypto.randomUUID(),
          title: draft.title,
          options: [{
            id: crypto.randomUUID(),
            label: "Astra design proposal",
            explanation: draft.summary,
            operations: draft.operations,
            impact: [
              { item: "Floor area", before: `${before.floorArea.toFixed(1)} m²`, after: `${after.floorArea.toFixed(1)} m²`, delta: `${(after.floorArea - before.floorArea >= 0 ? "+" : "")}${(after.floorArea - before.floorArea).toFixed(1)} m²` },
              { item: "Wall length", before: `${before.wallLength.toFixed(1)} m`, after: `${after.wallLength.toFixed(1)} m`, delta: `${(after.wallLength - before.wallLength >= 0 ? "+" : "")}${(after.wallLength - before.wallLength).toFixed(1)} m` },
            ],
          }],
          baseVersion: model.version,
        },
        blenderJob: null,
      };
    }

    if (blenderCall?.arguments) {
      const job = blenderDraftSchema.parse(JSON.parse(blenderCall.arguments)) as BlenderDraft;
      const blenderJob = await submitBlenderDraft(job, model);
      return {
        reply: blenderJob.status === "queued"
          ? outputText(first) || `Astra authored the Blender scene script and sent ${job.title} to the worker.`
          : `Astra authored the detailed Blender scene script for ${job.title}. A Blender worker is not configured yet, so the scene has not been rendered.`,
        proposal: null,
        blenderJob,
      };
    }

    return { reply: outputText(first) || "Astra could not form a concrete design operation. Please add a little more detail.", proposal: null, blenderJob: null };
  });

const briefInput = z.object({ brief: z.string().trim().min(10).max(6000), imageDataUrls: z.array(z.string().max(7_000_000)).max(4).default([]) });

export const startAstraProject = createServerFn({ method: "POST" })
  .validator(briefInput)
  .handler(async ({ data }) => {
    const response = await callAstra([
      { role: "system", content: "You are the lead residential architect for Vibe Architect. Translate the user's brief and any supplied sketch or floor-plan images into a thoughtful, coherent first-pass floor plan. Read dimension annotations and spatial relationships from images when legible, and flag uncertainty in design_notes rather than inventing certainty. Reason about room adjacencies, circulation, daylight and privacy. Use practical metre dimensions; place adjacent rooms so their edges align. Include well-positioned doors and windows with realistic dimensions, clearances, sill heights, and wall offsets. Put windows only on exterior walls; use doors for sensible circulation and avoid conflicting openings between rooms. Keep the number of rooms and floors faithful to the brief. Return a concept only, never claim regulatory compliance. Use the tool to provide the structured layout." },
      { role: "user", content: [
        { type: "input_text", text: `Create a first concept for this brief. Use a site width and length that fit the requested home; the house footprint must fit inside the site.\n\n${data.brief}` },
        ...data.imageDataUrls.map((image_url) => ({ type: "input_image", image_url })),
      ] },
    ], [conceptTool]);
    const call = response.output?.find((item) => item.type === "function_call" && item.name === "create_project_concept");
    if (!call?.arguments) throw new Error(outputText(response) || "Astra could not create a building concept.");
    const concept = JSON.parse(call.arguments) as {
      building_name: string; site_width: number; site_length: number; design_notes: string;
      levels: Array<{ name: string; elevation: number; height: number; rooms: Array<{ name: string; x: number; z: number; width: number; length: number; floor_material: string; openings: Array<{ name: string; kind: "door" | "window"; side: "north" | "east" | "south" | "west"; width: number; height: number; sill_height: number; offset: number; material: string }> }> }>;
    };
    if (concept.levels.length === 0 || concept.levels.length > 6 || concept.site_width <= 0 || concept.site_length <= 0) {
      throw new Error("Astra returned an invalid building envelope. Try refining the brief.");
    }
    let model: ProjectModel = {
      schemaVersion: 1,
      version: 1,
      site: { id: "site", name: "Project site", width: concept.site_width, length: concept.site_length, orientationDegrees: 0, buildingIds: ["building-main"] },
    buildings: { "building-main": { id: "building-main", name: concept.building_name, levelIds: [] , roofMaterial: "Not selected" } },
      levels: {}, rooms: {}, walls: {}, openings: {},
    };
    const building = model.buildings["building-main"];
    if (!building) throw new Error("Astra returned an invalid building model.");
    const edgeOwners = new Map<string, string>();
    const roomBoundsByLevel: Array<{ levelName: string; x: number; z: number; width: number; length: number }> = [];
    for (const [levelIndex, levelDraft] of concept.levels.entries()) {
      const levelId = `level-${levelIndex + 1}`;
      const roomIds: string[] = [];
      const wallIds: string[] = [];
      if (!(levelDraft.height > 2 && levelDraft.height <= 8) || levelDraft.rooms.length === 0) throw new Error(`Astra returned an invalid layout for ${levelDraft.name}.`);
      for (const [roomIndex, roomDraft] of levelDraft.rooms.entries()) {
        if (!(roomDraft.width > 1 && roomDraft.length > 1 && roomDraft.width <= 30 && roomDraft.length <= 30)) throw new Error(`Astra returned invalid dimensions for ${roomDraft.name}.`);
        const roomId = `room-${levelIndex + 1}-${roomIndex + 1}`;
        const bounds = { left: roomDraft.x - roomDraft.width / 2, right: roomDraft.x + roomDraft.width / 2, near: roomDraft.z - roomDraft.length / 2, far: roomDraft.z + roomDraft.length / 2 };
        if (Math.abs(roomDraft.x) + roomDraft.width / 2 > concept.site_width / 2 || Math.abs(roomDraft.z) + roomDraft.length / 2 > concept.site_length / 2) throw new Error(`${roomDraft.name} falls outside the site boundary.`);
        for (const existing of roomBoundsByLevel.filter((item) => item.levelName === levelId)) {
          const overlapX = Math.min(bounds.right, existing.x + existing.width / 2) - Math.max(bounds.left, existing.x - existing.width / 2);
          const overlapZ = Math.min(bounds.far, existing.z + existing.length / 2) - Math.max(bounds.near, existing.z - existing.length / 2);
          if (overlapX > 0.05 && overlapZ > 0.05) throw new Error(`${roomDraft.name} overlaps another room in ${levelDraft.name}. Ask Astra to revise the concept.`);
        }
        roomBoundsByLevel.push({ levelName: levelId, x: roomDraft.x, z: roomDraft.z, width: roomDraft.width, length: roomDraft.length });
        const room = { id: roomId, name: roomDraft.name, levelId, x: roomDraft.x, z: roomDraft.z, width: roomDraft.width, length: roomDraft.length, height: levelDraft.height, floorMaterial: roomDraft.floor_material, wallIds: [] as string[] };
        model.rooms[roomId] = room;
        roomIds.push(roomId);
        const wallsBySide: Record<string, string> = {};
        const edgeStartBySide: Record<string, [number, number]> = {};
        const edges: Array<["north" | "east" | "south" | "west", [number, number], [number, number]]> = [
          ["north", [bounds.left, bounds.near], [bounds.right, bounds.near]],
          ["east", [bounds.right, bounds.near], [bounds.right, bounds.far]],
          ["south", [bounds.right, bounds.far], [bounds.left, bounds.far]],
          ["west", [bounds.left, bounds.far], [bounds.left, bounds.near]],
        ];
        for (const [side, start, end] of edges) {
          const pointKey = (point: [number, number]) => `${point[0].toFixed(2)},${point[1].toFixed(2)}`;
          const edgeKey = [pointKey(start), pointKey(end)].sort().join("|");
          let wallId = edgeOwners.get(`${levelId}:${edgeKey}`);
          if (!wallId) {
            wallId = `wall-${levelIndex + 1}-${Object.keys(model.walls).length + 1}`;
            edgeOwners.set(`${levelId}:${edgeKey}`, wallId);
            model.walls[wallId] = { id: wallId, name: `${roomDraft.name} boundary`, levelId, start, end, height: levelDraft.height, thickness: 0.18, material: "Material to be refined", roomIds: [], openingIds: [] };
            wallIds.push(wallId);
          }
          const wall = model.walls[wallId];
          if (wall && !wall.roomIds.includes(roomId)) wall.roomIds.push(roomId);
          wallsBySide[side] = wallId;
          edgeStartBySide[side] = start;
          room.wallIds.push(wallId);
        }
        for (const [openingIndex, openingDraft] of roomDraft.openings.entries()) {
          const wallId = wallsBySide[openingDraft.side];
          const wall = wallId ? model.walls[wallId] : undefined;
          if (!wall || !(openingDraft.width > 0 && openingDraft.height > 0 && openingDraft.offset >= 0) || openingDraft.offset + openingDraft.width > Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) || openingDraft.sill_height < 0 || openingDraft.sill_height + openingDraft.height > wall.height) {
            throw new Error(`${openingDraft.name} does not fit its wall. Ask Astra to revise the concept.`);
          }
          const wallLength = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
          const edgeStart = edgeStartBySide[openingDraft.side] ?? wall.start;
          const sameDirection = Math.hypot(wall.start[0] - edgeStart[0], wall.start[1] - edgeStart[1]) < 0.01;
          const canonicalOffset = sameDirection ? openingDraft.offset : wallLength - openingDraft.offset - openingDraft.width;
          const duplicate = wall.openingIds.map((id) => model.openings[id]).find((existing) => existing && existing.kind === openingDraft.kind && Math.abs(existing.offset - canonicalOffset) < 0.02 && Math.abs(existing.width - openingDraft.width) < 0.02 && Math.abs(existing.height - openingDraft.height) < 0.02);
          if (duplicate) continue;
          const openingId = `opening-${levelIndex + 1}-${roomIndex + 1}-${openingIndex + 1}`;
          model.openings[openingId] = { id: openingId, name: openingDraft.name, kind: openingDraft.kind, wallId: wall.id, width: openingDraft.width, height: openingDraft.height, sillHeight: openingDraft.sill_height, offset: canonicalOffset, material: openingDraft.material };
          wall.openingIds.push(openingId);
        }
      }
      model.levels[levelId] = { id: levelId, name: levelDraft.name, elevation: levelDraft.elevation, height: levelDraft.height, roomIds, wallIds };
      building.levelIds.push(levelId);
    }
    validateModel(model);
    return { projectName: concept.building_name, designNotes: concept.design_notes, model };
  });

const blenderInput = z.object({ modelJson: z.string().max(200_000), projectContext: z.string().max(20_000).default("") });
const blenderStatusInput = z.object({ jobId: z.string().min(1) });

export const generateAstraBlenderBrief = createServerFn({ method: "POST" })
  .validator(blenderInput)
  .handler(async ({ data }) => {
    const model = JSON.parse(data.modelJson) as ProjectModel;
    const response = await callAstra([
      { role: "system", content: "Act as a senior architectural visualization artist, BIM-aware architect, and Blender Python specialist. The reference workflow is https://www.youtube.com/watch?v=SsBLhNgqTqQ: translate sketches and plans into a full architectural model, then review the floor plan, dimensions, and construction views. Target that level of completeness and professional presentation while respecting the specific visual style requested by this project's user; do not copy a particular building. Inspect the complete canonical model and preserve measured dimensions, room connectivity, openings, and stable entity IDs. Return a detailed scene brief and a complete, self-contained Blender Python script using bpy. The script should set metric units, create organized collections, build/refine walls with openings, floors, ceilings, roof, trim/joinery, realistic doors and glazing, kitchen and bathroom fixtures, room-appropriate furniture, layered materials and textures, natural and artificial lighting, site context, and named plan/section/elevation/perspective cameras. Give objects canonical entity IDs as object names and custom properties where applicable. The script must export a GLB to the path in the OUTPUT_GLB environment variable and must not use network access, shell commands, or files outside the worker's temporary job directory. Make it runnable in background Blender mode and include useful errors when export fails. This is a script and plan only; do not claim Blender has run." },
      { role: "user", content: `Prepare a high-fidelity Blender job for this complete canonical building at model version ${model.version}. Preserve the user's style direction and accumulated design decisions from this project context:\n${data.projectContext || "(no extra context)"}\n\nCanonical model:\n${JSON.stringify(model)}` },
    ], [blenderTool]);
    const call = response.output?.find((item) => item.type === "function_call" && item.name === "prepare_blender_generation");
    if (!call?.arguments) throw new Error(outputText(response) || "Astra did not return a Blender job brief.");
    const job = blenderDraftSchema.parse(JSON.parse(call.arguments)) as BlenderDraft;
    return await submitBlenderDraft(job, model);
  });

export const getBlenderJobStatus = createServerFn({ method: "GET" })
  .validator(blenderStatusInput)
  .handler(async ({ data }) => {
    const workerUrl = serverEnv("BLENDER_WORKER_URL");
    if (!workerUrl) throw new Error("No Blender worker is configured.");
    const headers: Record<string, string> = {};
    const workerToken = serverEnv("BLENDER_WORKER_TOKEN");
    if (workerToken) headers["Authorization"] = `Bearer ${workerToken}`;
    const endpoint = `${workerUrl.replace(/\/$/, "")}/${encodeURIComponent(data.jobId)}`;
    const response = await fetch(endpoint, { headers });
    if (!response.ok) throw new Error(`Blender worker status request failed (${response.status}).`);
    const result = (await response.json()) as { status: "queued" | "running" | "done" | "failed"; artifactUrl?: string; modelVersion?: number; message?: string };
    if (!["queued", "running", "done", "failed"].includes(result.status)) throw new Error("Blender worker returned an invalid job status.");
    if (result.artifactUrl) {
      const artifact = new URL(result.artifactUrl);
      if (artifact.protocol !== "https:" && !(artifact.protocol === "http:" && ["localhost", "127.0.0.1"].includes(artifact.hostname))) throw new Error("Blender worker returned an unsafe asset URL.");
    }
    return result;
  });
