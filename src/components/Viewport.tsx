import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useAppStore } from "@/state/appStore";

export function Viewport() {
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);

  return (
    <div id="viewport-root" className="relative min-w-0 flex-1 bg-background">
      <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
        <color attach="background" args={["#10131a"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 12, 6]} intensity={1.1} />
        <Grid
          args={[40, 40]}
          cellSize={1}
          cellColor="#2a2f3a"
          sectionSize={5}
          sectionColor="#3d4a5c"
          fadeDistance={45}
          fadeStrength={1.5}
          infiniteGrid
        />
        <OrbitControls makeDefault />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 data-mono text-muted-foreground">
        {selectedEntityId ? `selected: ${selectedEntityId}` : "nothing selected"}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 data-mono text-muted-foreground/60">
        geometry engine pending — src/scene
      </div>
    </div>
  );
}
