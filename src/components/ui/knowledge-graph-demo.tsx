"use client";

import { useRef } from "react";
import { Restart as ArrowsCounterClockwise, FullScreen as CornersOut, Download as DownloadSimple } from "@solar-icons/react";

import {
  KnowledgeGraph,
  type GraphLink,
  type GraphNode,
  type KnowledgeGraphHandle,
} from "@/components/ui/knowledge-graph";

const sampleNodes: GraphNode[] = [
  { id: "user", label: "You", type: "user", size: 17 },
  { id: "react", label: "React", type: "technology", size: 13 },
  { id: "typescript", label: "TypeScript", type: "technology", size: 13 },
  { id: "nextjs", label: "Next.js", type: "technology", size: 11 },
  { id: "ai", label: "AI/ML", type: "interest", size: 13 },
  { id: "design", label: "UI Design", type: "interest", size: 12 },
  { id: "coffee", label: "Coffee", type: "preference", size: 9 },
  { id: "music", label: "Lo-fi Music", type: "preference", size: 9 },
  { id: "vercel", label: "Vercel", type: "company", size: 11 },
  { id: "openai", label: "OpenAI", type: "company", size: 11 },
  { id: "productivity", label: "Productivity", type: "interest", size: 12 },
];

const sampleLinks: GraphLink[] = [
  { source: "user", target: "react", label: "uses" },
  { source: "user", target: "typescript", label: "uses" },
  { source: "user", target: "ai", label: "interested in" },
  { source: "user", target: "design", label: "practices" },
  { source: "user", target: "coffee", label: "loves" },
  { source: "user", target: "music", label: "listens to" },
  { source: "user", target: "productivity" },
  { source: "react", target: "nextjs", label: "framework" },
  { source: "typescript", target: "nextjs" },
  { source: "nextjs", target: "vercel", label: "deploys to" },
  { source: "ai", target: "openai", label: "uses" },
  { source: "design", target: "react" },
];

export default function KnowledgeGraphDemo() {
  const graphRef = useRef<KnowledgeGraphHandle>(null);

  return (
    <div className="flex h-dvh w-full items-center justify-center p-6">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => graphRef.current?.reheat()}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-[background-color,transform] hover:bg-zinc-800 active:scale-[0.97] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <ArrowsCounterClockwise weight="Bold" size={14} />
            Reheat
          </button>
          <button
            type="button"
            onClick={() => graphRef.current?.resetZoom()}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-[background-color,transform] hover:bg-zinc-300 active:scale-[0.97] dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <CornersOut weight="Bold" size={14} />
            Reset Zoom
          </button>
          <button
            type="button"
            onClick={() => graphRef.current?.exportAsPNG()}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-[background-color,transform] hover:bg-zinc-300 active:scale-[0.97] dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <DownloadSimple weight="Bold" size={14} />
            Export PNG
          </button>
        </div>

        <div className="h-[clamp(320px,calc(100dvh-150px),500px)] w-full overflow-hidden rounded-2xl border border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <KnowledgeGraph
            ref={graphRef}
            nodes={sampleNodes}
            links={sampleLinks}
            centerNodeId="user"
            showLegend={true}
            showLinkLabels={true}
          />
        </div>

        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Hover to spotlight a neighborhood. Drag nodes to rearrange. Scroll to zoom.
        </p>
      </div>
    </div>
  );
}
