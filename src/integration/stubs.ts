/**
 * Integration stubs for Vibe Architect.
 *
 * All UI code calls these typed functions. Later, the real implementations
 * will live in src/engine, src/scene, src/xr and src/ai — only this file
 * changes, never the components.
 */
import type { EntityType, Proposal, TreeNode } from "@/state/appStore";

export interface EntityProperties {
  id: string;
  type: EntityType;
  label: string;
  dimensions: { width?: number; length?: number; height?: number; area?: number };
  material: string;
}

export interface Op {
  kind: "move" | "resize" | "add" | "remove" | "set-material";
  targetId: string;
  payload: Record<string, unknown>;
}

const TREE: TreeNode = {
  id: "site",
  type: "site",
  label: "Site — Moreno parcel",
  children: [
    {
      id: "level-0",
      type: "level",
      label: "Level 0 — Ground",
      children: [
        { id: "room-living", type: "room", label: "Living room" },
        { id: "room-kitchen", type: "room", label: "Kitchen" },
        { id: "wall-w-01", type: "wall", label: "Wall W-01 (south)" },
        { id: "wall-w-02", type: "wall", label: "Wall W-02 (east)" },
        { id: "opening-o-01", type: "opening", label: "Window O-01" },
        { id: "opening-o-02", type: "opening", label: "Door O-02" },
      ],
    },
    {
      id: "level-1",
      type: "level",
      label: "Level 1 — Upper",
      children: [
        { id: "room-bedroom", type: "room", label: "Bedroom" },
        { id: "room-bath", type: "room", label: "Bathroom" },
        { id: "wall-w-10", type: "wall", label: "Wall W-10" },
        { id: "opening-o-10", type: "opening", label: "Window O-10" },
      ],
    },
  ],
};

const ENTITIES: Record<string, EntityProperties> = {
  site: { id: "site", type: "site", label: "Site — Moreno parcel", dimensions: { width: 22, length: 34 }, material: "—" },
  "level-0": { id: "level-0", type: "level", label: "Level 0 — Ground", dimensions: { height: 2.8, area: 96 }, material: "—" },
  "level-1": { id: "level-1", type: "level", label: "Level 1 — Upper", dimensions: { height: 2.6, area: 52 }, material: "—" },
  "room-living": { id: "room-living", type: "room", label: "Living room", dimensions: { width: 5.4, length: 7.2, height: 2.8, area: 38.9 }, material: "Oak parquet" },
  "room-kitchen": { id: "room-kitchen", type: "room", label: "Kitchen", dimensions: { width: 3.6, length: 4.1, height: 2.8, area: 14.8 }, material: "Polished concrete" },
  "room-bedroom": { id: "room-bedroom", type: "room", label: "Bedroom", dimensions: { width: 3.9, length: 4.4, height: 2.6, area: 17.2 }, material: "Oak parquet" },
  "room-bath": { id: "room-bath", type: "room", label: "Bathroom", dimensions: { width: 2.4, length: 3.0, height: 2.6, area: 7.2 }, material: "Ceramic tile" },
  "wall-w-01": { id: "wall-w-01", type: "wall", label: "Wall W-01 (south)", dimensions: { length: 8.2, height: 2.8 }, material: "Reinforced concrete 20 cm" },
  "wall-w-02": { id: "wall-w-02", type: "wall", label: "Wall W-02 (east)", dimensions: { length: 6.4, height: 2.8 }, material: "Reinforced concrete 20 cm" },
  "wall-w-10": { id: "wall-w-10", type: "wall", label: "Wall W-10", dimensions: { length: 5.1, height: 2.6 }, material: "Timber stud 12 cm" },
  "opening-o-01": { id: "opening-o-01", type: "opening", label: "Window O-01", dimensions: { width: 2.4, height: 1.6 }, material: "Triple-glazed aluminium" },
  "opening-o-02": { id: "opening-o-02", type: "opening", label: "Door O-02", dimensions: { width: 0.9, height: 2.1 }, material: "Oak veneer" },
  "opening-o-10": { id: "opening-o-10", type: "opening", label: "Window O-10", dimensions: { width: 1.8, height: 1.2 }, material: "Triple-glazed aluminium" },
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getProjectTree(): Promise<TreeNode> {
  await delay(60);
  return TREE;
}

export async function getEntity(id: string): Promise<EntityProperties | null> {
  await delay(40);
  return ENTITIES[id] ?? null;
}

export async function applyOps(ops: Op[]): Promise<{ applied: number; newVersion: number }> {
  await delay(120);
  return { applied: ops.length, newVersion: 13 };
}

export async function undo(): Promise<{ ok: boolean; version: number }> {
  await delay(80);
  return { ok: true, version: 11 };
}

export async function redo(): Promise<{ ok: boolean; version: number }> {
  await delay(80);
  return { ok: true, version: 12 };
}

export async function sendDesignRequest(
  text: string,
  selectedEntityId: string | null,
): Promise<{ reply: string; proposal: Proposal | null }> {
  await delay(600);
  return {
    reply: `Understood — "${text}"${selectedEntityId ? ` (context: ${selectedEntityId})` : ""}. The AI design engine is stubbed for now; proposals will appear here once src/ai is wired in.`,
    proposal: null,
  };
}

export async function acceptProposal(id: string): Promise<{ ok: boolean; newVersion: number }> {
  await delay(150);
  return { ok: true, newVersion: 13 };
}

export async function rejectProposal(id: string): Promise<{ ok: boolean }> {
  await delay(80);
  return { ok: true };
}

export async function requestDetailedModel(): Promise<{ jobId: string }> {
  await delay(100);
  return { jobId: `job-${Date.now()}` };
}

export async function enterXR(): Promise<{ ok: boolean; reason?: string }> {
  await delay(60);
  return { ok: false, reason: "WebXR session logic lands in src/xr — not implemented yet." };
}
