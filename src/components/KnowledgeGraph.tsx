import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Brain } from 'lucide-react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: string;
  val: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

interface KnowledgeGraphProps {
  notes: any[];
}

export default function KnowledgeGraph({ notes }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || notes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Prepare data
    const nodes: Node[] = notes.map(n => ({
      id: n.id,
      title: n.title,
      type: n.type,
      val: 20
    }));

    const links: Link[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Connections based on keywords overlap and explicit connections
    notes.forEach(note => {
      // Explicit connections from indexing
      note.connections?.forEach((conn: string) => {
        // Find other notes that have this keyword
        notes.forEach(otherNote => {
          if (note.id !== otherNote.id && otherNote.keywords.includes(conn.toLowerCase())) {
            links.push({ source: note.id, target: otherNote.id });
          }
        });
      });

      // Semantic overlap based on shared keywords
      notes.forEach(otherNote => {
        if (note.id >= otherNote.id) return;
        const intersection = note.keywords.filter((k: string) => otherNote.keywords.includes(k));
        if (intersection.length >= 2) {
          links.push({ source: note.id, target: otherNote.id });
        }
      });
    });

    // Remove duplicates
    const uniqueLinks = Array.from(new Set(links.map(l => 
      [l.source, l.target].sort().join('-')
    ))).map(id => {
      const [s, t] = id.split('-');
      return { source: s, target: t };
    });

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
        .attr("x1", d => {
          const s = d.source as unknown as Node;
          return s.x!;
        })
        .attr("y1", d => {
          const s = d.source as unknown as Node;
          return s.y!;
        })
        .attr("x2", d => {
          const t = d.target as unknown as Node;
          return t.x!;
        })
        .attr("y2", d => {
          const t = d.target as unknown as Node;
          return t.y!;
        });

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
        <p className="text-sm text-md-on-surface-variant">Trascina per esplorare le connessioni</p>
      </div>
    </div>
  );
}
