import { Redo2, Undo2, Box, Sparkles, Plus } from "lucide-react";
import { useAppStore } from "@/state/appStore";
import { undo, redo, requestDetailedModel, enterXR } from "@/integration/stubs";
import { toast } from "sonner";

export function TopBar() {
  const { projectName, version, canUndo, canRedo, bumpVersion, setHistory, setJobs, jobs, setBriefOpen } =
    useAppStore();

  const handleUndo = async () => {
    const r = await undo();
    if (r.ok) {
      setHistory(false, true);
      toast.success(`Undone — back to v${r.version}`);
    }
  };

  const handleRedo = async () => {
    const r = await redo();
    if (r.ok) {
      setHistory(true, false);
      toast.success(`Redone — v${r.version}`);
    }
  };

  const handleDetailedModel = async () => {
    const { jobId } = await requestDetailedModel();
    setJobs([...jobs.filter((j) => j.label !== "Detailed model"), { id: jobId, label: "Detailed model", status: "running" }]);
    toast.info("Detailed model job started");
  };

  const handleEnterXR = async () => {
    const r = await enterXR();
    if (!r.ok) toast.warning(r.reason ?? "VR not available");
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-blueprint">
          <Box className="h-3.5 w-3.5 text-blueprint-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold tracking-tight">{projectName}</span>
        <span className="data-mono rounded-sm border border-border px-1.5 py-0.5 text-blueprint">
          v{version}
        </span>
      </div>

      <div className="mx-2 h-5 w-px bg-border" />

      <div className="flex items-center gap-1">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setBriefOpen(true)}
          className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" />
          New idea
        </button>
        <button
          onClick={handleEnterXR}
          className="rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Enter VR
        </button>
        <button
          onClick={handleDetailedModel}
          className="flex items-center gap-1.5 rounded-sm bg-blueprint px-3 py-1.5 text-xs font-semibold text-blueprint-foreground transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate detailed model
        </button>
      </div>
    </header>
  );
}
