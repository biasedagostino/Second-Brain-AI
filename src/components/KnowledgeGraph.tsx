import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Brain, X, Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: string;
  val: number;
  keywords: string[];
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  sharedKeywords?: string[];
}

interface KnowledgeGraphProps {
  notes: any[];
}

export default function KnowledgeGraph({ notes }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [connections, setConnections] = useState<{title: string, keywords: string[]}[]>([]);

  useEffect(() => {
    if (!svgRef.current || notes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Prepare data
    const nodes: Node[] = notes.map(n => ({
      id: n.id,
      title: n.title,
      type: n.type,
      val: 20,
      keywords: n.keywords || []
    }));

    const links: Link[] = [];

    // Connections based on keywords overlap and explicit connections
    notes.forEach(note => {
      // Explicit connections from indexing
      note.connections?.forEach((conn: string) => {
        notes.forEach(otherNote => {
          if (note.id !== otherNote.id && otherNote.keywords.includes(conn.toLowerCase())) {
            links.push({ source: note.id, target: otherNote.id, sharedKeywords: [conn.toLowerCase()] });
          }
        });
      });

      // Semantic overlap based on shared keywords
      notes.forEach(otherNote => {
        if (note.id >= otherNote.id) return;
        const intersection = note.keywords.filter((k: string) => otherNote.keywords.includes(k));
        if (intersection.length >= 2) {
          links.push({ source: note.id, target: otherNote.id, sharedKeywords: intersection });
        }
      });
    });

    // Remove duplicates and merge keywords
    const linkMap = new Map<string, Link>();
    links.forEach(l => {
      const id = [l.source, l.target].sort().join('-');
      if (linkMap.has(id)) {
        const existing = linkMap.get(id)!;
        existing.sharedKeywords = Array.from(new Set([...(existing.sharedKeywords || []), ...(l.sharedKeywords || [])]));
      } else {
        const [s, t] = id.split('-');
        linkMap.set(id, { source: s, target: t, sharedKeywords: l.sharedKeywords });
      }
    });
    const uniqueLinks = Array.from(linkMap.values());

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(uniqueLinks).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    const link = g.append("g")
      .attr("stroke", "var(--color-md-outline)")
      .attr("stroke-opacity", 0.3)
      .selectAll("line")
      .data(uniqueLinks)
      .join("line")
      .attr("stroke-width", 1);

    const node = g.append("g")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", 30)
      .attr("fill", "var(--color-md-surface-variant)")
      .attr("stroke", "var(--color-md-primary)")
      .attr("stroke-width", 2);

    node.append("text")
      .text(d => d.title.length > 15 ? d.title.substring(0, 12) + "..." : d.title)
      .attr("fill", "var(--color-md-on-surface)")
      .attr("font-size", "10px")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Interactive Highlights
    let activeSelectedNodeId: string | null = null;

    function resetHighlight() {
      activeSelectedNodeId = null;
      setSelectedNode(null);
      setConnections([]);
      link
        .attr("stroke", "var(--color-md-outline)")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", 1);

      node.selectAll("circle")
        .attr("stroke", "var(--color-md-primary)")
        .attr("stroke-width", 2)
        .attr("opacity", 1);

      node.selectAll("text")
        .attr("opacity", 1)
        .attr("font-weight", "normal");
    }

    function highlightNode(event: any, focusNode: Node) {
      event.stopPropagation();
      
      if (activeSelectedNodeId === focusNode.id) {
        resetHighlight();
        return;
      }

      activeSelectedNodeId = focusNode.id;
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(focusNode.id);
      
      const newConnections: {title: string, keywords: string[]}[] = [];

      // Find connections
      link.each((l: any) => {
        if (l.source.id === focusNode.id || l.target.id === focusNode.id) {
          const otherNode = l.source.id === focusNode.id ? l.target : l.source;
          connectedNodeIds.add(otherNode.id);
          newConnections.push({
            title: otherNode.title,
            keywords: l.sharedKeywords || []
          });
        }
      });

      setConnections(newConnections);
      setSelectedNode(focusNode);

      // Update Links
      link
        .attr("stroke", (l: any) => 
          (l.source.id === focusNode.id || l.target.id === focusNode.id) 
            ? "var(--color-md-primary)" 
            : "var(--color-md-outline)"
        )
        .attr("stroke-opacity", (l: any) => 
          (l.source.id === focusNode.id || l.target.id === focusNode.id) ? 1 : 0.05
        )
        .attr("stroke-width", (l: any) => 
          (l.source.id === focusNode.id || l.target.id === focusNode.id) ? 3 : 1
        );

      // Update Nodes
      node.selectAll("circle")
        .attr("stroke", (n: any) => 
          n.id === focusNode.id 
            ? "var(--color-md-primary)" 
            : (connectedNodeIds.has(n.id) ? "var(--color-md-primary)" : "var(--color-md-outline)")
        )
        .attr("stroke-width", (n: any) => 
          n.id === focusNode.id ? 5 : (connectedNodeIds.has(n.id) ? 3 : 1)
        )
        .attr("opacity", (n: any) => connectedNodeIds.has(n.id) ? 1 : 0.2);

      node.selectAll("text")
        .attr("opacity", (n: any) => connectedNodeIds.has(n.id) ? 1 : 0.2)
        .attr("font-weight", (n: any) => connectedNodeIds.has(n.id) ? "bold" : "normal");
    }

    node.on("click", highlightNode);
    svg.on("click", resetHighlight);

    return () => {
      simulation.stop();
    };
  }, [notes]);

  return (
    <div className="w-full h-full relative bg-md-surface overflow-hidden rounded-[32px] border border-md-outline/10">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="flex items-center gap-2 text-md-primary mb-1">
          <Brain className="w-6 h-6" />
          <h2 className="text-xl font-bold">Knowledge Graph</h2>
        </div>
        <p className="text-sm text-md-on-surface-variant">Esplora le connessioni semantiche tra i tuoi pensieri</p>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-6 right-6 bottom-6 w-80 bg-md-surface-variant/90 backdrop-blur-xl border border-md-outline/20 rounded-[32px] p-6 shadow-2xl flex flex-col z-10"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-md-primary uppercase tracking-widest mb-1">Nota Selezionata</p>
                <h3 className="text-lg font-bold leading-tight">{selectedNode.title}</h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedNode(null);
                  // Trigger a click on the svg to reset highlights if possible, 
                  // but here we just clear the UI state.
                  // For a full reset, we'd need to expose resetHighlight.
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 sm-scrollbar">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-md-primary">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Connessioni Semantiche</span>
                </div>
                
                {connections.length > 0 ? (
                  <div className="space-y-4">
                    {connections.map((conn, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <p className="text-xs font-bold leading-none">{conn.title}</p>
                        <div className="flex flex-wrap gap-1">
                          {conn.keywords.map(kw => (
                            <span key={kw} className="text-[9px] bg-md-primary/10 text-md-primary px-1.5 py-0.5 rounded-full border border-md-primary/20">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-md-on-surface-variant italic">Nessuna connessione diretta trovata.</p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-md-outline/10">
                <div className="flex items-center gap-2 text-md-on-surface-variant">
                  <Info className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Tag Note</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.keywords.map((kw: string) => (
                    <span key={kw} className="text-[9px] bg-md-surface/30 text-md-on-surface px-1.5 py-0.5 rounded-full border border-md-outline/10">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
