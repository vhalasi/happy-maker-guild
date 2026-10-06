import { createElement as h } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useAppStore } from "@/state/appStore";

// NOTE: Three.js scene nodes are built with createElement (not JSX) on purpose:
// the dev-only source-injection plugin adds a `data-tsd-source` prop to every JSX
// element, which React Three Fiber cannot apply to 3D objects and crashes on.

type V3 = [number, number, number];

function box(key: string, position: V3, size: V3, color: string) {
  return h(
    "mesh",
    { key, position },
    h("boxGeometry", { args: size }),
    h("meshStandardMaterial", { color }),
  );
}

function glass(key: string, position: V3, size: [number, number], extra: Record<string, unknown> = {}) {
  return h(
    "mesh",
    { key, position, ...extra },
    h("planeGeometry", { args: size }),
    h("meshStandardMaterial", {
      color: "#7fb3d5",
      emissive: "#1d3b52",
      metalness: 0.3,
      roughness: 0.1,
    }),
  );
}

function House() {
  const version = useAppStore((s) => s.version);
  const showSkylight = version > 1;
  return h(
    "group",
    null,
    box("ground", [0, 1.5, 0], [8, 3, 6], "#d9d4c7"),
    box("upper", [1.5, 4.25, -0.5], [7, 2.5, 5], "#3a3f4a"),
    box("wing", [-5.5, 1.25, 1], [3, 2.5, 4], "#8a7a66"),
    box("terrace", [0, 0.05, 5], [8, 0.1, 4], "#6b6f78"),
    glass("win1", [0, 1.6, 3.01], [5, 2]),
    glass("win2", [2, 4.25, 2.01], [5, 1.4]),
    h(
      "mesh",
      { key: "door", position: [-3, 1.1, 3.01] },
      h("planeGeometry", { args: [1, 2.2] }),
      h("meshStandardMaterial", { color: "#5a4632" }),
    ),
    showSkylight &&
      h(
        "mesh",
        { key: "skylight", position: [-2.5, 3.02, 1], rotation: [-Math.PI / 2, 0, 0] },
        h("planeGeometry", { args: [2, 1.5] }),
        h("meshStandardMaterial", { color: "#9fd3ff", emissive: "#4aa3ff", emissiveIntensity: 0.6 }),
      ),
  );
}

function Scene() {
  return h(
    "group",
    null,
    h("color", { key: "bg", attach: "background", args: ["#10131a"] }),
    h("ambientLight", { key: "amb", intensity: 0.6 }),
    h("directionalLight", { key: "sun", position: [10, 12, 6], intensity: 1.2 }),
    h(House, { key: "house" }),
    h(Grid, {
      key: "grid",
      args: [40, 40],
      cellSize: 1,
      cellColor: "#2a2f3a",
      sectionSize: 5,
      sectionColor: "#3d4a5c",
      fadeDistance: 60,
      fadeStrength: 1.5,
      infiniteGrid: true,
    }),
    h(OrbitControls, {
      key: "orbit",
      makeDefault: true,
      target: [0, 2, 0],
      autoRotate: true,
      autoRotateSpeed: 0.5,
    }),
  );
}

export function Viewport() {
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);

  return (
    <div id="viewport-root" className="relative min-w-0 flex-1 bg-background">
      {h(Canvas, { camera: { position: [14, 10, 14], fov: 45 } }, h(Scene))}

      <div className="pointer-events-none absolute left-3 top-3 data-mono text-muted-foreground">
        {selectedEntityId ? `selected: ${selectedEntityId}` : "nothing selected"}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 data-mono text-muted-foreground/60">
        drag to orbit · scroll to zoom
      </div>
    </div>
  );
}
