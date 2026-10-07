import type { ProjectModel, Room, Wall, Opening } from "./model";

/** A contiguous two-storey demonstration, not four unrelated room boxes. */
export function createDemoHouse(): ProjectModel {
  const rooms: Record<string, Room> = {};
  const walls: Record<string, Wall> = {};
  const openings: Record<string, Opening> = {};
  const levels: ProjectModel["levels"] = {};
  const definitions = [
    ["room-living", "Living room", -2, 2, "Oak parquet"],
    ["room-kitchen", "Kitchen", 2, 2, "Ceramic tile"],
    ["room-dining", "Dining room", -2, -2, "Oak parquet"],
    ["room-hall", "Entrance & stairs", 2, -2, "Ceramic tile"],
    ["room-bedroom", "Main bedroom", -2, 2, "Oak parquet"],
    ["room-bedroom-2", "Bedroom", -2, -2, "Oak parquet"],
    ["room-bath", "Bathroom", 2, 2, "Ceramic tile"],
    ["room-landing", "Landing & stairs", 2, -2, "Oak parquet"],
  ] as const;
  for (let floor = 0; floor < 2; floor++) {
    const levelId = `level-${floor}`;
    const edges = new Map<string, string>();
    const level = { id: levelId, name: floor ? "Upper floor" : "Ground floor", elevation: floor * 3.1, height: 3.1, roomIds: [] as string[], wallIds: [] as string[] };
    levels[levelId] = level;
    for (const [id, name, x, z, material] of definitions.slice(floor * 4, floor * 4 + 4)) {
      const room: Room = { id, name, levelId, x, z, width: 4, length: 4, height: 3.1, floorMaterial: material, wallIds: [] };
      rooms[id] = room;
      level.roomIds.push(id);
      const bounds: Array<[string, [number, number], [number, number]]> = [
        ["north", [x - 2, z - 2], [x + 2, z - 2]],
        ["south", [x - 2, z + 2], [x + 2, z + 2]],
        ["west", [x - 2, z - 2], [x - 2, z + 2]],
        ["east", [x + 2, z - 2], [x + 2, z + 2]],
      ];
      for (const [side, start, end] of bounds) {
        const edge = `${start.join(",")}/${end.join(",")}`;
        const existing = edges.get(edge);
        const wallId = existing ?? `wall-${id.replace("room-", "")}-${side}`;
        if (!existing) {
          walls[wallId] = { id: wallId, name: `${name} ${side} wall`, levelId, start, end, height: 3.1, thickness: 0.2, material: "Mineral plaster", roomIds: [], openingIds: [] };
          edges.set(edge, wallId);
          level.wallIds.push(wallId);
        }
        const wall = walls[wallId];
        if (wall) wall.roomIds.push(id);
        room.wallIds.push(wallId);
      }
    }
  }
  for (const wall of Object.values(walls)) {
    const shared = wall.roomIds.length > 1;
    const entry = wall.id === "wall-hall-north";
    const id = `opening-${wall.id.replace("wall-", "")}`;
    const kind = shared || entry ? "door" : "window";
    openings[id] = { id, wallId: wall.id, name: entry ? "Front entrance" : `${wall.name} ${kind}`, kind, width: shared ? 1.1 : entry ? 1 : 2.2, height: kind === "door" ? 2.25 : 1.6, sillHeight: kind === "door" ? 0 : 0.9, offset: shared ? 1.45 : entry ? 1.5 : 0.9, material: kind === "door" ? "Oak veneer" : "Triple-glazed aluminium" };
    wall.openingIds.push(id);
  }
  return { schemaVersion: 1, version: 12, site: { id: "site", name: "Moreno parcel", width: 22, length: 34, orientationDegrees: 0, buildingIds: ["building-main"] }, buildings: { "building-main": { id: "building-main", name: "Villa Moreno", levelIds: ["level-0", "level-1"], roofMaterial: "Standing seam zinc" } }, levels, rooms, walls, openings };
}