import { useState } from "react";
import { Sparkles, ArrowRight, Home } from "lucide-react";
import { useAppStore } from "@/state/appStore";
import { startBrief } from "@/integration/stubs";

const EXAMPLES = [
  "A 3-bedroom family house with a big kitchen and a home office",
  "A compact lakeside cabin with a sauna and a roof terrace",
  "Two-storey house with a garage, a skylight above the kitchen and a south-facing patio",
];

export function BriefDialog() {
  const { briefOpen, setBriefOpen, startProject, addChatMessage } = useAppStore();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!briefOpen) return null;

  const submit = async (brief: string) => {
    const value = brief.trim();
    if (!value || sending) return;
    setSending(true);
    addChatMessage({ role: "user", text: value });
    const { reply } = await startBrief(value);
    startProject(value, reply);
    setSending(false);
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
          Rooms, style, size, special features — put your idea in your own words. The AI drafts the
          first concept; you refine it by chat afterwards.
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
            disabled={!text.trim() || sending}
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
