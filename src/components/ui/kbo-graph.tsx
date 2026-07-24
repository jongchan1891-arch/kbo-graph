"use client";

import { useMemo, useRef } from "react";
import { Restart as ArrowsCounterClockwise, FullScreen as CornersOut, Download as DownloadSimple } from "@solar-icons/react";

import {
  KnowledgeGraph,
  type GraphLink,
  type GraphNode,
  type KnowledgeGraphHandle,
} from "@/components/ui/knowledge-graph";
import kboGraph from "@/data/kbo-graph.json";

interface KBOGraphData {
  meta: { date: string; generated: string; centerNodeId: string };
  nodes: GraphNode[];
  links: GraphLink[];
}

const data = kboGraph as KBOGraphData;

export default function KBOGraph() {
  const graphRef = useRef<KnowledgeGraphHandle>(null);

  const nodes = useMemo(() => data.nodes, []);
  const links = useMemo(() => data.links, []);

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center bg-zinc-950 p-6"
      style={{ fontFamily: '"Noto Sans KR", ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              KBO 관계도 <span className="text-zinc-500">/ {data.meta.date}</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              리그 · 팀 순위 · 경기결과(승/패 · 투수) · 이적 시장을 하나의 지도로.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => graphRef.current?.reheat()}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-[background-color,transform] hover:bg-white active:scale-[0.97]"
            >
              <ArrowsCounterClockwise weight="Bold" size={14} />
              재정렬
            </button>
            <button
              type="button"
              onClick={() => graphRef.current?.resetZoom()}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-[background-color,transform] hover:bg-zinc-700 active:scale-[0.97]"
            >
              <CornersOut weight="Bold" size={14} />
              줌 리셋
            </button>
            <button
              type="button"
              onClick={() => graphRef.current?.exportAsPNG()}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-[background-color,transform] hover:bg-zinc-700 active:scale-[0.97]"
            >
              <DownloadSimple weight="Bold" size={14} />
              PNG 저장
            </button>
          </div>
        </div>

        <div className="h-[clamp(420px,calc(100dvh-190px),720px)] w-full overflow-hidden rounded-2xl border border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <KnowledgeGraph
            ref={graphRef}
            nodes={nodes}
            links={links}
            centerNodeId={data.meta.centerNodeId}
            showLegend={true}
            showLinkLabels={true}
          />
        </div>

        <p className="text-sm font-medium text-zinc-500">
          노드에 마우스를 올리면 이웃 관계가 강조됩니다. 드래그로 재배치, 스크롤로 확대/축소.
        </p>
      </div>
    </div>
  );
}

