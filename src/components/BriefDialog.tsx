import { useState } from "react";
import { Sparkles, ArrowRight, Home, ImagePlus, X } from "lucide-react";
import { useAppStore } from "@/state/appStore";
import { startAstraProject } from "@/integration/astra.functions";
import { toast } from "sonner";

async function compressReferenceImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name} is larger than 15 MB.`);
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process the reference image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not encode the reference image.")), "image/jpeg", 0.82));
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the reference image."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read the reference image."));
    reader.readAsDataURL(blob);
  });
}

const EXAMPLES = [
  "A 3-bedroom family house with a big kitchen and a home office",
  "A compact lakeside cabin with a sauna and a roof terrace",
  "Two-storey house with a garage, a skylight above the kitchen and a south-facing patio",
];

export function BriefDialog() {
  const { briefOpen, setBriefOpen, startProject } = useAppStore();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [references, setReferences] = useState<Array<{ name: string; dataUrl: string }>>([]);

  if (!briefOpen) return null;

  const submit = async (brief: string) => {
    const value = brief.trim();
    if (!value || sending || processingImages) return;
    setSending(true);
    try {
      const concept = await startAstraProject({ data: { brief: value, imageDataUrls: references.map((image) => image.dataUrl) } });
      startProject(value, concept.designNotes, concept.model, concept.projectName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Astra could not start this project.");
    } finally {
      setSending(false);
    }
  };

  const addReferences = async (files: FileList | null) => {
    if (!files?.length) return;
    if (references.length + files.length > 4) {
      toast.error("Add up to four reference images.");
      return;
    }
    setProcessingImages(true);
    try {
      const added = await Promise.all(Array.from(files).map(async (file) => ({ name: file.name, dataUrl: await compressReferenceImage(file) })));
      setReferences((current) => [...current, ...added]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load a reference image.");
    } finally {
      setProcessingImages(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-blueprint">
            <Home className="h-4 w-4 text-blueprint-foreground" />
          </div>
          <p className="data-mono uppercase tracking-wider text-blueprint">New project</p>
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
          Describe the house you want to build
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Rooms, style, size, special features — describe your idea and add sketches or floor plans. Astra drafts the first concept.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(text);
            }
          }}
          rows={4}
          autoFocus
          placeholder="e.g. A two-storey house for a family of four, open-plan living, a home office and a roof terrace…"
          className="mt-4 w-full resize-none rounded-md border border-input bg-background p-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ImagePlus className="h-3.5 w-3.5" />
            {processingImages ? "Processing…" : "Add sketches / floor plans"}
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={processingImages || references.length >= 4} onChange={(event) => { void addReferences(event.currentTarget.files); event.currentTarget.value = ""; }} />
          </label>
          {references.map((image, index) => (
            <span key={`${image.name}-${index}`} className="inline-flex max-w-48 items-center gap-1 rounded-sm bg-muted px-2 py-1 text-xs text-foreground">
              <span className="truncate">{image.name}</span>
              <button type="button" aria-label={`Remove ${image.name}`} onClick={() => setReferences((current) => current.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={() => submit(text)}
            disabled={!text.trim() || sending || processingImages}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-blueprint px-4 py-2.5 text-sm font-semibold text-blueprint-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            {sending ? "Interpreting your brief…" : "Design my house"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setBriefOpen(false)}
            disabled={sending}
            className="rounded-sm border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Explore demo project instead
          </button>
        </div>
      </div>
    </div>
  );
}
