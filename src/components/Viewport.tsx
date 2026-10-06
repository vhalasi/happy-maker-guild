import { createElement as h, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, useGLTF } from "@react-three/drei";
import { useAppStore } from "@/state/appStore";
import { getWallLength } from "@/engine/operations";
import type { Opening, Wall } from "@/engine/model";

type V3 = [number, number, number];

function DetailedAsset({ url, onSelect, validIds }: { url: string; onSelect: (id: string | null) => void; validIds: Set<string> }) {
  const { scene } = useGLTF(url);
  return h("primitive", {
    object: scene,
    onClick: (event: { stopPropagation: () => void; object: { name: string; parent: { name: string; parent?: unknown } | null } }) => {
      event.stopPropagation();
      let node: { name: string; parent: { name: string; parent?: unknown } | null } | null = event.object;
      while (node && !validIds.has(node.name)) node = node.parent;
      onSelect(node?.name ?? null);
    },
  });
}

function RoomMesh({ room, elevation, selected, onSelect }: { room: { id: string; x: number; z: number; width: number; length: number; floorMaterial: string }; elevation: number; selected: boolean; onSelect: () => void }) {
  const color = room.floorMaterial.toLowerCase().includes("oak") ? "#9e815e" : room.floorMaterial.toLowerCase().includes("tile") ? "#8d9aa0" : "#777d80";
  return h("mesh", {
    position: [room.x, elevation + 0.025, room.z],
    rotation: [-Math.PI / 2, 0, 0],
    onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(); },
  },
    h("planeGeometry", { args: [room.width, room.length] }),
    h("meshStandardMaterial", { color: selected ? "#5f94bf" : color, side: 2, transparent: true, opacity: selected ? 0.85 : 0.72 }),
  );
}

function WallMesh({ wall, openings, elevation, selected, onSelect }: { wall: Wall; openings: Opening[]; elevation: number; selected: boolean; onSelect: (id: string) => void }) {
  const length = getWallLength(useAppStore.getState().model, wall.id);
  const x = (wall.start[0] + wall.end[0]) / 2;
  const z = (wall.start[1] + wall.end[1]) / 2;
  const angle = -Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0]);
  const elements: ReactNode[] = [];
  const addPanel = (key: string, start: number, end: number, bottom: number, top: number) => {
    if (end - start < 0.02 || top - bottom < 0.02) return;
    elements.push(h("mesh", {
      key,
      position: [start + (end - start) / 2 - length / 2, bottom + (top - bottom) / 2, 0],
      onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(wall.id); },
    }, h("boxGeometry", { args: [end - start, top - bottom, wall.thickness] }),
    h("meshStandardMaterial", { color: selected ? "#6ca7d5" : wall.material.toLowerCase().includes("timber") ? "#b99b78" : "#d5d0c5", roughness: 0.82 })));
  };
  let cursor = 0;
  for (const [index, opening] of openings.slice().sort((a, b) => a.offset - b.offset).entries()) {
    const start = Math.max(cursor, opening.offset);
    const end = Math.min(length, opening.offset + opening.width);
    addPanel(`wall-${wall.id}-${index}-before`, cursor, start, 0, wall.height);
    addPanel(`wall-${wall.id}-${index}-sill`, start, end, 0, opening.sillHeight);
    addPanel(`wall-${wall.id}-${index}-header`, start, end, opening.sillHeight + opening.height, wall.height);
    const centerX = (start + end) / 2 - length / 2;
    const frameColor = opening.kind === "window" ? "#65696a" : "#76583a";
    const frame = 0.055;
    const selectOpening = (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(opening.id); };
    for (const [side, frameX] of [["left", start - length / 2 + frame / 2], ["right", end - length / 2 - frame / 2]] as const) {
      elements.push(h("mesh", { key: `${opening.id}-${side}-jamb`, position: [frameX, opening.sillHeight + opening.height / 2, wall.thickness * 0.52], onClick: selectOpening }, h("boxGeometry", { args: [frame, opening.height, 0.06] }), h("meshStandardMaterial", { color: frameColor, metalness: opening.kind === "window" ? 0.45 : 0, roughness: 0.4 })));
    }
    elements.push(h("mesh", { key: `${opening.id}-head`, position: [centerX, opening.sillHeight + opening.height - frame / 2, wall.thickness * 0.52], onClick: selectOpening }, h("boxGeometry", { args: [end - start, frame, 0.06] }), h("meshStandardMaterial", { color: frameColor, metalness: opening.kind === "window" ? 0.45 : 0, roughness: 0.4 })));
    if (opening.kind === "window") {
      elements.push(h("mesh", { key: `${opening.id}-sill`, position: [centerX, opening.sillHeight + frame / 2, wall.thickness * 0.58], onClick: selectOpening }, h("boxGeometry", { args: [end - start + 0.12, frame, 0.12] }), h("meshStandardMaterial", { color: "#a9afb2", metalness: 0.3, roughness: 0.34 })));
      elements.push(h("mesh", { key: `${opening.id}-glass`, position: [centerX, opening.sillHeight + opening.height / 2, 0], onClick: selectOpening }, h("planeGeometry", { args: [Math.max(0.02, end - start - frame * 2), Math.max(0.02, opening.height - frame * 2)] }), h("meshPhysicalMaterial", { color: "#8ec8e7", transmission: 0.48, transparent: true, opacity: 0.62, roughness: 0.1, metalness: 0.12 })));
    } else {
      elements.push(h("mesh", { key: `${opening.id}-door`, position: [centerX, opening.height / 2, wall.thickness * 0.45], onClick: selectOpening }, h("boxGeometry", { args: [Math.max(0.02, end - start - frame * 2), Math.max(0.02, opening.height - frame), 0.05] }), h("meshStandardMaterial", { color: opening.material.toLowerCase().includes("oak") ? "#785435" : "#8b755e", roughness: 0.55 })));
      elements.push(h("mesh", { key: `${opening.id}-handle`, position: [centerX + Math.min(0.34, (end - start) * 0.3), 1.02, wall.thickness * 0.54], onClick: selectOpening }, h("sphereGeometry", { args: [0.045, 10, 8] }), h("meshStandardMaterial", { color: "#d1b477", metalness: 0.8, roughness: 0.2 })));
    }
    cursor = end;
  }
  addPanel(`wall-${wall.id}-after`, cursor, length, 0, wall.height);
  return h("group", {
    position: [x, elevation, z],
    rotation: [0, angle, 0],
    onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(wall.id); },
  }, ...elements);
}

function Scene() {
  const model = useAppStore((s) => s.model);
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const selectEntity = useAppStore((s) => s.selectEntity);
  const detailedAsset = useAppStore((s) => s.jobs.filter((job) => job.status === "done" && job.artifactUrl && job.modelVersion === s.model.version).at(-1));
  const validIds = new Set([...Object.keys(model.rooms), ...Object.keys(model.walls), ...Object.keys(model.openings), ...Object.keys(model.levels), ...Object.keys(model.buildings), model.site.id]);
  const nodes = Object.values(model.levels).flatMap((level) => [
    ...level.roomIds.map((roomId) => {
      const room = model.rooms[roomId];
      return room ? h(RoomMesh, { key: roomId, room, elevation: level.elevation, selected: selectedEntityId === roomId, onSelect: () => selectEntity(roomId) }) : null;
    }),
    ...level.wallIds.map((wallId) => {
      const wall = model.walls[wallId];
      return wall ? h(WallMesh, { key: wallId, wall, openings: wall.openingIds.map((id) => model.openings[id]).filter((opening): opening is Opening => Boolean(opening)), elevation: level.elevation, selected: selectedEntityId === wallId, onSelect: (id) => selectEntity(id) }) : null;
    }),
  ]);

  return h("group", null,
    h("color", { key: "bg", attach: "background", args: ["#10131a"] }),
    h("ambientLight", { key: "amb", intensity: 0.7 }),
    h("directionalLight", { key: "sun", position: [10, 14, 6], intensity: 1.25 }),
    ...(detailedAsset?.artifactUrl
      ? [h(Suspense, { key: `detailed-${detailedAsset.id}`, fallback: null }, h(DetailedAsset, { url: detailedAsset.artifactUrl, onSelect: selectEntity, validIds }))]
      : nodes),
    h(Grid, { key: "grid", args: [40, 40], cellSize: 1, cellColor: "#2a2f3a", sectionSize: 5, sectionColor: "#3d4a5c", fadeDistance: 60, fadeStrength: 1.5, infiniteGrid: true }),
    h(OrbitControls, { key: "orbit", makeDefault: true, target: [0, 2, 0] }),
  );
}

export function Viewport() {
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const modelVersion = useAppStore((s) => s.model.version);
  return (
    <div id="viewport-root" className="relative min-w-0 flex-1 bg-background">
      {h(Canvas, { camera: { position: [14, 10, 14], fov: 45 } }, h(Scene))}
      <div className="pointer-events-none absolute left-3 top-3 data-mono text-muted-foreground">
        {selectedEntityId ? `selected: ${selectedEntityId}` : "click a room or wall to select"}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 data-mono text-muted-foreground/60">
        model v{modelVersion} · drag to orbit · scroll to zoom
      </div>
    </div>
  );
}
