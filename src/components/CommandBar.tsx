import { useRef, useState } from "react";
import { Mic, MicOff, SendHorizonal, MessageSquare, ChevronDown } from "lucide-react";
import { useAppStore } from "@/state/appStore";
import { askAstra } from "@/integration/astra.functions";
import { toast } from "sonner";

export function CommandBar() {
  const { chatMessages, chatOpen, toggleChat, addChatMessage, selectedEntityId } = useAppStore();
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    addChatMessage({ role: "user", text });
    const state = useAppStore.getState();
    try {
      const result = await askAstra({
        data: {
          text,
          selectedEntityId,
          modelJson: JSON.stringify(state.model),
          recentContext: state.chatMessages.slice(-8).map((message) => `${message.role}: ${message.text}`).join("\n"),
        },
      });
      addChatMessage({ role: "assistant", text: result.reply });
      if (result.proposal) state.setProposal(result.proposal);
      if (result.blenderJob) {
        const latest = useAppStore.getState();
        const stale = latest.model.version !== result.blenderJob.modelVersion;
        state.setJobs([
          ...latest.jobs,
          { id: result.blenderJob.jobId, label: result.blenderJob.title, status: stale ? "failed" : result.blenderJob.status, modelVersion: result.blenderJob.modelVersion, details: stale ? `Generated from v${result.blenderJob.modelVersion}; current model is v${latest.model.version}. Generate again.` : result.blenderJob.generation_brief, ...(!stale && result.blenderJob.blenderPython ? { blenderPython: result.blenderJob.blenderPython } : {}) },
        ]);
        if (stale) toast.warning("The model changed while Astra was preparing this job. Generate again for the latest version.");
        else if (result.blenderJob.status === "needs-worker") toast.warning("Astra wrote the Blender script. Connect a Blender worker to render it.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Astra request failed.";
      addChatMessage({ role: "assistant", text: `I couldn't complete that request: ${message}` });
      toast.error("Astra request failed");
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }));
    }
  };

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.onresult = (e: any) => setInput((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  return (
    <div className="shrink-0 border-t border-border bg-card">
      <button
        onClick={toggleChat}
        className="flex w-full items-center gap-2 px-4 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquare className="h-3 w-3" />
        <span className="data-mono uppercase tracking-wider">Chat · {chatMessages.length}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${chatOpen ? "rotate-180" : ""}`} />
      </button>

      {chatOpen && (
        <div ref={scrollRef} className="max-h-44 space-y-2 overflow-y-auto px-4 pb-2">
          {chatMessages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-md px-3 py-1.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-blueprint text-blueprint-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-4 pb-3 pt-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Describe a change… e.g. “widen the living room to 6 m”"
          className="h-9 flex-1 rounded-sm border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
        />
        <button
          onClick={toggleMic}
          className={`flex h-9 w-9 items-center justify-center rounded-sm border transition-colors ${
            listening
              ? "border-destructive bg-destructive/20 text-destructive"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title="Voice input"
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={send}
          disabled={sending}
          className="flex h-9 w-9 items-center justify-center rounded-sm bg-blueprint text-blueprint-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          title="Send"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
