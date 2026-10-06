import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useAppStore } from "@/state/appStore";

function House() {
  const version = useAppStore((s) => s.version);
  const showSkylight = version > 1;
  return (
    <group>
      {/* Ground floor */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[8, 3, 6]} />
        <meshStandardMaterial color="#d9d4c7" />
      </mesh>
      {/* Upper volume (cantilever) */}
      <mesh position={[1.5, 4.25, -0.5]} castShadow>
        <boxGeometry args={[7, 2.5, 5]} />
        <meshStandardMaterial color="#3a3f4a" />
      </mesh>
      {/* Garage / side wing */}
      <mesh position={[-5.5, 1.25, 1]}>
        <boxGeometry args={[3, 2.5, 4]} />
        <meshStandardMaterial color="#8a7a66" />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 1.6, 3.01]}>
        <planeGeometry args={[5, 2]} />
        <meshStandardMaterial color="#7fb3d5" emissive="#1d3b52" metalness={0.3} roughness={0.1} />
      </mesh>
      <mesh position={[2, 4.25, 2.01]}>
        <planeGeometry args={[5, 1.4]} />
        <meshStandardMaterial color="#7fb3d5" emissive="#1d3b52" metalness={0.3} roughness={0.1} />
      </mesh>
      {/* Door */}
      <mesh position={[-3, 1.1, 3.01]}>
        <planeGeometry args={[1, 2.2]} />
        <meshStandardMaterial color="#5a4632" />
      </mesh>
      {/* Skylight appears after accepting a change */}
      {showSkylight && (
        <mesh position={[-2.5, 3.02, 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 1.5]} />
          <meshStandardMaterial color="#9fd3ff" emissive="#4aa3ff" emissiveIntensity={0.6} />
        </mesh>
      )}
      {/* Terrace slab */}
      <mesh position={[0, 0.05, 5]}>
        <boxGeometry args={[8, 0.1, 4]} />
        <meshStandardMaterial color="#6b6f78" />
      </mesh>
    </group>
  );
}

export function Viewport() {
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);

  return (
    <div id="viewport-root" className="relative min-w-0 flex-1 bg-background">
      <Canvas camera={{ position: [14, 10, 14], fov: 45 }}>
        <color attach="background" args={["#10131a"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 12, 6]} intensity={1.2} />
        <House />
        <Grid
          args={[40, 40]}
          cellSize={1}
          cellColor="#2a2f3a"
          sectionSize={5}
          sectionColor="#3d4a5c"
          fadeDistance={60}
          fadeStrength={1.5}
          infiniteGrid
        />
        <OrbitControls makeDefault target={[0, 2, 0]} autoRotate autoRotateSpeed={0.5} />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 data-mono text-muted-foreground">
        {selectedEntityId ? `selected: ${selectedEntityId}` : "nothing selected"}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 data-mono text-muted-foreground/60">
        drag to orbit · scroll to zoom
      </div>
    </div>
  );
}
