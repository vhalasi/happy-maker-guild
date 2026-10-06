/**
 * Model-backed adapters for tree and inspector data. XR remains unimplemented.
 */
import type { EntityType, TreeNode } from "@/state/appStore";
import { useAppStore } from "@/state/appStore";
import { getRoomArea, getWallLength } from "@/engine/operations";
import type { ProjectModel } from "@/engine/model";

export interface EntityProperties {
  id: string;
  type: EntityType;
  label: string;
  dimensions: { width?: number; length?: number; height?: number; area?: number };
  material: string;
}

function toTree(model: ProjectModel): TreeNode {
  return {
    id: model.site.id,
    type: "site",
    label: `Site — ${model.site.name}`,
    children: model.site.buildingIds.flatMap((buildingId) => {
      const building = model.buildings[buildingId];
      if (!building) return [];
      return [{
        id: building.id,
        type: "building" as const,
        label: building.name,
        children: building.levelIds.flatMap((levelId) => {
          const level = model.levels[levelId];
          if (!level) return [];
          return [{
            id: level.id,
            type: "level" as const,
            label: `Level — ${level.name}`,
            children: [
              ...level.roomIds.flatMap((id) => { const room = model.rooms[id]; return room ? [{ id: room.id, type: "room" as const, label: room.name }] : []; }),
              ...level.wallIds.flatMap((id) => { const wall = model.walls[id]; return wall ? [{ id: wall.id, type: "wall" as const, label: wall.name }] : []; }),
              ...Object.values(model.openings).filter((opening) => model.walls[opening.wallId]?.levelId === level.id).map((opening) => ({ id: opening.id, type: "opening" as const, label: opening.name })),
            ],
          }];
        }),
      }];
    }),
  };
}

function getModelEntity(model: ProjectModel, id: string): EntityProperties | null {
  const room = model.rooms[id];
  if (room) return { id, type: "room", label: room.name, dimensions: { width: room.width, length: room.length, height: room.height, area: getRoomArea(model, id) }, material: room.floorMaterial };
  const wall = model.walls[id];
  if (wall) return { id, type: "wall", label: wall.name, dimensions: { length: getWallLength(model, id), height: wall.height }, material: wall.material };
  const opening = model.openings[id];
  if (opening) return { id, type: "opening", label: opening.name, dimensions: { width: opening.width, height: opening.height }, material: opening.material };
  const level = model.levels[id];
  if (level) return { id, type: "level", label: level.name, dimensions: { height: level.height, area: level.roomIds.reduce((sum, roomId) => sum + getRoomArea(model, roomId), 0) }, material: "—" };
  const building = model.buildings[id];
  if (building) return { id, type: "building", label: building.name, dimensions: { area: Object.values(model.rooms).filter((item) => building.levelIds.includes(item.levelId)).reduce((sum, item) => sum + getRoomArea(model, item.id), 0) }, material: building.roofMaterial };
  if (id === model.site.id) return { id, type: "site", label: `Site — ${model.site.name}`, dimensions: { width: model.site.width, length: model.site.length }, material: "—" };
  return null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getProjectTree(): Promise<TreeNode> {
  await delay(60);
  return toTree(useAppStore.getState().model);
}

export async function getEntity(id: string): Promise<EntityProperties | null> {
  await delay(40);
  return getModelEntity(useAppStore.getState().model, id);
}

export async function enterXR(): Promise<{ ok: boolean; reason?: string }> {
  await delay(60);
  return { ok: false, reason: "WebXR session logic lands in src/xr — not implemented yet." };
}
