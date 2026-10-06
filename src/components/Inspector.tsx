import { useEffect, useState } from "react";
import { getEntity, type EntityProperties } from "@/integration/stubs";
import { useAppStore } from "@/state/appStore";
import { ImpactTable } from "./ImpactTable";

const MOCK_IMPACT = [
  { item: "Floor area", before: "148.0 m²", after: "152.4 m²", delta: "+4.4" },
  { item: "Wall length", before: "96.4 m", after: "99.1 m", delta: "+2.7" },
  { item: "Cable", before: "412 m", after: "419 m", delta: "+7" },
  { item: "Pipe", before: "88 m", after: "88 m", delta: "±0" },
  { item: "Est. cost", before: "486'000 CHF", after: "494'500 CHF", delta: "+8'500" },
];

function Field({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <label className="block">
      <span className="data-mono mb-1 block uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          defaultValue={value}
          className="w-full rounded-sm border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
        />
        {unit && <span className="data-mono shrink-0 text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
}

export function Inspector() {
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const [entity, setEntity] = useState<EntityProperties | null>(null);

  useEffect(() => {
    if (selectedEntityId) getEntity(selectedEntityId).then(setEntity);
    else setEntity(null);
  }, [selectedEntityId]);

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
              {entity.dimensions.width !== undefined && <Field label="Width" value={String(entity.dimensions.width)} unit="m" />}
              {entity.dimensions.length !== undefined && <Field label="Length" value={String(entity.dimensions.length)} unit="m" />}
              {entity.dimensions.height !== undefined && <Field label="Height" value={String(entity.dimensions.height)} unit="m" />}
              {entity.dimensions.area !== undefined && <Field label="Area" value={String(entity.dimensions.area)} unit="m²" />}
              <Field label="Material" value={entity.material} />
            </div>
          </div>
        ) : (
          <p className="data-mono text-muted-foreground">Select an entity in the project tree.</p>
        )}
      </div>

      <div className="panel-header">Change impact</div>
      <div className="p-1.5">
        <ImpactTable rows={MOCK_IMPACT} />
      </div>
    </aside>
  );
}
