/** Canonical architectural data model. Renderers and tools consume this model;
 * they do not maintain independent copies of building geometry. */
export type EntityId = string;
export type MaterialId = string;

export interface Site {
  id: EntityId;
  name: string;
  width: number;
  length: number;
  orientationDegrees: number;
  buildingIds: EntityId[];
}

export interface Level {
  id: EntityId;
  name: string;
  elevation: number;
  height: number;
  roomIds: EntityId[];
  wallIds: EntityId[];
}

export interface Room {
  id: EntityId;
  name: string;
  levelId: EntityId;
  /** Rectangular MVP footprint in metres, centred on x/z. */
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  floorMaterial: MaterialId;
  wallIds: EntityId[];
}

export interface Wall {
  id: EntityId;
  name: string;
  levelId: EntityId;
  start: [number, number];
  end: [number, number];
  height: number;
  thickness: number;
  material: MaterialId;
  roomIds: EntityId[];
  openingIds: EntityId[];
}

export interface Opening {
  id: EntityId;
  name: string;
  kind: "door" | "window" | "skylight";
  wallId: EntityId;
  width: number;
  height: number;
  sillHeight: number;
  offset: number;
  material: MaterialId;
}

export interface Building {
  id: EntityId;
  name: string;
  levelIds: EntityId[];
  roofMaterial: MaterialId;
}

export interface ProjectModel {
  schemaVersion: 1;
  version: number;
  site: Site;
  buildings: Record<EntityId, Building>;
  levels: Record<EntityId, Level>;
  rooms: Record<EntityId, Room>;
  walls: Record<EntityId, Wall>;
  openings: Record<EntityId, Opening>;
}

export const initialModel: ProjectModel = {
  schemaVersion: 1,
  version: 12,
  site: { id: "site", name: "Moreno parcel", width: 22, length: 34, orientationDegrees: 0, buildingIds: ["building-main"] },
  buildings: {
    "building-main": { id: "building-main", name: "Villa Moreno", levelIds: ["level-0", "level-1"], roofMaterial: "Slate" },
  },
  levels: {
    "level-0": { id: "level-0", name: "Ground floor", elevation: 0, height: 2.8, roomIds: ["room-living", "room-kitchen"], wallIds: ["wall-living-north", "wall-living-east", "wall-living-south", "wall-living-west", "wall-kitchen-north", "wall-kitchen-east", "wall-kitchen-south", "wall-kitchen-west"] },
    "level-1": { id: "level-1", name: "Upper floor", elevation: 2.8, height: 2.6, roomIds: ["room-bedroom", "room-bath"], wallIds: ["wall-bedroom-north", "wall-bedroom-east", "wall-bedroom-south", "wall-bedroom-west", "wall-bath-north", "wall-bath-east", "wall-bath-south", "wall-bath-west"] },
  },
  rooms: {
    "room-living": { id: "room-living", name: "Living room", levelId: "level-0", x: -1.2, z: 0, width: 5.4, length: 7.2, height: 2.8, floorMaterial: "Oak parquet", wallIds: ["wall-living-north", "wall-living-east", "wall-living-south", "wall-living-west"] },
    "room-kitchen": { id: "room-kitchen", name: "Kitchen", levelId: "level-0", x: 4.2, z: 0, width: 3.6, length: 4.1, height: 2.8, floorMaterial: "Polished concrete", wallIds: ["wall-kitchen-north", "wall-kitchen-east", "wall-kitchen-south", "wall-kitchen-west"] },
    "room-bedroom": { id: "room-bedroom", name: "Bedroom", levelId: "level-1", x: 1.5, z: 0, width: 3.9, length: 4.4, height: 2.6, floorMaterial: "Oak parquet", wallIds: ["wall-bedroom-north", "wall-bedroom-east", "wall-bedroom-south", "wall-bedroom-west"] },
    "room-bath": { id: "room-bath", name: "Bathroom", levelId: "level-1", x: -2.4, z: 0, width: 2.4, length: 3, height: 2.6, floorMaterial: "Ceramic tile", wallIds: ["wall-bath-north", "wall-bath-east", "wall-bath-south", "wall-bath-west"] },
  },
  walls: {
    "wall-living-north": { id: "wall-living-north", name: "Living north wall", levelId: "level-0", start: [-3.9, -3.6], end: [1.5, -3.6], height: 2.8, thickness: 0.2, material: "Reinforced concrete", roomIds: ["room-living"], openingIds: [] },
    "wall-living-west": { id: "wall-living-west", name: "Living west wall", levelId: "level-0", start: [-3.9, 3.6], end: [-3.9, -3.6], height: 2.8, thickness: 0.2, material: "Reinforced concrete", roomIds: ["room-living"], openingIds: [] },
    "wall-living-south": { id: "wall-living-south", name: "Living south wall", levelId: "level-0", start: [-3.9, 3.6], end: [1.5, 3.6], height: 2.8, thickness: 0.2, material: "Reinforced concrete", roomIds: ["room-living"], openingIds: ["opening-window-south"] },
    "wall-living-east": { id: "wall-living-east", name: "Living east wall", levelId: "level-0", start: [1.5, -3.6], end: [1.5, 3.6], height: 2.8, thickness: 0.2, material: "Reinforced concrete", roomIds: ["room-living"], openingIds: [] },
    "wall-kitchen-north": { id: "wall-kitchen-north", name: "Kitchen north wall", levelId: "level-0", start: [2.4, -2.05], end: [6, -2.05], height: 2.8, thickness: 0.2, material: "Reinforced concrete", roomIds: ["room-kitchen"], openingIds: ["opening-door-kitchen"] },
    "wall-kitchen-east": { id: "wall-kitchen-east", name: "Kitchen east wall", levelId: "level-0", start: [6, -2.05], end: [6, 2.05], height: 2.8, thickness: 0.2, material: "Reinforced concrete", roomIds: ["room-kitchen"], openingIds: [] },
    "wall-kitchen-south": { id: "wall-kitchen-south", name: "Kitchen south wall", levelId: "level-0", start: [6, 2.05], end: [2.4, 2.05], height: 2.8, thickness: 0.2, material: "Reinforced concrete", roomIds: ["room-kitchen"], openingIds: [] },
    "wall-kitchen-west": { id: "wall-kitchen-west", name: "Kitchen west wall", levelId: "level-0", start: [2.4, 2.05], end: [2.4, -2.05], height: 2.8, thickness: 0.2, material: "Reinforced concrete", roomIds: ["room-kitchen"], openingIds: [] },
    "wall-bedroom-north": { id: "wall-bedroom-north", name: "Bedroom north wall", levelId: "level-1", start: [-0.45, -2.2], end: [3.45, -2.2], height: 2.6, thickness: 0.15, material: "Timber stud", roomIds: ["room-bedroom"], openingIds: [] },
    "wall-bedroom-west": { id: "wall-bedroom-west", name: "Bedroom west wall", levelId: "level-1", start: [-0.45, 2.2], end: [-0.45, -2.2], height: 2.6, thickness: 0.15, material: "Timber stud", roomIds: ["room-bedroom"], openingIds: [] },
    "wall-bedroom-south": { id: "wall-bedroom-south", name: "Bedroom south wall", levelId: "level-1", start: [-0.45, 2.2], end: [3.45, 2.2], height: 2.6, thickness: 0.15, material: "Timber stud", roomIds: ["room-bedroom"], openingIds: ["opening-window-upper"] },
    "wall-bedroom-east": { id: "wall-bedroom-east", name: "Bedroom east wall", levelId: "level-1", start: [3.45, -2.2], end: [3.45, 2.2], height: 2.6, thickness: 0.15, material: "Timber stud", roomIds: ["room-bedroom"], openingIds: [] },
    "wall-bath-north": { id: "wall-bath-north", name: "Bathroom north wall", levelId: "level-1", start: [-3.6, -1.5], end: [-1.2, -1.5], height: 2.6, thickness: 0.15, material: "Timber stud", roomIds: ["room-bath"], openingIds: [] },
    "wall-bath-east": { id: "wall-bath-east", name: "Bathroom east wall", levelId: "level-1", start: [-1.2, -1.5], end: [-1.2, 1.5], height: 2.6, thickness: 0.15, material: "Timber stud", roomIds: ["room-bath"], openingIds: [] },
    "wall-bath-south": { id: "wall-bath-south", name: "Bathroom south wall", levelId: "level-1", start: [-1.2, 1.5], end: [-3.6, 1.5], height: 2.6, thickness: 0.15, material: "Timber stud", roomIds: ["room-bath"], openingIds: [] },
    "wall-bath-west": { id: "wall-bath-west", name: "Bathroom west wall", levelId: "level-1", start: [-3.6, 1.5], end: [-3.6, -1.5], height: 2.6, thickness: 0.15, material: "Timber stud", roomIds: ["room-bath"], openingIds: [] },
  },
  openings: {
    "opening-window-south": { id: "opening-window-south", name: "South window", kind: "window", wallId: "wall-living-south", width: 2.4, height: 1.6, sillHeight: 0.8, offset: 1.5, material: "Triple-glazed aluminium" },
    "opening-door-kitchen": { id: "opening-door-kitchen", name: "Kitchen door", kind: "door", wallId: "wall-kitchen-north", width: 0.9, height: 2.1, sillHeight: 0, offset: 1.35, material: "Oak veneer" },
    "opening-window-upper": { id: "opening-window-upper", name: "Upper window", kind: "window", wallId: "wall-bedroom-south", width: 1.8, height: 1.2, sillHeight: 0.8, offset: 1, material: "Triple-glazed aluminium" },
  },
};

export function getEntityLabel(model: ProjectModel, id: EntityId) {
  if (id === model.site.id) return model.site.name;
  return model.rooms[id]?.name ?? model.walls[id]?.name ?? model.openings[id]?.name ?? model.levels[id]?.name ?? model.buildings[id]?.name;
}
