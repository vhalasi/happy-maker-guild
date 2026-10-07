import { createElement as h, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, useGLTF, Environment, Lightformer, useTexture } from "@react-three/drei";
import { useAppStore } from "@/state/appStore";
import { Button } from "@/components/ui/button";
import { Box, Layers } from "lucide-react";
import { Color, DoubleSide, RepeatWrapping, SRGBColorSpace, CanvasTexture } from "three";
import oakImage from "@/assets/oak-floor.jpg";
import plasterImage from "@/assets/mineral-plaster.jpg";
import type { Opening, Wall } from "@/engine/model";

type Palette = { plaster: string; timber: string; concrete: string; metal: string; glass: string; brass: string; selection: string; ground: string; paving: string; sky: string; sun: string; white: string };
function usePalette() {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const get = (name: string) => style.getPropertyValue(`--scene-${name}`).trim();
    setPalette({ plaster: get("plaster"), timber: get("timber"), concrete: get("concrete"), metal: get("metal"), glass: get("glass"), brass: get("brass"), selection: get("selection"), ground: get("ground"), paving: get("paving"), sky: get("sky"), sun: get("sun"), white: get("white") });
  }, []);
  return palette;
}
function useSurface(url: string, width: number, height: number) {
  const source = useTexture(url);
  const texture = useMemo(() => {
    const result = source.clone();
    result.wrapS = result.wrapT = RepeatWrapping;
    result.repeat.set(Math.max(0.5, width / 3), Math.max(0.5, height / 3));
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 8;
    result.needsUpdate = true;
    return result;
  }, [source, width, height]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
function Ground({ palette }: { palette: Palette }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = palette.ground;
      context.fillRect(0, 0, 256, 256);
      const base = new Color(palette.ground);
      for (let i = 0; i < 12000; i++) {
        context.fillStyle = base.clone().multiplyScalar(0.8 + (Math.sin(i * 91.7) + 1) * 0.2).getStyle();
        context.fillRect((i * 37.13) % 256, (i * 73.17) % 256, 1, 2);
      }
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.wrapS = result.wrapT = RepeatWrapping;
    result.repeat.set(30, 30);
    return result;
  }, [palette]);
  useEffect(() => () => texture.dispose(), [texture]);
  return h("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.25, 0], receiveShadow: true }, h("planeGeometry", { args: [180, 180] }), h("meshStandardMaterial", { map: texture, roughness: 1 }));
}
type SceneNode = { name: string; parent: SceneNode | null };

function DetailedAsset({ url, onSelect, validIds }: { url: string; onSelect: (id: string | null) => void; validIds: Set<string> }) {
  const { scene } = useGLTF(url);
  return h("primitive", {
    object: scene,
    onClick: (event: { stopPropagation: () => void; object: SceneNode }) => {
      event.stopPropagation();
      let node: SceneNode | null = event.object;
      while (node && !validIds.has(node.name)) node = node.parent;
      onSelect(node?.name ?? null);
    },
  });
}

function RoomMesh({ room, elevation, selected, onSelect, palette }: { palette: Palette; room: { id: string; x: number; z: number; width: number; length: number; floorMaterial: string }; elevation: number; selected: boolean; onSelect: () => void }) {
  const oak = room.floorMaterial.toLowerCase().includes("oak");
  const texture = useSurface(oak ? oakImage : plasterImage, room.width, room.length);
  return h("group", null,
    h("mesh", { position: [room.x, elevation - 0.12, room.z], receiveShadow: true, castShadow: true }, h("boxGeometry", { args: [room.width, 0.24, room.length] }), h("meshStandardMaterial", { color: palette.concrete, roughness: 0.92 })),
    h("mesh", { position: [room.x, elevation + 0.012, room.z], receiveShadow: true, rotation: [-Math.PI / 2, 0, 0], onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(); } }, h("planeGeometry", { args: [room.width, room.length] }), h("meshStandardMaterial", { map: texture, color: selected ? palette.selection : oak ? palette.white : palette.concrete, roughness: oak ? 0.52 : 0.75, side: DoubleSide })),
  );
}

function WallMesh({ wall, openings, elevation, selected, onSelect, palette }: { palette: Palette; wall: Wall; openings: Opening[]; elevation: number; selected: boolean; onSelect: (id: string) => void }) {
  const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
  const texture = useSurface(plasterImage, length, wall.height);
  const wood = useSurface(oakImage, 1, wall.height);
  const x = (wall.start[0] + wall.end[0]) / 2;
  const z = (wall.start[1] + wall.end[1]) / 2;
  const angle = -Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0]);
  const elements: ReactNode[] = [];
  const addPanel = (key: string, start: number, end: number, bottom: number, top: number) => {
    if (end - start < 0.02 || top - bottom < 0.02) return;
    elements.push(h("mesh", {
      key, castShadow: true, receiveShadow: true,
      position: [start + (end - start) / 2 - length / 2, bottom + (top - bottom) / 2, 0],
      onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(wall.id); },
    }, h("boxGeometry", { args: [end - start, top - bottom, wall.thickness] }),
    h("meshStandardMaterial", { map: texture, bumpMap: texture, bumpScale: 0.008, color: selected ? palette.selection : wall.material.toLowerCase().includes("timber") ? palette.timber : palette.plaster, roughness: 0.86 })));
  };
  let cursor = 0;
  for (const [index, opening] of openings.slice().sort((a, b) => a.offset - b.offset).entries()) {
    const start = Math.max(cursor, opening.offset);
    const end = Math.min(length, opening.offset + opening.width);
    addPanel(`wall-${wall.id}-${index}-before`, cursor, start, 0, wall.height);
    addPanel(`wall-${wall.id}-${index}-sill`, start, end, 0, opening.sillHeight);
    addPanel(`wall-${wall.id}-${index}-header`, start, end, opening.sillHeight + opening.height, wall.height);
    const centerX = (start + end) / 2 - length / 2;
    const frameColor = opening.kind === "window" ? palette.metal : palette.timber;
    const frame = 0.055;
    const selectOpening = (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(opening.id); };
    for (const [side, frameX] of [["left", start - length / 2 + frame / 2], ["right", end - length / 2 - frame / 2]] as const) {
      elements.push(h("mesh", { key: `${opening.id}-${side}-jamb`, position: [frameX, opening.sillHeight + opening.height / 2, wall.thickness * 0.52], onClick: selectOpening }, h("boxGeometry", { args: [frame, opening.height, 0.06] }), h("meshStandardMaterial", { color: frameColor, metalness: opening.kind === "window" ? 0.45 : 0, roughness: 0.4 })));
    }
    elements.push(h("mesh", { key: `${opening.id}-head`, position: [centerX, opening.sillHeight + opening.height - frame / 2, wall.thickness * 0.52], onClick: selectOpening }, h("boxGeometry", { args: [end - start, frame, 0.06] }), h("meshStandardMaterial", { color: frameColor, metalness: opening.kind === "window" ? 0.45 : 0, roughness: 0.4 })));
    if (opening.kind === "window") {
      elements.push(h("mesh", { key: `${opening.id}-sill`, position: [centerX, opening.sillHeight + frame / 2, wall.thickness * 0.58], onClick: selectOpening }, h("boxGeometry", { args: [end - start + 0.12, frame, 0.12] }), h("meshStandardMaterial", { color: palette.metal, metalness: 0.3, roughness: 0.34 })));
      elements.push(h("mesh", { key: `${opening.id}-glass`, position: [centerX, opening.sillHeight + opening.height / 2, 0], onClick: selectOpening }, h("planeGeometry", { args: [Math.max(0.02, end - start - frame * 2), Math.max(0.02, opening.height - frame * 2)] }), h("meshPhysicalMaterial", { color: palette.glass, transmission: 0.72, transparent: true, opacity: 0.8, roughness: 0.08, metalness: 0, thickness: 0.025, ior: 1.5, side: DoubleSide })));
    } else {
      elements.push(h("mesh", { key: `${opening.id}-door`, position: [centerX, opening.height / 2, wall.thickness * 0.45], onClick: selectOpening }, h("boxGeometry", { args: [Math.max(0.02, end - start - frame * 2), Math.max(0.02, opening.height - frame), 0.05] }), h("meshStandardMaterial", { map: wood, color: palette.timber, roughness: 0.5 })));
      elements.push(h("mesh", { key: `${opening.id}-handle`, position: [centerX + Math.min(0.34, (end - start) * 0.3), 1.02, wall.thickness * 0.54], onClick: selectOpening }, h("sphereGeometry", { args: [0.045, 10, 8] }), h("meshStandardMaterial", { color: palette.brass, metalness: 0.8, roughness: 0.2 })));
    }
    if (opening.kind === "window" && opening.width > 1.5) {
      elements.push(h("mesh", { key: `${opening.id}-mullion`, position: [centerX, opening.sillHeight + opening.height / 2, 0.02], onClick: selectOpening }, h("boxGeometry", { args: [0.045, opening.height, 0.08] }), h("meshStandardMaterial", { color: palette.metal, metalness: 0.65, roughness: 0.3 })));
    }
    cursor = end;
  }
  addPanel(`wall-${wall.id}-after`, cursor, length, 0, wall.height);
  elements.push(h("mesh", { key: "coping", position: [0, wall.height - 0.025, 0], castShadow: true }, h("boxGeometry", { args: [length + 0.03, 0.05, wall.thickness + 0.04] }), h("meshStandardMaterial", { color: palette.plaster, roughness: 0.7 })));
  return h("group", {
    position: [x, elevation, z],
    rotation: [0, angle, 0],
    onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onSelect(wall.id); },
  }, ...elements);
}

function Scene({ palette, exterior }: { palette: Palette; exterior: boolean }) {
  const model = useAppStore((s) => s.model);
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const selectEntity = useAppStore((s) => s.selectEntity);
  const detailedAsset = useAppStore((s) => s.jobs.filter((job) => job.status === "done" && job.artifactUrl && job.modelVersion === s.model.version).at(-1));
  const validIds = new Set([...Object.keys(model.rooms), ...Object.keys(model.walls), ...Object.keys(model.openings), ...Object.keys(model.levels), ...Object.keys(model.buildings), model.site.id]);
  const nodes = Object.values(model.levels).flatMap((level) => [
    ...level.roomIds.map((roomId) => {
      const room = model.rooms[roomId];
      return room ? h(RoomMesh, { key: roomId, room, palette, elevation: level.elevation, selected: selectedEntityId === roomId, onSelect: () => selectEntity(roomId) }) : null;
    }),
    ...level.wallIds.map((wallId) => {
      const wall = model.walls[wallId];
      return wall ? h(WallMesh, { key: wallId, wall, palette, openings: wall.openingIds.map((id) => model.openings[id]).filter((opening): opening is Opening => Boolean(opening)), elevation: level.elevation, selected: selectedEntityId === wallId, onSelect: (id) => selectEntity(id) }) : null;
    }),
  ]);

  const roofNodes = Object.values(model.buildings).flatMap((building) => {
    const top = building.levelIds.map((id) => model.levels[id]).filter(Boolean).sort((a, b) => b.elevation - a.elevation)[0];
    if (!top) return [];
    return top.roomIds.flatMap((id) => {
      const room = model.rooms[id];
      if (!room) return [];
      const y = top.elevation + room.height + 0.08;
      return [h("mesh", { key: `roof-${id}`, position: [room.x, y, room.z], castShadow: true, receiveShadow: true, onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); selectEntity(building.id); } }, h("boxGeometry", { args: [room.width + 0.18, 0.16, room.length + 0.18] }), h("meshStandardMaterial", { color: palette.metal, roughness: 0.55, metalness: 0.45 }))];
    });
  });
  return h("group", null,
    h("color", { key: "background", attach: "background", args: [palette.sky] }),
    h("fog", { key: "fog", attach: "fog", args: [palette.sky, 45, 150] }),
    h("hemisphereLight", { key: "hemi", args: [palette.sky, palette.ground, 1.15] }),
    h("directionalLight", { key: "sun", position: [15, 22, 14], intensity: 2.5, color: palette.sun, castShadow: true, "shadow-mapSize-width": 2048, "shadow-mapSize-height": 2048, "shadow-camera-left": -18, "shadow-camera-right": 18, "shadow-camera-top": 18, "shadow-camera-bottom": -18, "shadow-normalBias": 0.025 }),
    h(Environment, { key: "env", resolution: 128 },
      h(Lightformer, { intensity: 2, color: palette.white, position: [0, 8, 0], scale: [20, 20, 1], rotation: [Math.PI / 2, 0, 0] }),
      h(Lightformer, { intensity: 1.5, color: palette.sky, position: [-10, 4, -4], rotation: [0, Math.PI / 2, 0], scale: [20, 8, 1] }),
    ),
    h(Ground, { key: "ground", palette }),
    h("mesh", { key: "plot", rotation: [-Math.PI / 2, 0, 0], position: [0, -0.245, 0], receiveShadow: true }, h("planeGeometry", { args: [model.site.width, model.site.length] }), h("meshStandardMaterial", { color: palette.ground, roughness: 1 })),
    ...(detailedAsset?.artifactUrl
      ? [h(Suspense, { key: `detailed-${detailedAsset.id}`, fallback: h("group", null, ...nodes) }, h(DetailedAsset, { url: detailedAsset.artifactUrl, onSelect: selectEntity, validIds }))]
      : [...nodes, ...(exterior ? roofNodes : [])]),
    ...(!exterior ? [h(Grid, { key: "grid", position: [0, -0.24, 0], args: [40, 40], cellSize: 1, cellColor: palette.paving, cellThickness: 0.4, sectionSize: 5, sectionColor: palette.concrete, fadeDistance: 30, fadeStrength: 2 })] : []),
    h(OrbitControls, { key: "orbit", makeDefault: true, target: [0, 2.5, 0], autoRotate: false, enableDamping: true, minDistance: 4, maxDistance: 100, maxPolarAngle: Math.PI / 2.05 }),
  );
}

export function Viewport() {
  const palette = usePalette();
  const [exterior, setExterior] = useState(true);
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const modelVersion = useAppStore((s) => s.model.version);
  return (
    <div id="viewport-root" className="relative min-w-0 flex-1 bg-background">
      {palette && h(Canvas, { shadows: true, dpr: [1, 1.5], camera: { position: [17, 12, 17], fov: 42 }, gl: { antialias: true }, onPointerMissed: () => useAppStore.getState().selectEntity(null) }, h(Suspense, { fallback: null }, h(Scene, { palette, exterior })))}
      <div className="absolute right-3 top-3 flex gap-1 rounded-md border border-border bg-background/90 p-1">
        <Button size="sm" variant={exterior ? "secondary" : "ghost"} onClick={() => setExterior(true)}><Box className="h-3.5 w-3.5" />Exterior</Button>
        <Button size="sm" variant={!exterior ? "secondary" : "ghost"} onClick={() => setExterior(false)}><Layers className="h-3.5 w-3.5" />Open roof</Button>
      </div>
      <div className="pointer-events-none absolute left-3 top-3 data-mono text-muted-foreground">
        {selectedEntityId ? `selected: ${selectedEntityId}` : "click a room or wall to select"}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 data-mono text-muted-foreground/60">
        model v{modelVersion} · drag to orbit · scroll to zoom
      </div>
    </div>
  );
}
