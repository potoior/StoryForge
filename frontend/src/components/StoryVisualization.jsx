import { useState, useRef, useEffect, useCallback } from 'react';

const COLORS = [
  '#6c5ce7', '#00cec9', '#e17055', '#00b894',
  '#fd79a8', '#fdcb6e', '#74b9ff', '#a29bfe',
];

function forceLayout(nodes, edges, width, height, iterations = 200) {
  const ns = nodes.map((n, i) => ({
    ...n,
    x: width / 2 + (Math.cos(i * 2 * Math.PI / nodes.length) * Math.min(width, height) * 0.3),
    y: height / 2 + (Math.sin(i * 2 * Math.PI / nodes.length) * Math.min(width, height) * 0.3),
    vx: 0,
    vy: 0,
  }));

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations;

    // Repulsion
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        let dx = ns[i].x - ns[j].x;
        let dy = ns[i].y - ns[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = 5000 / (dist * dist);
        ns[i].vx += (dx / dist) * force * temp;
        ns[i].vy += (dy / dist) * force * temp;
        ns[j].vx -= (dx / dist) * force * temp;
        ns[j].vy -= (dy / dist) * force * temp;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = ns.find((n) => n.name === edge.from);
      const b = ns.find((n) => n.name === edge.to);
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = (dist - 120) * 0.05 * temp;
      a.vx += (dx / dist) * force;
      a.vy += (dy / dist) * force;
      b.vx -= (dx / dist) * force;
      b.vy -= (dy / dist) * force;
    }

    // Center gravity + apply velocity + damping
    for (const n of ns) {
      n.vx += (width / 2 - n.x) * 0.001 * temp;
      n.vy += (height / 2 - n.y) * 0.001 * temp;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
      // Bounds
      const pad = 50;
      n.x = Math.max(pad, Math.min(width - pad, n.x));
      n.y = Math.max(pad, Math.min(height - pad, n.y));
    }
  }
  return ns;
}

function RelationshipGraph({ story }) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  const memory = story?.memory;
  const characters = story?.characters || [];
  const relationships = memory?.relationships || [];
  const charStates = memory?.character_states || {};

  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (container) {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (characters.length === 0) return;

    const nodes = characters.map((c) => ({ name: c.name }));
    const edges = relationships.map((r) => ({
      from: r.character_a,
      to: r.character_b,
      label: r.relation,
    }));

    // Add implicit edges for characters without explicit relationships
    const connectedNames = new Set();
    edges.forEach((e) => { connectedNames.add(e.from); connectedNames.add(e.to); });
    const unconnected = nodes.filter((n) => !connectedNames.has(n.name));
    if (nodes.length > 1 && unconnected.length > 0) {
      const hub = nodes[0];
      unconnected.forEach((n) => {
        if (n.name !== hub.name) {
          edges.push({ from: hub.name, to: n.name, label: '' });
        }
      });
    }

    const result = forceLayout(nodes, edges, dimensions.width, dimensions.height);
    setPositions(result);
  }, [characters, relationships, dimensions]);

  if (characters.length === 0) {
    return <div className="viz-empty">暂无角色数据</div>;
  }

  return (
    <div className="viz-graph-container">
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--text-muted)" opacity="0.5" />
          </marker>
        </defs>

        {/* Edges */}
        {positions.length > 0 && relationships.map((r, i) => {
          const a = positions.find((n) => n.name === r.character_a);
          const b = positions.find((n) => n.name === r.character_b);
          if (!a || !b) return null;
          const isHovered = hoveredNode === r.character_a || hoveredNode === r.character_b;
          return (
            <g key={i}>
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isHovered ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={isHovered ? 2 : 1}
                markerEnd="url(#arrowhead)"
              />
              {r.relation && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 8}
                  textAnchor="middle"
                  fill={isHovered ? 'var(--accent)' : 'var(--text-muted)'}
                  fontSize="11"
                  fontWeight={isHovered ? '600' : '400'}
                >
                  {r.relation}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {positions.map((node, i) => {
          const isHovered = hoveredNode === node.name;
          const color = COLORS[i % COLORS.length];
          const state = charStates[node.name];
          return (
            <g
              key={node.name}
              onMouseEnter={() => setHoveredNode(node.name)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Glow */}
              {isHovered && (
                <circle cx={node.x} cy={node.y} r={32} fill={color} opacity={0.15} />
              )}
              {/* Circle */}
              <circle
                cx={node.x} cy={node.y} r={24}
                fill={isHovered ? color : 'var(--surface)'}
                stroke={color}
                strokeWidth={2}
              />
              {/* Initials */}
              <text
                x={node.x} y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? 'white' : color}
                fontSize="14"
                fontWeight="600"
              >
                {node.name.slice(0, 2)}
              </text>
              {/* Name */}
              <text
                x={node.x} y={node.y + 38}
                textAnchor="middle"
                fill="var(--text)"
                fontSize="12"
                fontWeight="500"
              >
                {node.name}
              </text>
              {/* State (on hover) */}
              {isHovered && state && (
                <text
                  x={node.x} y={node.y + 54}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="10"
                >
                  {state.length > 30 ? state.slice(0, 30) + '...' : state}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PlotTimeline({ story }) {
  const chapters = story?.chapters || [];
  const memory = story?.memory;
  const keyEvents = memory?.key_events || [];
  const unresolved = memory?.unresolved_plots || [];
  const charStates = memory?.character_states || {};

  // Distribute events across chapters (heuristic: spread evenly)
  const eventsPerChapter = Math.ceil(keyEvents.length / Math.max(chapters.length, 1));

  return (
    <div className="viz-timeline">
      {/* Character states summary */}
      {Object.keys(charStates).length > 0 && (
        <div className="timeline-section">
          <div className="timeline-section-title">当前角色状态</div>
          <div className="timeline-chars">
            {Object.entries(charStates).map(([name, state]) => (
              <div key={name} className="timeline-char-item">
                <span className="timeline-char-name">{name}</span>
                <span className="timeline-char-state">{state}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapter timeline */}
      <div className="timeline-chapters">
        {chapters.map((ch, i) => {
          const start = i * eventsPerChapter;
          const chapterEvents = keyEvents.slice(start, start + eventsPerChapter);
          return (
            <div key={ch.id} className="timeline-chapter">
              <div className="timeline-dot" />
              <div className="timeline-line" />
              <div className="timeline-content">
                <div className="timeline-ch-title">
                  第 {ch.chapter_number} 章：{ch.title}
                </div>
                {ch.summary && (
                  <div className="timeline-ch-summary">{ch.summary}</div>
                )}
                {chapterEvents.length > 0 && (
                  <div className="timeline-events">
                    {chapterEvents.map((e, j) => (
                      <div key={j} className="timeline-event">
                        <span className="timeline-event-dot" />
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unresolved plots */}
      {unresolved.length > 0 && (
        <div className="timeline-section">
          <div className="timeline-section-title unresolved">未解伏笔</div>
          <div className="timeline-plots">
            {unresolved.map((p, i) => (
              <div key={i} className="timeline-plot-item">
                <span className="timeline-plot-icon">?</span>
                {p}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoryVisualization({ story }) {
  const [tab, setTab] = useState('graph');

  if (!story) return null;

  return (
    <div className="viz-panel">
      <div className="viz-tabs">
        <button
          className={`viz-tab ${tab === 'graph' ? 'active' : ''}`}
          onClick={() => setTab('graph')}
        >
          关系图谱
        </button>
        <button
          className={`viz-tab ${tab === 'timeline' ? 'active' : ''}`}
          onClick={() => setTab('timeline')}
        >
          剧情时间线
        </button>
      </div>
      <div className="viz-content">
        {tab === 'graph' ? (
          <RelationshipGraph story={story} />
        ) : (
          <PlotTimeline story={story} />
        )}
      </div>
    </div>
  );
}
