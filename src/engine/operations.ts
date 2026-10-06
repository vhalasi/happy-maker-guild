import type { EntityId, Opening, ProjectModel } from "./model";

export type DesignOperation =
  | { type: "resize_room"; roomId: EntityId; width?: number; length?: number }
  | { type: "move_wall"; wallId: EntityId; dx: number; dz: number }
  | { type: "change_material"; entityId: EntityId; material: string };

export interface OperationResult {
  model: ProjectModel;
  label: string;
  affectedIds: EntityId[];
}

export function validateModel(model: ProjectModel) {
  for (const room of Object.values(model.rooms)) {
    const left = room.x - room.width / 2;
    const right = room.x + room.width / 2;
    const near = room.z - room.length / 2;
    const far = room.z + room.length / 2;
    if (!(room.width > 0 && room.length > 0 && room.height > 0)) throw new Error(`${room.name} has invalid dimensions.`);
    if (Math.abs(left) > model.site.width / 2 || Math.abs(right) > model.site.width / 2 || Math.abs(near) > model.site.length / 2 || Math.abs(far) > model.site.length / 2) throw new Error(`${room.name} would extend beyond the site boundary.`);
    for (const other of Object.values(model.rooms)) {
      if (other.id <= room.id || other.levelId !== room.levelId) continue;
      const overlapX = Math.min(right, other.x + other.width / 2) - Math.max(left, other.x - other.width / 2);
      const overlapZ = Math.min(far, other.z + other.length / 2) - Math.max(near, other.z - other.length / 2);
      if (overlapX > 0.02 && overlapZ > 0.02) throw new Error(`${room.name} would overlap ${other.name}.`);
    }
  }
  for (const wall of Object.values(model.walls)) {
    const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
    if (length < 0.1 || wall.height <= 0 || wall.thickness <= 0) throw new Error(`${wall.name} has invalid geometry.`);
    const openings = wall.openingIds.map((id) => model.openings[id]).filter((opening): opening is Opening => Boolean(opening)).sort((a, b) => a.offset - b.offset);
    let previousEnd = 0;
    for (const [index, opening] of openings.entries()) {
      if (opening.offset < 0 || opening.width <= 0 || opening.offset + opening.width > length + 0.001 || opening.sillHeight < 0 || opening.sillHeight + opening.height > wall.height + 0.001) throw new Error(`${opening.name} no longer fits ${wall.name}.`);
      if (index > 0 && opening.offset < previousEnd - 0.001) throw new Error(`${opening.name} overlaps another opening in ${wall.name}.`);
      previousEnd = opening.offset + opening.width;
    }
    if (openings.length !== wall.openingIds.length) throw new Error(`${wall.name} refers to a missing opening.`);
  }
}

export function applyOperation(source: ProjectModel, operation: DesignOperation): OperationResult {
  const model: ProjectModel = structuredClone(source);
  const affectedIds = new Set<EntityId>();
  let label: string;

  if (operation.type === "resize_room") {
    const room = model.rooms[operation.roomId];
    if (!room) throw new Error(`Room ${operation.roomId} does not exist.`);
    const width = operation.width ?? room.width;
    const length = operation.length ?? room.length;
    if (!(width > 0 && length > 0 && width <= 50 && length <= 50)) {
      throw new Error("Room width and length must be between 0 and 50 metres.");
    }
    const oldBounds = { left: room.x - room.width / 2, right: room.x + room.width / 2, near: room.z - room.length / 2, far: room.z + room.length / 2 };
    const newBounds = { left: room.x - width / 2, right: room.x + width / 2, near: room.z - length / 2, far: room.z + length / 2 };
    room.width = width;
    room.length = length;
    affectedIds.add(room.id);

    // Keep connected boundary walls aligned with the changed room footprint.
    for (const wallId of room.wallIds) {
      const wall = model.walls[wallId];
      if (!wall) continue;
      for (const point of [wall.start, wall.end]) {
        if (Math.abs(point[0] - oldBounds.left) < 0.01) point[0] = newBounds.left;
        else if (Math.abs(point[0] - oldBounds.right) < 0.01) point[0] = newBounds.right;
        if (Math.abs(point[1] - oldBounds.near) < 0.01) point[1] = newBounds.near;
        else if (Math.abs(point[1] - oldBounds.far) < 0.01) point[1] = newBounds.far;
      }
      affectedIds.add(wallId);
    }
    label = `Resize ${room.name}`;
  } else if (operation.type === "move_wall") {
    const wall = model.walls[operation.wallId];
    if (!wall) throw new Error(`Wall ${operation.wallId} does not exist.`);
    if (![operation.dx, operation.dz].every(Number.isFinite)) throw new Error("Wall movement must use finite coordinates.");
    const horizontal = Math.abs(wall.end[1] - wall.start[1]) < 0.01;
    const vertical = Math.abs(wall.end[0] - wall.start[0]) < 0.01;
    if (!horizontal && !vertical) throw new Error("This room editor currently moves axis-aligned walls only.");
    if ((horizontal && Math.abs(operation.dx) > 0.001) || (!horizontal && Math.abs(operation.dz) > 0.001)) {
      throw new Error("Move this wall perpendicular to its length so connected room boundaries remain valid.");
    }
    const originalStart: [number, number] = [...wall.start];
    const originalEnd: [number, number] = [...wall.end];
    for (const roomId of wall.roomIds) {
      const room = model.rooms[roomId];
      if (!room) continue;
      const old = { left: room.x - room.width / 2, right: room.x + room.width / 2, near: room.z - room.length / 2, far: room.z + room.length / 2 };
      if (horizontal) {
        const farSide = (originalStart[1] + originalEnd[1]) / 2 > room.z;
        const nextLength = room.length + (farSide ? operation.dz : -operation.dz);
        if (nextLength <= 0.5) throw new Error("This wall movement would leave the room too narrow.");
        room.length = nextLength;
        room.z += operation.dz / 2;
      } else {
        const rightSide = (originalStart[0] + originalEnd[0]) / 2 > room.x;
        const nextWidth = room.width + (rightSide ? operation.dx : -operation.dx);
        if (nextWidth <= 0.5) throw new Error("This wall movement would leave the room too narrow.");
        room.width = nextWidth;
        room.x += operation.dx / 2;
      }
      const next = { left: room.x - room.width / 2, right: room.x + room.width / 2, near: room.z - room.length / 2, far: room.z + room.length / 2 };
      for (const connectedWallId of room.wallIds) {
        const connectedWall = model.walls[connectedWallId];
        if (!connectedWall) continue;
        for (const point of [connectedWall.start, connectedWall.end]) {
          if (horizontal && Math.abs(point[1] - old.near) < 0.01 && Math.abs(originalStart[1] - old.near) < 0.01) point[1] = next.near;
          else if (horizontal && Math.abs(point[1] - old.far) < 0.01 && Math.abs(originalStart[1] - old.far) < 0.01) point[1] = next.far;
          else if (!horizontal && Math.abs(point[0] - old.left) < 0.01 && Math.abs(originalStart[0] - old.left) < 0.01) point[0] = next.left;
          else if (!horizontal && Math.abs(point[0] - old.right) < 0.01 && Math.abs(originalStart[0] - old.right) < 0.01) point[0] = next.right;
        }
        affectedIds.add(connectedWallId);
      }
      affectedIds.add(room.id);
    }
    if (wall.roomIds.length === 0) {
      wall.start = [wall.start[0] + operation.dx, wall.start[1] + operation.dz];
      wall.end = [wall.end[0] + operation.dx, wall.end[1] + operation.dz];
    }
    for (const openingId of wall.openingIds) {
      const opening = model.openings[openingId];
      if (opening && opening.offset + opening.width > Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1])) {
        throw new Error(`${opening.name} would no longer fit on the moved wall.`);
      }
    }
    affectedIds.add(wall.id);
    label = `Move ${wall.name}`;
  } else {
    if (!operation.material.trim()) throw new Error("Material cannot be empty.");
    const { entityId, material } = operation;
    if (model.rooms[entityId]) model.rooms[entityId].floorMaterial = material;
    else if (model.walls[entityId]) model.walls[entityId].material = material;
    else if (model.openings[entityId]) model.openings[entityId].material = material;
    else throw new Error(`Entity ${entityId} does not exist or cannot have a material.`);
    affectedIds.add(entityId);
    label = `Change material on ${entityId}`;
  }

  validateModel(model);
  model.version = source.version + 1;
  return { model, label, affectedIds: [...affectedIds] };
}

export function getRoomArea(model: ProjectModel, roomId: EntityId) {
  const room = model.rooms[roomId];
  return room ? room.width * room.length : 0;
}

export function getWallLength(model: ProjectModel, wallId: EntityId) {
  const wall = model.walls[wallId];
  return wall ? Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) : 0;
}

export function calculateQuantities(model: ProjectModel) {
  return {
    floorArea: Object.keys(model.rooms).reduce((total, id) => total + getRoomArea(model, id), 0),
    wallLength: Object.keys(model.walls).reduce((total, id) => total + getWallLength(model, id), 0),
    windows: Object.values(model.openings).filter((opening) => opening.kind === "window").length,
    doors: Object.values(model.openings).filter((opening) => opening.kind === "door").length,
  };
}
