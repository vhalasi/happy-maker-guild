import { Check, X } from "lucide-react";
import { useAppStore, type ProposalOption } from "@/state/appStore";
import { acceptProposal, rejectProposal } from "@/integration/stubs";
import { ImpactTable } from "./ImpactTable";
import { toast } from "sonner";

function OptionCard({ option, single }: { option: ProposalOption; single: boolean }) {
  const { setProposal, bumpVersion, addChatMessage } = useAppStore();

  const accept = async () => {
    const r = await acceptProposal(option.id);
    if (r.ok) {
      bumpVersion();
      setProposal(null);
      addChatMessage({ role: "assistant", text: `Accepted "${option.label}" — model is now at the next version.` });
      toast.success("Proposal accepted");
    }
  };

  const reject = async () => {
    await rejectProposal(option.id);
    setProposal(null);
    addChatMessage({ role: "assistant", text: `Rejected "${option.label}". No changes applied.` });
    toast.info("Proposal rejected");
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-md border border-border bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">{single ? "Proposed change" : option.label}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{option.explanation}</p>
      <div className="mt-3 flex-1 overflow-x-auto">
        <ImpactTable rows={option.impact} compact={!single} />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={accept}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-blueprint px-3 py-2 text-xs font-semibold text-blueprint-foreground transition-opacity hover:opacity-90"
        >
          <Check className="h-3.5 w-3.5" /> Accept
        </button>
        <button
          onClick={reject}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </div>
  );
}

export function ProposalDialog() {
  const { pendingProposal, setProposal } = useAppStore();
  if (!pendingProposal) return null;

  const single = pendingProposal.options.length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm" onClick={() => setProposal(null)}>
      <div
        className={`mx-4 flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-2xl ${single ? "max-w-lg" : "max-w-3xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="data-mono uppercase tracking-wider text-blueprint">AI proposal</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{pendingProposal.title}</h2>
        <div className={`mt-4 flex gap-4 ${single ? "flex-col" : "flex-col md:flex-row"}`}>
          {pendingProposal.options.map((o) => (
            <OptionCard key={o.id} option={o} single={single} />
          ))}
        </div>
      </div>
    </div>
  );
}
