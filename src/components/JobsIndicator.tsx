import { useAppStore, type JobStatus } from "@/state/appStore";
import { Loader2 } from "lucide-react";

const CHIP: Record<JobStatus, string> = {
  running: "border-blueprint/40 bg-blueprint/10 text-blueprint",
  queued: "border-border bg-muted text-muted-foreground",
  done: "border-success/40 bg-success/10 text-success",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function JobsIndicator() {
  const jobs = useAppStore((s) => s.jobs);
  if (jobs.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-10 w-56 space-y-1.5">
      {jobs.map((j) => (
        <div
          key={j.id}
          className="pointer-events-auto flex items-center justify-between gap-2 rounded-sm border border-border bg-card/90 px-2.5 py-1.5 backdrop-blur-sm"
        >
          <span className="flex items-center gap-1.5 truncate text-xs text-foreground">
            {j.status === "running" && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-blueprint" />}
            {j.label}
          </span>
          <span className={`data-mono shrink-0 rounded-sm border px-1.5 py-0.5 uppercase ${CHIP[j.status]}`}>
            {j.status}
          </span>
        </div>
      ))}
    </div>
  );
}
