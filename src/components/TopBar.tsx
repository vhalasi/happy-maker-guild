import { useEffect, useRef, useState } from "react";
import { Redo2, Undo2, Box, Sparkles, Plus } from "lucide-react";
import { useAppStore } from "@/state/appStore";
import { enterXR } from "@/integration/stubs";
import { generateAstraBlenderBrief, getBlenderJobStatus } from "@/integration/astra.functions";
import { toast } from "sonner";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function watchBlenderJob(jobId: string, sourceVersion: number) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await wait(3000);
    try {
      const result = await getBlenderJobStatus({ data: { jobId } });
      const state = useAppStore.getState();
      if (state.model.version !== sourceVersion || result.modelVersion !== undefined && result.modelVersion !== sourceVersion) {
        state.patchJob(jobId, { status: "failed", details: `Result was created for v${sourceVersion}; current model is v${state.model.version}. Generate a fresh Blender version.` });
        return;
      }
      state.patchJob(jobId, { status: result.status, ...(result.artifactUrl ? { artifactUrl: result.artifactUrl } : {}), ...(result.message ? { details: result.message } : {}) });
      if (result.status === "done") {
        if (result.artifactUrl) toast.success("High-detail Blender model is ready");
        else state.patchJob(jobId, { status: "failed", details: "The Blender job finished without returning a GLB asset URL." });
        return;
      }
      if (result.status === "failed") {
        toast.error(result.message ?? "Blender generation failed");
        return;
      }
    } catch (error) {
      useAppStore.getState().patchJob(jobId, { status: "failed", details: error instanceof Error ? error.message : "Blender status check failed." });
      return;
    }
  }
  useAppStore.getState().patchJob(jobId, { status: "failed", details: "Blender job status timed out. The worker may still be processing it." });
}

export function TopBar() {
  const { projectName, version, canUndo, canRedo, undoModel, redoModel, setBriefOpen } =
    useAppStore();
  const jobs = useAppStore((s) => s.jobs);
  const startedPolls = useRef(new Set<string>());
  const [preparingDetailedModel, setPreparingDetailedModel] = useState(false);

  useEffect(() => {
    for (const job of jobs) {
      if ((job.status === "queued" || job.status === "running") && job.modelVersion !== undefined && !startedPolls.current.has(job.id)) {
        startedPolls.current.add(job.id);
        void watchBlenderJob(job.id, job.modelVersion);
      }
    }
  }, [jobs]);

  const handleUndo = async () => {
    if (!useAppStore.getState().canUndo) return;
    undoModel();
    toast.success(`Undone — now at v${useAppStore.getState().model.version}`);
  };

  const handleRedo = async () => {
    if (!useAppStore.getState().canRedo) return;
    redoModel();
    toast.success(`Redone — now at v${useAppStore.getState().model.version}`);
  };

  const handleDetailedModel = async () => {
    if (preparingDetailedModel) return;
    setPreparingDetailedModel(true);
    const snapshot = useAppStore.getState();
    const model = snapshot.model;
    const projectContext = snapshot.chatMessages.slice(0, 1).concat(snapshot.chatMessages.slice(-12)).map((message) => `${message.role}: ${message.text}`).join("\n");
    try {
      const job = await generateAstraBlenderBrief({ data: { modelJson: JSON.stringify(model), projectContext } });
      const current = useAppStore.getState();
      const changed = current.model.version !== job.modelVersion;
      const status = changed ? "failed" : job.status;
      const detail = changed
        ? `Generated from v${job.modelVersion}; the current model is v${current.model.version}. Regenerate before applying.`
        : job.generation_brief;
      current.setJobs([
        ...current.jobs.filter((item) => item.label !== "Detailed model"),
        { id: job.jobId, label: job.title, status, modelVersion: job.modelVersion, details: detail, ...(!changed && job.blenderPython ? { blenderPython: job.blenderPython } : {}) },
      ]);
      if (changed) toast.warning("The model changed while Astra was preparing the job. Generate again for the latest version.");
      else if (job.status === "needs-worker") toast.warning("Astra authored the Blender script. Add BLENDER_WORKER_URL to render it.");
      else if (job.status === "queued") {
        toast.info("Astra sent the detailed model job to the Blender worker.");
        if (!startedPolls.current.has(job.jobId)) {
          startedPolls.current.add(job.jobId);
          void watchBlenderJob(job.jobId, job.modelVersion);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare the Blender job.");
    } finally {
      setPreparingDetailedModel(false);
    }
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
          disabled={preparingDetailedModel}
          className="flex items-center gap-1.5 rounded-sm bg-blueprint px-3 py-1.5 text-xs font-semibold text-blueprint-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {preparingDetailedModel ? "Astra is designing…" : "Generate detailed model"}
        </button>
      </div>
    </header>
  );
}
