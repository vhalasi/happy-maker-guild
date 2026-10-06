import { create } from "zustand";

export type EntityType = "site" | "level" | "room" | "wall" | "opening";

export interface TreeNode {
  id: string;
  type: EntityType;
  label: string;
  children?: TreeNode[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface ImpactRow {
  item: string;
  before: string;
  after: string;
  delta: string;
}

export interface ProposalOption {
  id: string;
  label: string;
  explanation: string;
  impact: ImpactRow[];
}

export interface Proposal {
  id: string;
  title: string;
  options: ProposalOption[];
}

export type JobStatus = "running" | "queued" | "done" | "failed";

export interface Job {
  id: string;
  label: string;
  status: JobStatus;
}

interface AppState {
  projectName: string;
  version: number;
  selectedEntityId: string | null;
  chatMessages: ChatMessage[];
  chatOpen: boolean;
  pendingProposal: Proposal | null;
  jobs: Job[];
  canUndo: boolean;
  canRedo: boolean;
  briefOpen: boolean;

  selectEntity: (id: string | null) => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  toggleChat: () => void;
  setProposal: (p: Proposal | null) => void;
  setJobs: (jobs: Job[]) => void;
  updateJob: (id: string, status: JobStatus) => void;
  bumpVersion: () => void;
  setHistory: (canUndo: boolean, canRedo: boolean) => void;
  setBriefOpen: (open: boolean) => void;
  startProject: (brief: string, reply: string) => void;
}

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}`;

export const useAppStore = create<AppState>((set) => ({
  projectName: "Villa Moreno",
  version: 12,
  selectedEntityId: "room-living",
  chatOpen: true,
  chatMessages: [
    {
      id: nextId(),
      role: "assistant",
      text: "Model loaded at v12. The living room on Level 1 is selected. Tell me what to change — e.g. \"widen the living room to 6 m\".",
      timestamp: Date.now() - 60_000,
    },
    {
      id: nextId(),
      role: "user",
      text: "Add a skylight above the kitchen.",
      timestamp: Date.now() - 45_000,
    },
    {
      id: nextId(),
      role: "assistant",
      text: "I drafted two options for the kitchen skylight. Review the proposal to compare their impact.",
      timestamp: Date.now() - 40_000,
    },
  ],
  pendingProposal: null,
  jobs: [
    { id: "job-1", label: "Detailed model", status: "running" },
    { id: "job-2", label: "Cost estimate v12", status: "done" },
    { id: "job-3", label: "Daylight analysis", status: "queued" },
  ],
  canUndo: true,
  canRedo: false,
  briefOpen: true,

  selectEntity: (id) => set({ selectedEntityId: id }),
  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, { ...msg, id: nextId(), timestamp: Date.now() }],
    })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setProposal: (p) => set({ pendingProposal: p }),
  setJobs: (jobs) => set({ jobs }),
  updateJob: (id, status) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, status } : j)) })),
  bumpVersion: () => set((s) => ({ version: s.version + 1 })),
  setHistory: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setBriefOpen: (open) => set({ briefOpen: open }),
  startProject: (brief, reply) =>
    set({
      projectName: nameFromBrief(brief),
      version: 1,
      selectedEntityId: null,
      chatMessages: [
        { id: nextId(), role: "user", text: brief, timestamp: Date.now() - 5_000 },
        { id: nextId(), role: "assistant", text: reply, timestamp: Date.now() },
      ],
      pendingProposal: null,
      jobs: [
        { id: "job-brief", label: "Interpreting brief", status: "done" },
        { id: "job-concept", label: "Concept model", status: "running" },
        { id: "job-cost", label: "Cost estimate v1", status: "queued" },
      ],
      canUndo: false,
      canRedo: false,
      briefOpen: false,
    }),
}));
