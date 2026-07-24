"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { drag, forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, pointer, select, zoom, zoomIdentity, type D3DragEvent, type D3ZoomEvent, type SimulationLinkDatum, type SimulationNodeDatum, type ZoomBehavior } from "d3";
import { cn } from "@/lib/cn";

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  size?: number;
  data?: unknown;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  strength?: number;
}

export interface KnowledgeGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  showLegend?: boolean;
  showLinkLabels?: boolean;
  centerNodeId?: string;
  className?: string;
}

export interface KnowledgeGraphHandle {
  exportAsSVG: () => void;
  exportAsPNG: () => void;
  resetZoom: () => void;
  reheat: () => void;
}

const INK = {
  canvas: "#0A0A0B",
  high: "#E4E4E7",
  mid: "#A1A1AA",
  low: "#52525B",
} as const;

const ACCENT = "#3B82F6";

interface NodeShape {
  fill: string | null;
  ring: string | null;
  dash: string | null;
}

const NODE_SHAPES: NodeShape[] = [
  { fill: INK.high, ring: null, dash: null },
  { fill: null, ring: INK.high, dash: null },
  { fill: INK.low, ring: INK.mid, dash: null },
  { fill: null, ring: INK.mid, dash: "2.5 3" },
  { fill: null, ring: INK.low, dash: null },
];

const ANCHOR_SHAPE: NodeShape = { fill: ACCENT, ring: ACCENT, dash: null };

const formatTypeLabel = (type: string): string =>
  type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

export const KnowledgeGraph = forwardRef<KnowledgeGraphHandle, KnowledgeGraphProps>(
  (
    {
      nodes,
      links,
      onNodeClick,
      onNodeHover,
      showLegend = true,
      showLinkLabels = true,
      centerNodeId,
      className = "",
    },
    ref,
  ) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);

    const [tooltip, setTooltip] = useState<{
      x: number;
      y: number;
      label: string;
      type: string;
      shape: NodeShape;
      visible: boolean;
    }>({ x: 0, y: 0, label: "", type: "", shape: NODE_SHAPES[0], visible: false });

    const shapeOf = useCallback(
      (type: string, isAnchorType: boolean): NodeShape => {
        if (isAnchorType) return ANCHOR_SHAPE;
        const types = [...new Set(nodes.map((n) => n.type))].sort();
        return NODE_SHAPES[types.indexOf(type) % NODE_SHAPES.length];
      },
      [nodes],
    );

    const anchorType = useMemo(
      () => nodes.find((n) => n.id === centerNodeId)?.type ?? null,
      [nodes, centerNodeId],
    );

    const legendItems = useMemo(() => {
      const types = [...new Set(nodes.map((n) => n.type))].sort();
      return types.map((type) => ({
        type: formatTypeLabel(type),
        shape: shapeOf(type, type === anchorType),
      }));
    }, [nodes, shapeOf, anchorType]);

    const resetZoom = useCallback(() => {
      if (svgRef.current && zoomRef.current) {
        select(svgRef.current)
          .transition()
          .duration(500)
          .call(zoomRef.current.transform, zoomIdentity);
      }
    }, []);

    const reheat = useCallback(() => {
      simulationRef.current?.alpha(0.85).restart();
    }, []);

    const exportAsSVG = useCallback(() => {
      if (!svgRef.current) return;

      const clonedSvg = svgRef.current.cloneNode(true) as SVGSVGElement;
      const graphGroup = clonedSvg.querySelector("g");

      if (graphGroup) {
        const originalGroup = svgRef.current.querySelector("g") as SVGGElement;
        if (originalGroup) {
          const bbox = originalGroup.getBBox();
          const padding = 50;
          clonedSvg.setAttribute(
            "viewBox",
            `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`,
          );
          clonedSvg.setAttribute("width", `${bbox.width + padding * 2}`);
          clonedSvg.setAttribute("height", `${bbox.height + padding * 2}`);
          graphGroup.removeAttribute("transform");
        }
      }

      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "knowledge-graph.svg";
      link.click();
      URL.revokeObjectURL(url);
    }, []);

    const exportAsPNG = useCallback(() => {
      if (!svgRef.current) return;

      const clonedSvg = svgRef.current.cloneNode(true) as SVGSVGElement;
      const graphGroup = clonedSvg.querySelector("g");
      let bbox = { x: 0, y: 0, width: 800, height: 600 };

      const originalGroup = svgRef.current.querySelector("g") as SVGGElement;
      if (originalGroup) {
        bbox = originalGroup.getBBox();
      }

      const padding = 100;
      const width = bbox.width + padding * 2;
      const height = bbox.height + padding * 2;

      clonedSvg.setAttribute(
        "viewBox",
        `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`,
      );
      clonedSvg.setAttribute("width", `${width}`);
      clonedSvg.setAttribute("height", `${height}`);
      if (graphGroup) graphGroup.removeAttribute("transform");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new window.Image();
      const scale = 2;

      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx?.scale(scale, scale);

      if (ctx) {
        ctx.fillStyle = INK.canvas;
        ctx.fillRect(0, 0, width, height);
      }

      img.onload = () => {
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "knowledge-graph.png";
            link.click();
            URL.revokeObjectURL(url);
          }
        }, "image/png");
      };

      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      img.src = URL.createObjectURL(blob);
    }, []);

    useImperativeHandle(ref, () => ({
      exportAsSVG,
      exportAsPNG,
      resetZoom,
      reheat,
    }));

    useEffect(() => {
      if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

      const container = containerRef.current;
      const svg = select(svgRef.current);
      svg.selectAll("*").remove();

      const width = container.clientWidth;
      const height = container.clientHeight;

      const nodeTypes = [...new Set(nodes.map((n) => n.type))].sort();
      const shapeMapping: Record<string, NodeShape> = {};
      nodeTypes.forEach((type, i) => {
        shapeMapping[type] = NODE_SHAPES[i % NODE_SHAPES.length];
      });

      const isAnchor = (d: GraphNode) => d.id === centerNodeId;
      const shapeFor = (d: GraphNode): NodeShape =>
        isAnchor(d) ? ANCHOR_SHAPE : shapeMapping[d.type] || NODE_SHAPES[0];

      const nodesCopy: GraphNode[] = nodes.map((n) => ({
        ...n,
        size: n.size || 12,
      }));
      const linksCopy: GraphLink[] = links.map((l) => ({ ...l }));

      const centerNode = centerNodeId
        ? nodesCopy.find((n) => n.id === centerNodeId)
        : null;
      if (centerNode) {
        centerNode.x = width / 2;
        centerNode.y = height / 2;
      }

      const neighbors = new Set<string>();
      const linkKey = (l: GraphLink) => {
        const s = typeof l.source === "string" ? l.source : l.source.id;
        const t = typeof l.target === "string" ? l.target : l.target.id;
        return [s, t] as const;
      };
      for (const l of linksCopy) {
        const [s, t] = linkKey(l);
        neighbors.add(`${s}|${t}`);
        neighbors.add(`${t}|${s}`);
      }
      const isNeighbor = (a: string, b: string) =>
        a === b || neighbors.has(`${a}|${b}`);
      const touches = (l: GraphLink, id: string) => {
        const [s, t] = linkKey(l);
        return s === id || t === id;
      };

      const simulation = forceSimulation<GraphNode>(nodesCopy)
        .force(
          "link",
          forceLink<GraphNode, GraphLink>(linksCopy)
            .id((d: GraphNode) => d.id)
            .distance(125)
            .strength((d: GraphLink) => d.strength || 0.8),
        )
        .force("charge", forceManyBody().strength(-520))
        .force("center", forceCenter(width / 2, height / 2))
        .force(
          "collision",
          forceCollide<GraphNode>().radius((d: GraphNode) => (d.size || 12) + 34),
        );
      simulationRef.current = simulation;

      const zoomBehavior = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
          g.attr("transform", event.transform.toString());
        });

      zoomRef.current = zoomBehavior;
      svg.call(zoomBehavior);

      const g = svg.append("g");

      const link = g
        .selectAll<SVGLineElement, GraphLink>(".link")
        .data(linksCopy)
        .join("line")
        .attr("class", "link")
        .attr("stroke", INK.low)
        .attr("stroke-opacity", 0)
        .attr("stroke-width", 1);

      link
        .transition()
        .delay((_d, i) => 380 + i * 22)
        .duration(360)
        .attr("stroke-opacity", 0.8);

      const linkLabel = showLinkLabels
        ? g
            .selectAll<SVGTextElement, GraphLink>(".link-label")
            .data(linksCopy.filter((l) => l.label))
            .join("text")
            .attr("class", "link-label")
            .attr("text-anchor", "middle")
            .attr("font-size", "8.5px")
            .attr("font-weight", "500")
            .attr("letter-spacing", "0.1em")
            .attr("fill", INK.mid)
            .attr("stroke", INK.canvas)
            .attr("stroke-width", 3)
            .attr("stroke-linejoin", "round")
            .style("paint-order", "stroke")
            .attr("pointer-events", "none")
            .attr("opacity", 0)
            .text((d: GraphLink) => (d.label || "").toUpperCase())
        : null;

      const nodeGroup = g
        .selectAll<SVGGElement, GraphNode>(".node-group")
        .data(nodesCopy)
        .join("g")
        .attr("class", "node-group")
        .style("cursor", "pointer")
        .call(
          drag<SVGGElement, GraphNode>()
            .on(
              "start",
              (event: D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
              },
            )
            .on(
              "drag",
              (event: D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) => {
                d.fx = event.x;
                d.fy = event.y;
              },
            )
            .on(
              "end",
              (event: D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
              },
            ),
        );

      nodeGroup
        .append("circle")
        .attr("class", "node-plate")
        .attr("r", 0)
        .attr("fill", INK.canvas);

      nodeGroup
        .append("circle")
        .attr("class", "node-body")
        .attr("r", 0)
        .attr("fill", (d: GraphNode) => shapeFor(d).fill ?? "none")
        .attr("stroke", (d: GraphNode) => shapeFor(d).ring ?? "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", (d: GraphNode) => shapeFor(d).dash ?? "none");

      nodeGroup
        .filter((d: GraphNode) => isAnchor(d))
        .append("circle")
        .attr("class", "node-orbit")
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", ACCENT)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.3);

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      nodeGroup
        .selectAll<SVGCircleElement, GraphNode>(".node-plate")
        .transition()
        .delay((_d, i) => 100 + i * 40)
        .duration(420)
        .ease(easeOutCubic)
        .attr("r", (d: GraphNode) => (d.size || 12) + 3);

      nodeGroup
        .selectAll<SVGCircleElement, GraphNode>(".node-body")
        .transition()
        .delay((_d, i) => 100 + i * 40)
        .duration(420)
        .ease(easeOutCubic)
        .attr("r", (d: GraphNode) => d.size || 12);

      nodeGroup
        .selectAll<SVGCircleElement, GraphNode>(".node-orbit")
        .transition()
        .delay(160)
        .duration(520)
        .ease(easeOutCubic)
        .attr("r", (d: GraphNode) => (d.size || 12) + 7);

      nodeGroup
        .append("text")
        .attr("class", "node-label")
        .attr("text-anchor", "middle")
        .attr("y", (d: GraphNode) => (d.size || 12) + 15)
        .attr("font-size", "10.5px")
        .attr("font-weight", "500")
        .attr("letter-spacing", "0.005em")
        .attr("fill", (d: GraphNode) => (isAnchor(d) ? INK.high : INK.mid))
        .attr("stroke", INK.canvas)
        .attr("stroke-width", 3.5)
        .attr("stroke-linejoin", "round")
        .style("paint-order", "stroke")
        .attr("pointer-events", "none")
        .attr("opacity", 0)
        .text((d: GraphNode) =>
          d.label.length > 16 ? `${d.label.substring(0, 15)}` : d.label,
        )
        .transition()
        .delay((_d, i) => 260 + i * 40)
        .duration(320)
        .attr("opacity", 1);

      nodeGroup
        .on("click", (_event: MouseEvent, d: GraphNode) => {
          onNodeClick?.(d);
        })
        .on("mouseover", (event: MouseEvent, d: GraphNode) => {
          const [x, y] = pointer(event, container);
          setTooltip({
            x: x + 14,
            y,
            label: d.label,
            type: formatTypeLabel(d.type),
            shape: shapeFor(d),
            visible: true,
          });
          onNodeHover?.(d);

          nodeGroup
            .transition()
            .duration(200)
            .attr("opacity", (n: GraphNode) => (isNeighbor(d.id, n.id) ? 1 : 0.18));

          nodeGroup
            .selectAll<SVGTextElement, GraphNode>(".node-label")
            .transition()
            .duration(200)
            .attr("fill", (n: GraphNode) =>
              isNeighbor(d.id, n.id) ? INK.high : INK.mid,
            );

          link
            .transition()
            .duration(200)
            .attr("stroke", (l: GraphLink) => (touches(l, d.id) ? ACCENT : INK.low))
            .attr("stroke-opacity", (l: GraphLink) => (touches(l, d.id) ? 0.85 : 0.08))
            .attr("stroke-width", (l: GraphLink) => (touches(l, d.id) ? 1.5 : 1));

          linkLabel
            ?.transition()
            .duration(200)
            .attr("opacity", (l: GraphLink) => (touches(l, d.id) ? 1 : 0));
        })
        .on("mouseout", () => {
          setTooltip((prev) => ({ ...prev, visible: false }));
          onNodeHover?.(null);

          nodeGroup.transition().duration(250).attr("opacity", 1);
          nodeGroup
            .selectAll<SVGTextElement, GraphNode>(".node-label")
            .transition()
            .duration(250)
            .attr("fill", (n: GraphNode) => (isAnchor(n) ? INK.high : INK.mid));
          link
            .transition()
            .duration(250)
            .attr("stroke", INK.low)
            .attr("stroke-opacity", 0.8)
            .attr("stroke-width", 1);
          linkLabel?.transition().duration(250).attr("opacity", 0);
        });

      simulation.on("tick", () => {
        link
          .attr("x1", (d: GraphLink) => (d.source as GraphNode).x ?? 0)
          .attr("y1", (d: GraphLink) => (d.source as GraphNode).y ?? 0)
          .attr("x2", (d: GraphLink) => (d.target as GraphNode).x ?? 0)
          .attr("y2", (d: GraphLink) => (d.target as GraphNode).y ?? 0);

        if (linkLabel) {
          linkLabel
            .attr(
              "x",
              (d: GraphLink) =>
                (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2,
            )
            .attr(
              "y",
              (d: GraphLink) =>
                (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2 - 4,
            );
        }

        nodeGroup.attr(
          "transform",
          (d: GraphNode) => `translate(${d.x ?? 0},${d.y ?? 0})`,
        );
      });

      return () => {
        simulation.stop();
        simulationRef.current = null;
      };
    }, [nodes, links, onNodeClick, onNodeHover, showLinkLabels, centerNodeId]);

    return (
      <div className={cn("relative h-full min-h-[400px] w-full", className)}>
        <div
          ref={containerRef}
          className="relative h-full w-full"
          style={{ backgroundColor: INK.canvas }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)",
              backgroundSize: "26px 26px",
              maskImage:
                "radial-gradient(ellipse 75% 75% at 50% 50%, #000 30%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 75% 75% at 50% 50%, #000 30%, transparent 100%)",
            }}
          />
          <svg ref={svgRef} width="100%" height="100%" className="relative" />
        </div>

        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-10 flex items-center gap-2.5 rounded-md border border-zinc-800 bg-zinc-950/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm transition-opacity duration-150",
            tooltip.visible ? "opacity-100" : "opacity-0",
          )}
          style={{ left: tooltip.x, top: tooltip.y, transform: "translateY(-50%)" }}
        >
          <NodeGlyph shape={tooltip.shape} />
          <span className="text-[13px] font-medium text-zinc-100">{tooltip.label}</span>
          <span className="text-[12.5px] font-medium tracking-wider text-zinc-500 uppercase">
            {tooltip.type}
          </span>
        </div>

        {showLegend && legendItems.length > 0 && (
          <div className="absolute top-3 right-3 z-10 rounded-lg border border-zinc-800/80 bg-zinc-950/70 px-2.5 py-2 backdrop-blur-sm">
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {legendItems.map((item) => (
                <div key={item.type} className="flex items-center gap-2">
                  <NodeGlyph shape={item.shape} />
                  <span className="text-[13px] font-medium text-zinc-400">{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);

KnowledgeGraph.displayName = "KnowledgeGraph";

function NodeGlyph({ shape }: { shape: NodeShape }) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" className="shrink-0">
      <circle
        cx="5.5"
        cy="5.5"
        r="4"
        fill={shape.fill ?? "none"}
        stroke={shape.ring ?? "none"}
        strokeWidth="1.3"
        strokeDasharray={shape.dash ?? undefined}
      />
    </svg>
  );
}
