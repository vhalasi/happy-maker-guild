import { useEffect, useState } from "react";
import { Mountain, Layers, Square, BrickWall, DoorOpen, ChevronRight, ChevronDown } from "lucide-react";
import { getProjectTree } from "@/integration/stubs";
import { useAppStore, type TreeNode, type EntityType } from "@/state/appStore";

const ICONS: Record<EntityType, typeof Square> = {
  site: Mountain,
  level: Layers,
  room: Square,
  wall: BrickWall,
  opening: DoorOpen,
};

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const { selectedEntityId, selectEntity } = useAppStore();
  const Icon = ICONS[node.type];
  const hasChildren = !!node.children?.length;
  const selected = selectedEntityId === node.id;

  return (
    <div>
      <button
        onClick={() => {
          selectEntity(node.id);
          if (hasChildren) setOpen(!open);
        }}
        className={`flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-xs transition-colors ${
          selected
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0 opacity-60" /> : <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon className={`h-3.5 w-3.5 shrink-0 ${selected ? "text-blueprint" : "opacity-70"}`} />
        <span className="truncate">{node.label}</span>
      </button>
      {open && node.children?.map((c) => <TreeItem key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

export function ProjectTree() {
  const [tree, setTree] = useState<TreeNode | null>(null);

  useEffect(() => {
    getProjectTree().then(setTree);
  }, []);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="panel-header">Project tree</div>
      <div className="flex-1 overflow-y-auto p-2">
        {tree ? <TreeItem node={tree} depth={0} /> : <p className="data-mono p-3 text-muted-foreground">Loading…</p>}
      </div>
    </aside>
  );
}
