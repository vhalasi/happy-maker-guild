import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyOperation, type DesignOperation } from "@/engine/operations";
import { initialModel, type ProjectModel } from "@/engine/model";
import { createDemoHouse } from "@/engine/demo-house";

export type EntityType = "site" | "building" | "level" | "room" | "wall" | "opening";

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
  operations: DesignOperation[];
}

export interface Proposal {
  id: string;
  title: string;
  options: ProposalOption[];
  baseVersion: number;
}

export type JobStatus = "running" | "queued" | "needs-worker" | "done" | "failed";

export interface Job {
  id: string;
  label: string;
  status: JobStatus;
  modelVersion?: number;
  details?: string;
  artifactUrl?: string;
  blenderPython?: string;
}

interface AppState {
  model: ProjectModel;
  operationHistory: Array<{ model: ProjectModel; label: string }>;
  redoHistory: Array<{ model: ProjectModel; label: string }>;
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
  patchJob: (id: string, update: Partial<Job>) => void;
  setBriefOpen: (open: boolean) => void;
  startProject: (brief: string, reply: string, model: ProjectModel, projectName: string) => void;
  applyDesignOperation: (operation: DesignOperation) => void;
  undoModel: () => void;
  redoModel: () => void;
}

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}`;

const nameFromBrief = (brief: string) => {
  const words = brief
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled House";
};

export const useAppStore = create<AppState>()(persist((set) => ({
  model: createDemoHouse(),
  operationHistory: [],
  redoHistory: [],
  projectName: "Villa Moreno",
  version: 12,
  selectedEntityId: "room-living",
  chatOpen: true,
  chatMessages: [
    {
      id: nextId(),
      role: "assistant",
      text: "Astra is ready. Select a room or wall, then describe the change or ask for a high-detail Blender pass.",
      timestamp: Date.now(),
    },
  ],
  pendingProposal: null,
  jobs: [],
  canUndo: false,
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
  patchJob: (id, update) => set((s) => ({ jobs: s.jobs.map((job) => (job.id === id ? { ...job, ...update } : job)) })),
  setBriefOpen: (open) => set({ briefOpen: open }),
  startProject: (brief, reply, model, projectName) =>
    set({
      projectName: projectName || nameFromBrief(brief),
      model,
      operationHistory: [],
      redoHistory: [],
      version: model.version,
      selectedEntityId: Object.keys(model.rooms)[0] ?? null,
      chatMessages: [
        { id: nextId(), role: "user", text: brief, timestamp: Date.now() - 5_000 },
        { id: nextId(), role: "assistant", text: reply, timestamp: Date.now() },
      ],
      pendingProposal: null,
      jobs: [],
      canUndo: false,
      canRedo: false,
      briefOpen: false,
    }),
  applyDesignOperation: (operation) => set((s) => {
    const result = applyOperation(s.model, operation);
    return {
      model: result.model,
      version: result.model.version,
      operationHistory: [...s.operationHistory, { model: s.model, label: result.label }],
      redoHistory: [],
      canUndo: true,
      canRedo: false,
    };
  }),
  undoModel: () => set((s) => {
    const previous = s.operationHistory.at(-1);
    if (!previous) return {};
    const model = { ...previous.model, version: s.model.version + 1 };
    return {
      model,
      version: model.version,
      operationHistory: s.operationHistory.slice(0, -1),
      redoHistory: [...s.redoHistory, { model: s.model, label: previous.label }],
      canUndo: s.operationHistory.length > 1,
      canRedo: true,
    };
  }),
  redoModel: () => set((s) => {
    const next = s.redoHistory.at(-1);
    if (!next) return {};
    const model = { ...next.model, version: s.model.version + 1 };
    return {
      model,
      version: model.version,
      operationHistory: [...s.operationHistory, { model: s.model, label: next.label }],
      redoHistory: s.redoHistory.slice(0, -1),
      canUndo: true,
      canRedo: s.redoHistory.length > 1,
    };
  }),
}), {
  name: "happy-maker-guild-project-v1",
  version: 1,
  migrate: (persisted) => {
    const state = persisted as Partial<AppState>;
    if (state.projectName === "Villa Moreno" && state.model?.rooms["room-living"]?.x === -1.2 && Object.keys(state.model.rooms).length === 4 && !state.operationHistory?.length) {
      return { ...state, model: createDemoHouse(), selectedEntityId: null };
    }
    return state;
  },
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    model: state.model,
    operationHistory: state.operationHistory,
    redoHistory: state.redoHistory,
    projectName: state.projectName,
    version: state.version,
    selectedEntityId: state.selectedEntityId,
    chatMessages: state.chatMessages,
    chatOpen: state.chatOpen,
    pendingProposal: state.pendingProposal,
    jobs: state.jobs.map(({ blenderPython: _script, ...job }) => job),
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    briefOpen: state.briefOpen,
  }),
}));
