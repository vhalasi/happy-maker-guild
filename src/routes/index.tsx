import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { ProjectTree } from "@/components/ProjectTree";
import { Viewport } from "@/components/Viewport";
import { Inspector } from "@/components/Inspector";
import { CommandBar } from "@/components/CommandBar";
import { ProposalDialog } from "@/components/ProposalDialog";
import { JobsIndicator } from "@/components/JobsIndicator";
import { BriefDialog } from "@/components/BriefDialog";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vibe Architect — Design a house by talking to AI" },
      {
        name: "description",
        content:
          "Vibe Architect lets you design a house in 3D by talking to an AI and manipulating the model directly, with live change-impact analysis.",
      },
      { property: "og:title", content: "Vibe Architect — Design a house by talking to AI" },
      {
        property: "og:description",
        content:
          "Design a house in 3D through conversation and direct manipulation, with live change-impact analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ProjectTree />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <JobsIndicator />
          <Viewport />
        </div>
        <Inspector />
      </div>
      <CommandBar />
      <ProposalDialog />
      <BriefDialog />
    </div>
  );
}
