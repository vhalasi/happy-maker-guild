import { useEffect, useState } from "react";
import { getEntity, type EntityProperties } from "@/integration/stubs";
import { useAppStore } from "@/state/appStore";
import { ImpactTable } from "./ImpactTable";
import { calculateQuantities } from "@/engine/operations";
import { toast } from "sonner";

function Field({ label, value, unit, onCommit }: { label: string; value: string; unit?: string; onCommit?: ((value: string) => void) | undefined }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="block">
      <span className="data-mono mb-1 block uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          readOnly={!onCommit}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => { if (onCommit && draft !== value) onCommit(draft); }}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          className={`w-full rounded-sm border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none ${onCommit ? "focus:border-ring" : "cursor-default"}`}
        />
        {unit && <span className="data-mono shrink-0 text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
}

export function Inspector() {
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const model = useAppStore((s) => s.model);
  const baseline = useAppStore((s) => s.operationHistory[0]?.model ?? s.model);
  const applyDesignOperation = useAppStore((s) => s.applyDesignOperation);
  const [entity, setEntity] = useState<EntityProperties | null>(null);
  const before = calculateQuantities(baseline);
  const after = calculateQuantities(model);
  const impact = [
    { item: "Floor area", before: `${before.floorArea.toFixed(1)} m²`, after: `${after.floorArea.toFixed(1)} m²`, delta: `${after.floorArea - before.floorArea >= 0 ? "+" : ""}${(after.floorArea - before.floorArea).toFixed(1)} m²` },
    { item: "Wall length", before: `${before.wallLength.toFixed(1)} m`, after: `${after.wallLength.toFixed(1)} m`, delta: `${after.wallLength - before.wallLength >= 0 ? "+" : ""}${(after.wallLength - before.wallLength).toFixed(1)} m` },
    { item: "Windows", before: String(before.windows), after: String(after.windows), delta: `${after.windows - before.windows > 0 ? "+" : ""}${after.windows - before.windows}` },
    { item: "Doors", before: String(before.doors), after: String(after.doors), delta: `${after.doors - before.doors > 0 ? "+" : ""}${after.doors - before.doors}` },
  ];

  const commitField = (field: "width" | "length" | "material", raw: string) => {
    if (!selectedEntityId) return;
    try {
      if (field === "material") {
        applyDesignOperation({ type: "change_material", entityId: selectedEntityId, material: raw });
      } else {
        const value = Number(raw);
        const room = model.rooms[selectedEntityId];
        if (!room) return;
        if (!Number.isFinite(value)) throw new Error("Enter a valid numeric dimension.");
        applyDesignOperation({ type: "resize_room", roomId: selectedEntityId, width: field === "width" ? value : room.width, length: field === "length" ? value : room.length });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this model property.");
      void getEntity(selectedEntityId).then(setEntity);
    }
  };

  useEffect(() => {
    if (selectedEntityId) getEntity(selectedEntityId).then(setEntity);
    else setEntity(null);
  }, [selectedEntityId, model.version]);

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-card">
      <div className="panel-header">Inspector</div>
      <div className="border-b border-border p-3.5">
        {entity ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">{entity.label}</p>
              <p className="data-mono mt-0.5 text-muted-foreground">
                {entity.id} · {entity.type}
              </p>
            </div>
            <div className="space-y-2.5">
              {entity.dimensions.width !== undefined && <Field label="Width" value={String(entity.dimensions.width)} unit="m" onCommit={entity.type === "room" ? (value) => commitField("width", value) : undefined} />}
              {entity.dimensions.length !== undefined && <Field label="Length" value={String(entity.dimensions.length)} unit="m" onCommit={entity.type === "room" ? (value) => commitField("length", value) : undefined} />}
              {entity.dimensions.height !== undefined && <Field label="Height" value={String(entity.dimensions.height)} unit="m" />}
              {entity.dimensions.area !== undefined && <Field label="Area" value={String(entity.dimensions.area)} unit="m²" />}
              <Field label="Material" value={entity.material} onCommit={entity.type === "room" || entity.type === "wall" || entity.type === "opening" ? (value) => commitField("material", value) : undefined} />
            </div>
          </div>
        ) : (
          <p className="data-mono text-muted-foreground">Select an entity in the project tree.</p>
        )}
      </div>

      <div className="panel-header">Change impact</div>
      <div className="p-1.5">
        <ImpactTable rows={impact} />
      </div>
    </aside>
  );
}
