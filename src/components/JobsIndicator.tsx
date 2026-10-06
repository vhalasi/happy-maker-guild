import { useAppStore, type JobStatus } from "@/state/appStore";
import { Download, Loader2 } from "lucide-react";

const CHIP: Record<JobStatus, string> = {
  running: "border-blueprint/40 bg-blueprint/10 text-blueprint",
  queued: "border-border bg-muted text-muted-foreground",
  "needs-worker": "border-warning/40 bg-warning/10 text-warning",
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
          title={j.details}
          className="pointer-events-auto flex items-center justify-between gap-2 rounded-sm border border-border bg-card/90 px-2.5 py-1.5 backdrop-blur-sm"
        >
          <span className="flex items-center gap-1.5 truncate text-xs text-foreground">
            {j.status === "running" && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-blueprint" />}
            {j.label}
          </span>
          <span className={`data-mono shrink-0 rounded-sm border px-1.5 py-0.5 uppercase ${CHIP[j.status]}`}>
            {j.status}
          </span>
          {j.blenderPython && (
            <button
              type="button"
              title="Download Astra's Blender Python script"
              onClick={() => {
                const blob = new Blob([j.blenderPython ?? ""], { type: "text/x-python" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${j.id.replace(/[^a-z0-9_-]/gi, "-")}.py`;
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
              className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
