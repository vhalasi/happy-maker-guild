import type { ProjectModel, Room } from "./model";

const bounds = (room: Room) => ({ x0: room.x - room.width / 2, x1: room.x + room.width / 2, z0: room.z - room.length / 2, z1: room.z + room.length / 2 });

/** Reject disconnected massing and unsupported storeys instead of displaying them as a house. */
export function validateBuildingContinuity(model: ProjectModel) {
  for (const building of Object.values(model.buildings)) {
    const floors = building.levelIds.flatMap((id) => model.levels[id] ? [model.levels[id]] : []).sort((a, b) => a.elevation - b.elevation);
    for (const [index, floor] of floors.entries()) {
      const rooms = floor.roomIds.flatMap((id) => model.rooms[id] ? [model.rooms[id]] : []);
      if (!rooms.length) continue;
      const connected = new Set([rooms[0]?.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const room of rooms) {
          if (connected.has(room.id)) continue;
          const a = bounds(room);
          if (rooms.some((other) => {
            if (!connected.has(other.id)) return false;
            const b = bounds(other);
            const overlapX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
            const overlapZ = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
            return (Math.min(Math.abs(a.x1 - b.x0), Math.abs(a.x0 - b.x1)) < 0.03 && overlapZ >= 0.8) || (Math.min(Math.abs(a.z1 - b.z0), Math.abs(a.z0 - b.z1)) < 0.03 && overlapX >= 0.8);
          })) { connected.add(room.id); changed = true; }
        }
      }
      if (connected.size !== rooms.length) throw new Error(`${floor.name} contains disconnected rooms. Please request a connected floor plan with aligned room edges.`);
      const lower = floors[index - 1];
      if (!lower) continue;
      if (Math.abs(floor.elevation - lower.elevation - lower.height) > 0.05) throw new Error(`${floor.name} must sit directly on the floor below, not float above it.`);
      const support = lower.roomIds.flatMap((id) => model.rooms[id] ? [model.rooms[id]] : []);
      for (const room of rooms) {
        const a = bounds(room);
        const supportedArea = support.reduce((sum, other) => {
          const b = bounds(other);
          return sum + Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0));
        }, 0);
        if (supportedArea < room.width * room.length - 0.05) throw new Error(`${room.name} extends beyond the supported footprint. Please request aligned storeys; cantilevers need a separate structural design.`);
      }
    }
  }
}