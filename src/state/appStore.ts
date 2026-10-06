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

  selectEntity: (id: string | null) => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  toggleChat: () => void;
  setProposal: (p: Proposal | null) => void;
  setJobs: (jobs: Job[]) => void;
  updateJob: (id: string, status: JobStatus) => void;
  bumpVersion: () => void;
  setHistory: (canUndo: boolean, canRedo: boolean) => void;
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
  pendingProposal: {
    id: "prop-001",
    title: "Add skylight above kitchen",
    options: [
      {
        id: "prop-001-a",
        label: "Option A — Fixed skylight 120×120",
        explanation:
          "A fixed 120×120 cm skylight centred over the kitchen island. Maximises daylight, no ventilation.",
        impact: [
          { item: "Floor area", before: "148.0 m²", after: "148.0 m²", delta: "±0.0" },
          { item: "Wall length", before: "96.4 m", after: "96.4 m", delta: "±0.0" },
          { item: "Cable", before: "412 m", after: "418 m", delta: "+6" },
          { item: "Pipe", before: "88 m", after: "88 m", delta: "±0" },
          { item: "Est. cost", before: "486'000 CHF", after: "490'200 CHF", delta: "+4'200" },
        ],
      },
      {
        id: "prop-001-b",
        label: "Option B — Venting skylight 100×150",
        explanation:
          "A venting 100×150 cm skylight near the hob. Adds passive ventilation, slightly higher cost.",
        impact: [
          { item: "Floor area", before: "148.0 m²", after: "148.0 m²", delta: "±0.0" },
          { item: "Wall length", before: "96.4 m", after: "96.4 m", delta: "±0.0" },
          { item: "Cable", before: "412 m", after: "424 m", delta: "+12" },
          { item: "Pipe", before: "88 m", after: "88 m", delta: "±0" },
          { item: "Est. cost", before: "486'000 CHF", after: "492'800 CHF", delta: "+6'800" },
        ],
      },
    ],
  },
  jobs: [
    { id: "job-1", label: "Detailed model", status: "running" },
    { id: "job-2", label: "Cost estimate v12", status: "done" },
    { id: "job-3", label: "Daylight analysis", status: "queued" },
  ],
  canUndo: true,
  canRedo: false,

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
}));
