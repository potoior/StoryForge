import { useState, useCallback, useRef, useEffect } from 'react';

const API = '/api';

const COLORS = [
  '#6c5ce7', '#00cec9', '#e17055', '#00b894',
  '#fd79a8', '#fdcb6e', '#74b9ff', '#a29bfe',
];

function forceLayout(nodes, edges, width, height, iterations = 150) {
  const ns = nodes.map((n, i) => ({
    ...n,
    x: n.x ?? (width / 2 + Math.cos(i * 2 * Math.PI / nodes.length) * Math.min(width, height) * 0.3),
    y: n.y ?? (height / 2 + Math.sin(i * 2 * Math.PI / nodes.length) * Math.min(width, height) * 0.3),
    vx: 0,
    vy: 0,
  }));

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations;
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
    for (const edge of edges) {
      const a = ns.find((n) => n.name === edge.from);
      const b = ns.find((n) => n.name === edge.to);
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = (dist - 140) * 0.05 * temp;
      a.vx += (dx / dist) * force;
      a.vy += (dy / dist) * force;
      b.vx -= (dx / dist) * force;
      b.vy -= (dy / dist) * force;
    }
    for (const n of ns) {
      n.vx += (width / 2 - n.x) * 0.001 * temp;
      n.vy += (height / 2 - n.y) * 0.001 * temp;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
      const pad = 50;
      n.x = Math.max(pad, Math.min(width - pad, n.x));
      n.y = Math.max(pad, Math.min(height - pad, n.y));
    }
  }
  return ns;
}

export default function WorldBuilding({ story, onUpdate, addToast }) {
  const [world, setWorld] = useState(() => ({
    world_lore: story?.world?.world_lore || '',
    locations: story?.world?.locations || [],
    factions: story?.world?.factions || [],
    relationships: story?.world?.relationships || [],
    notes: story?.world?.notes || '',
  }));
  const [saving, setSaving] = useState(false);

  // Sync local world state when story changes
  useEffect(() => {
    if (!story) return;
    console.log('[WorldBuilding] Syncing from story:', {
      storyId: story.story_id,
      factions: story.world?.factions,
      relationships: story.world?.relationships,
    });
    isSyncing.current = true;
    setWorld({
      world_lore: story.world?.world_lore || '',
      locations: story.world?.locations || [],
      factions: story.world?.factions || [],
      relationships: story.world?.relationships || [],
      notes: story.world?.notes || '',
    });
    setTimeout(() => { isSyncing.current = false; }, 100);
  }, [story?.story_id, story?.world?.world_lore, story?.world?.locations, story?.world?.factions, story?.world?.relationships, story?.world?.notes]);

  // Auto-save world data when local state changes (debounced)
  const autoSaveTimer = useRef(null);
  const isSyncing = useRef(false);
  useEffect(() => {
    if (isSyncing.current) return; // skip auto-save during sync from parent
    if (!story) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/stories/${story.story_id}/world`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(world),
        });
        if (res.ok) {
          const data = await res.json();
          isSyncing.current = true;
          onUpdate(data);
          // Reset sync flag after state propagates
          setTimeout(() => { isSyncing.current = false; }, 100);
        }
      } catch {}
    }, 1000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [world]);

  // Graph state
  const svgRef = useRef(null);
  const [positions, setPositions] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 700, height: 500 });
  const [dragging, setDragging] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [editingRel, setEditingRel] = useState(null);

  // Double-click creation state
  const [createForm, setCreateForm] = useState(null); // { x, y, svgX, svgY }

  // Edit node state
  const [editForm, setEditForm] = useState(null); // { name, description, personality, type }

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, svgX, svgY, targetNode? }
  const contextMenuRef = useRef(null);

  const characters = story?.characters || [];
  const factions = world.factions || [];

  // All graph nodes: characters (type='character') + factions (type='faction')
  const allNodes = [
    ...characters.map((c) => ({ name: c.name, type: 'character' })),
    ...factions.filter((f) => f.name).map((f) => ({ name: f.name, type: 'faction' })),
  ];

  // Measure container
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  // Layout
  useEffect(() => {
    if (allNodes.length === 0) return;
    const nodes = allNodes.map((n) => ({ name: n.name }));
    const edges = world.relationships.map((r) => ({
      from: r.character_a, to: r.character_b, label: r.relation,
    }));
    const posMap = {};
    positions.forEach((p) => { posMap[p.name] = { x: p.x, y: p.y }; });
    nodes.forEach((n) => {
      if (posMap[n.name]) { n.x = posMap[n.name].x; n.y = posMap[n.name].y; }
    });
    const result = forceLayout(nodes, edges, dimensions.width, dimensions.height);
    setPositions(result);
  }, [allNodes.length, world.relationships.length, dimensions]);

  // Drag handlers
  const handleMouseDown = useCallback((e, name) => {
    e.stopPropagation();
    if (connecting) {
      if (name !== connecting) {
        const exists = world.relationships.some(
          (r) => (r.character_a === connecting && r.character_b === name) ||
                 (r.character_a === name && r.character_b === connecting)
        );
        if (!exists) {
          const newRels = [...world.relationships, {
            character_a: connecting,
            character_b: name,
            relation: '',
          }];
          setWorld({ ...world, relationships: newRels });
          setEditingRel(newRels.length - 1);
        }
      }
      setConnecting(null);
      return;
    }
    setDragging({ name, startX: e.clientX, startY: e.clientY });
  }, [connecting, world]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setPositions((prev) =>
      prev.map((p) => p.name === dragging.name ? { ...p, x, y } : p)
    );
  }, [dragging, dimensions]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Double-click on SVG background → open creation form
  const handleSvgMouseDown = useCallback((e) => {
    // Only react to double-click (detail === 2) on empty area
    if (e.detail !== 2) return;
    if (hoveredNode) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    setCreateForm({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      svgX,
      svgY,
      name: '',
      description: '',
      type: 'character',
    });
    setConnecting(null);
  }, [hoveredNode, hoveredEdge, dimensions]);

  // Right-click context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      svgX,
      svgY,
      targetNode: hoveredNode || null,
    });
    setCreateForm(null);
    setConnecting(null);
  }, [hoveredNode, dimensions]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleCreateSubmit = useCallback(async () => {
    if (!createForm || !createForm.name.trim()) return;
    const name = createForm.name.trim();

    // Check duplicate name
    if (allNodes.some((n) => n.name === name)) {
      addToast('已存在同名角色或组织', 'error');
      return;
    }

    if (createForm.type === 'character') {
      // Add character to story via API
      const newChars = [...characters, {
        name,
        description: createForm.description || '',
      }];
      try {
        const res = await fetch(`${API}/stories/${story.story_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characters: newChars }),
        });
        if (!res.ok) throw new Error('添加失败');
        const data = await res.json();
        onUpdate(data);
        addToast(`角色「${name}」已添加`, 'success');
      } catch (err) {
        addToast('添加角色失败：' + err.message, 'error');
        return;
      }
    } else {
      // Add faction to local world state
      const newFactions = [...factions, {
        name,
        description: createForm.description || '',
      }];
      setWorld({ ...world, factions: newFactions });
      addToast(`组织「${name}」已添加，请记得保存`, 'info');
    }

    // Place the new node at the click position
    setPositions((prev) => [...prev, {
      name,
      x: createForm.svgX,
      y: createForm.svgY,
      vx: 0,
      vy: 0,
    }]);

    setCreateForm(null);
  }, [createForm, allNodes, characters, factions, world, story, onUpdate, addToast]);

  const startConnect = (name) => {
    setConnecting(name);
    setContextMenu(null);
  };

  // Edit node submit
  const handleEditSubmit = useCallback(async () => {
    if (!editForm) return;
    const oldName = editForm.name;

    if (editForm.type === 'character') {
      const newChars = characters.map((c) =>
        c.name === oldName
          ? { ...c, name: editForm.name, description: editForm.description, personality: editForm.personality, background: editForm.background }
          : c
      );
      try {
        const res = await fetch(`${API}/stories/${story.story_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characters: newChars }),
        });
        if (!res.ok) throw new Error('更新失败');
        const data = await res.json();

        // Update relationship names if character was renamed
        if (oldName !== editForm.name) {
          const newRels = world.relationships.map((r) => ({
            ...r,
            character_a: r.character_a === oldName ? editForm.name : r.character_a,
            character_b: r.character_b === oldName ? editForm.name : r.character_b,
          }));
          await fetch(`${API}/stories/${story.story_id}/world`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relationships: newRels }),
          });
        }

        const fresh = await fetch(`${API}/stories/${story.story_id}`);
        if (fresh.ok) {
          const full = await fresh.json();
          onUpdate(full);
          setWorld({
            world_lore: full.world?.world_lore || '',
            locations: full.world?.locations || [],
            factions: full.world?.factions || [],
            relationships: full.world?.relationships || [],
            notes: full.world?.notes || '',
          });
        }
        addToast(`角色「${editForm.name}」已更新`, 'success');
      } catch (err) {
        addToast('更新失败：' + err.message, 'error');
        return;
      }
    } else {
      const newFactions = factions.map((f) =>
        f.name === oldName ? { ...f, name: editForm.name, description: editForm.description } : f
      );
      const newRels = oldName !== editForm.name
        ? world.relationships.map((r) => ({
            ...r,
            character_a: r.character_a === oldName ? editForm.name : r.character_a,
            character_b: r.character_b === oldName ? editForm.name : r.character_b,
          }))
        : world.relationships;
      setWorld({ ...world, factions: newFactions, relationships: newRels });
      addToast(`组织「${editForm.name}」已更新`, 'success');
    }

    // Update position name if renamed
    if (oldName !== editForm.name) {
      setPositions((prev) =>
        prev.map((p) => p.name === oldName ? { ...p, name: editForm.name } : p)
      );
    }

    setEditForm(null);
  }, [editForm, characters, factions, world, story, onUpdate, addToast]);

  // Delete a character or faction node
  const deleteNode = useCallback(async (name) => {
    const isChar = characters.some((c) => c.name === name);
    const isFac = factions.some((f) => f.name === name);

    if (isChar) {
      const newChars = characters.filter((c) => c.name !== name);
      const newRels = world.relationships.filter(
        (r) => r.character_a !== name && r.character_b !== name
      );
      try {
        const res = await fetch(`${API}/stories/${story.story_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characters: newChars }),
        });
        if (!res.ok) throw new Error('删除失败');
        await fetch(`${API}/stories/${story.story_id}/world`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relationships: newRels }),
        });
        // Re-fetch to get full updated story
        const fresh = await fetch(`${API}/stories/${story.story_id}`);
        if (fresh.ok) {
          const data = await fresh.json();
          onUpdate(data);
          setWorld({
            world_lore: data.world?.world_lore || '',
            locations: data.world?.locations || [],
            factions: data.world?.factions || [],
            relationships: data.world?.relationships || [],
            notes: data.world?.notes || '',
          });
        }
        addToast(`角色「${name}」已删除`, 'info');
      } catch (err) {
        addToast('删除失败：' + err.message, 'error');
      }
    } else if (isFac) {
      const newFactions = factions.filter((f) => f.name !== name);
      const newRels = world.relationships.filter(
        (r) => r.character_a !== name && r.character_b !== name
      );
      setWorld({ ...world, factions: newFactions, relationships: newRels });
      addToast(`组织「${name}」已删除，请记得保存`, 'info');
    }

    setPositions((prev) => prev.filter((p) => p.name !== name));
    setContextMenu(null);
  }, [characters, factions, world, story, onUpdate, addToast]);

  const removeRelationship = (idx) => {
    setWorld({ ...world, relationships: world.relationships.filter((_, i) => i !== idx) });
    if (editingRel === idx) setEditingRel(null);
  };

  const updateRelationLabel = (idx, value) => {
    const updated = [...world.relationships];
    updated[idx] = { ...updated[idx], relation: value };
    setWorld({ ...world, relationships: updated });
  };

  // Save
  const save = useCallback(async () => {
    if (!story) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/stories/${story.story_id}/world`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(world),
      });
      if (!res.ok) throw new Error('保存失败');
      const data = await res.json();
      onUpdate(data);
      addToast('世界观已保存', 'success');
    } catch (err) {
      addToast('保存失败：' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [story?.story_id, world, onUpdate, addToast]);

  // Locations
  const addLocation = () => setWorld({ ...world, locations: [...world.locations, { name: '', description: '' }] });
  const updateLocation = (idx, field, value) => {
    const updated = [...world.locations];
    updated[idx] = { ...updated[idx], [field]: value };
    setWorld({ ...world, locations: updated });
  };
  const removeLocation = (idx) => setWorld({ ...world, locations: world.locations.filter((_, i) => i !== idx) });

  // Factions
  const addFaction = () => setWorld({ ...world, factions: [...world.factions, { name: '', description: '' }] });
  const updateFaction = (idx, field, value) => {
    const updated = [...world.factions];
    updated[idx] = { ...updated[idx], [field]: value };
    setWorld({ ...world, factions: updated });
  };
  const removeFaction = (idx) => setWorld({ ...world, factions: world.factions.filter((_, i) => i !== idx) });

  return (
    <div className="worldbuilding-panel">
      <div className="wb-header">
        <h2>世界观搭建</h2>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '保存中...' : '保存世界观'}
        </button>
      </div>

      <div className="wb-sections">
        {/* Relationship Graph */}
        <section className="wb-section">
          <div className="wb-section-header">
            <h3>人物关系图谱</h3>
            <div className="wb-graph-hint">
              {connecting
                ? `点击目标角色/组织建立关系（当前选中：${connecting}）`
                : '点击「+ 添加」或右键菜单创建节点 · 悬停节点点击「连线」建立关系'
              }
            </div>
          </div>

          <div className="wb-graph-wrap">
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
              onMouseDown={handleSvgMouseDown}
              onContextMenu={handleContextMenu}
              onClick={() => { if (connecting) setConnecting(null); }}
            >
              <defs>
                <marker id="wb-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="var(--text-muted)" opacity="0.5" />
                </marker>
              </defs>

              {/* Edges */}
              {world.relationships.map((r, i) => {
                const a = positions.find((n) => n.name === r.character_a);
                const b = positions.find((n) => n.name === r.character_b);
                if (!a || !b) return null;
                const isHovered = hoveredEdge === i;
                return (
                  <g key={i}>
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={isHovered ? 'var(--accent)' : 'var(--border)'}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      markerEnd="url(#wb-arrow)"
                      onMouseEnter={() => setHoveredEdge(i)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      style={{ cursor: 'pointer' }}
                    />
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="transparent"
                      strokeWidth={12}
                      onMouseEnter={() => setHoveredEdge(i)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      onClick={() => setEditingRel(editingRel === i ? null : i)}
                      style={{ cursor: 'pointer' }}
                    />
                    {r.relation && (
                      <text
                        x={(a.x + b.x) / 2}
                        y={(a.y + b.y) / 2 - 8}
                        textAnchor="middle"
                        fill={isHovered ? 'var(--accent)' : 'var(--text-muted)'}
                        fontSize="11"
                        fontWeight={isHovered ? '600' : '400'}
                        pointerEvents="none"
                      >
                        {r.relation}
                      </text>
                    )}
                    {isHovered && (
                      <g
                        onClick={(e) => { e.stopPropagation(); removeRelationship(i); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={(a.x + b.x) / 2 + (r.relation ? r.relation.length * 4 + 16 : 8)}
                          cy={(a.y + b.y) / 2 - 8}
                          r={8}
                          fill="var(--danger)"
                        />
                        <text
                          x={(a.x + b.x) / 2 + (r.relation ? r.relation.length * 4 + 16 : 8)}
                          y={(a.y + b.y) / 2 - 5}
                          textAnchor="middle"
                          fill="white"
                          fontSize="11"
                          fontWeight="700"
                          pointerEvents="none"
                        >
                          x
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Connection line */}
              {connecting && hoveredNode && hoveredNode !== connecting && (() => {
                const a = positions.find((n) => n.name === connecting);
                const b = positions.find((n) => n.name === hoveredNode);
                if (!a || !b) return null;
                return (
                  <line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    pointerEvents="none"
                  />
                );
              })()}

              {/* Nodes */}
              {positions.map((node, i) => {
                const isHovered = hoveredNode === node.name;
                const isConnecting = connecting === node.name;
                const nodeInfo = allNodes.find((n) => n.name === node.name);
                const isFaction = nodeInfo?.type === 'faction';
                const color = isFaction ? '#fdcb6e' : COLORS[i % COLORS.length];
                const r = 24;

                return (
                  <g
                    key={node.name}
                    onMouseDown={(e) => handleMouseDown(e, node.name)}
                    onMouseEnter={() => setHoveredNode(node.name)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: dragging?.name === node.name ? 'grabbing' : 'pointer' }}
                  >
                    {isHovered && (
                      <circle cx={node.x} cy={node.y} r={32} fill={color} opacity={0.15} />
                    )}
                    {isConnecting && (
                      <circle cx={node.x} cy={node.y} r={36} fill="none" stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 3" />
                    )}
                    {/* Character = circle, Faction = rounded rect */}
                    {isFaction ? (
                      <rect
                        x={node.x - r} y={node.y - r * 0.75}
                        width={r * 2} height={r * 1.5}
                        rx={6}
                        fill={isHovered || isConnecting ? color : 'var(--surface)'}
                        stroke={color}
                        strokeWidth={2}
                      />
                    ) : (
                      <circle
                        cx={node.x} cy={node.y} r={r}
                        fill={isHovered || isConnecting ? color : 'var(--surface)'}
                        stroke={color}
                        strokeWidth={2}
                      />
                    )}
                    <text
                      x={node.x} y={node.y + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isHovered || isConnecting ? '#1a1d27' : color}
                      fontSize="13"
                      fontWeight="600"
                      pointerEvents="none"
                    >
                      {node.name.length > 4 ? node.name.slice(0, 4) : node.name}
                    </text>
                    <text
                      x={node.x} y={node.y + (isFaction ? 30 : 38)}
                      textAnchor="middle"
                      fill="var(--text)"
                      fontSize="12"
                      fontWeight="500"
                      pointerEvents="none"
                    >
                      {node.name}
                    </text>
                    {/* Type badge */}
                    {isFaction && (
                      <text
                        x={node.x} y={node.y + (isFaction ? 44 : 52)}
                        textAnchor="middle"
                        fill="var(--text-muted)"
                        fontSize="9"
                        pointerEvents="none"
                      >
                        组织
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Toolbar */}
            <div className="wb-graph-toolbar">
              {connecting ? (
                <button className="btn btn-outline btn-sm" onClick={() => setConnecting(null)}>
                  取消连线
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setCreateForm({
                        x: dimensions.width / 2 - 120,
                        y: dimensions.height / 2 - 100,
                        svgX: dimensions.width / 2,
                        svgY: dimensions.height / 2,
                        name: '',
                        description: '',
                        type: 'character',
                      });
                    }}
                  >
                    + 添加
                  </button>
                  {hoveredNode && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => startConnect(hoveredNode)}
                    >
                      连线：{hoveredNode}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Relationship label editor */}
            {editingRel !== null && world.relationships[editingRel] && (
              <div className="wb-rel-editor">
                <span className="wb-rel-editor-label">
                  {world.relationships[editingRel].character_a} ↔ {world.relationships[editingRel].character_b}
                </span>
                <input
                  className="input"
                  placeholder="关系描述（如：师徒、敌人、恋人）"
                  value={world.relationships[editingRel].relation}
                  onChange={(e) => updateRelationLabel(editingRel, e.target.value)}
                  autoFocus
                />
                <button className="btn btn-outline btn-sm" onClick={() => setEditingRel(null)}>完成</button>
              </div>
            )}

            {/* Double-click creation form */}
            {createForm && (
              <div
                className="wb-create-form"
                style={{
                  left: Math.min(createForm.x, dimensions.width * 0.8 - 260),
                  top: Math.min(createForm.y, dimensions.height * 0.8 - 200),
                }}
              >
                <div className="wb-create-title">新建节点</div>
                <div className="wb-create-type-row">
                  <button
                    className={`wb-create-type-btn ${createForm.type === 'character' ? 'active' : ''}`}
                    onClick={() => setCreateForm({ ...createForm, type: 'character' })}
                  >
                    角色
                  </button>
                  <button
                    className={`wb-create-type-btn ${createForm.type === 'faction' ? 'active' : ''}`}
                    onClick={() => setCreateForm({ ...createForm, type: 'faction' })}
                  >
                    组织
                  </button>
                </div>
                <input
                  className="input"
                  placeholder={createForm.type === 'character' ? '角色名称' : '组织名称'}
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubmit(); }}
                />
                <textarea
                  className="input wb-create-desc"
                  placeholder="简介（可选）"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
                <div className="wb-create-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setCreateForm(null)}>取消</button>
                  <button className="btn btn-primary btn-sm" onClick={handleCreateSubmit} disabled={!createForm.name.trim()}>
                    创建
                  </button>
                </div>
              </div>
            )}

            {/* Edit node form */}
            {editForm && (
              <div
                className="wb-create-form"
                style={{
                  left: Math.min(dimensions.width / 2 - 140, dimensions.width * 0.8 - 280),
                  top: Math.min(dimensions.height / 2 - 160, dimensions.height * 0.8 - 320),
                }}
              >
                <div className="wb-create-title">
                  编辑{editForm.type === 'character' ? '角色' : '组织'}
                </div>
                <input
                  className="input"
                  placeholder={editForm.type === 'character' ? '角色名称' : '组织名称'}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  autoFocus
                />
                <textarea
                  className="input wb-create-desc"
                  placeholder="简介"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                {editForm.type === 'character' && (
                  <>
                    <input
                      className="input"
                      placeholder="性格（可选）"
                      value={editForm.personality}
                      onChange={(e) => setEditForm({ ...editForm, personality: e.target.value })}
                    />
                    <textarea
                      className="input wb-create-desc"
                      placeholder="背景故事（可选）"
                      value={editForm.background}
                      onChange={(e) => setEditForm({ ...editForm, background: e.target.value })}
                    />
                  </>
                )}
                <div className="wb-create-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setEditForm(null)}>取消</button>
                  <button className="btn btn-primary btn-sm" onClick={handleEditSubmit} disabled={!editForm.name.trim()}>
                    保存
                  </button>
                </div>
              </div>
            )}

            {/* Context menu */}
            {contextMenu && (
              <div
                ref={contextMenuRef}
                className="wb-context-menu"
                style={{
                  left: Math.min(contextMenu.x, dimensions.width - 160),
                  top: Math.min(contextMenu.y, dimensions.height - 140),
                }}
              >
                {contextMenu.targetNode ? (
                  <>
                    <div className="wb-context-title">{contextMenu.targetNode}</div>
                    <div className="wb-context-item" onClick={() => {
                      const name = contextMenu.targetNode;
                      const char = characters.find((c) => c.name === name);
                      const fac = factions.find((f) => f.name === name);
                      if (char) {
                        setEditForm({ name: char.name, description: char.description || '', personality: char.personality || '', background: char.background || '', type: 'character' });
                      } else if (fac) {
                        setEditForm({ name: fac.name, description: fac.description || '', personality: '', background: '', type: 'faction' });
                      }
                      setContextMenu(null);
                    }}>
                      编辑
                    </div>
                    <div className="wb-context-item" onClick={() => startConnect(contextMenu.targetNode)}>
                      与其它节点连线
                    </div>
                    <div className="wb-context-item danger" onClick={() => deleteNode(contextMenu.targetNode)}>
                      删除此节点
                    </div>
                    <div className="wb-context-divider" />
                  </>
                ) : null}
                <div
                  className="wb-context-item"
                  onClick={() => {
                    setCreateForm({
                      x: contextMenu.x,
                      y: contextMenu.y,
                      svgX: contextMenu.svgX,
                      svgY: contextMenu.svgY,
                      name: '',
                      description: '',
                      type: 'character',
                    });
                    setContextMenu(null);
                  }}
                >
                  添加角色
                </div>
                <div
                  className="wb-context-item"
                  onClick={() => {
                    setCreateForm({
                      x: contextMenu.x,
                      y: contextMenu.y,
                      svgX: contextMenu.svgX,
                      svgY: contextMenu.svgY,
                      name: '',
                      description: '',
                      type: 'faction',
                    });
                    setContextMenu(null);
                  }}
                >
                  添加组织
                </div>
              </div>
            )}
          </div>
        </section>

        {/* World Lore */}
        <section className="wb-section">
          <h3>世界背景</h3>
          <textarea
            className="input wb-textarea"
            placeholder="描述这个世界的基本设定：时代背景、魔法体系、科技水平、主要矛盾..."
            value={world.world_lore}
            onChange={(e) => setWorld({ ...world, world_lore: e.target.value })}
          />
        </section>

        {/* Locations */}
        <section className="wb-section">
          <div className="wb-section-header">
            <h3>地点 / 场景</h3>
            <button className="btn btn-outline btn-sm" onClick={addLocation}>+ 添加</button>
          </div>
          {world.locations.length === 0 && <div className="wb-empty">暂无地点设定</div>}
          {world.locations.map((loc, idx) => (
            <div key={idx} className="wb-item">
              <div className="wb-item-row">
                <input className="input" placeholder="地点名称" value={loc.name} onChange={(e) => updateLocation(idx, 'name', e.target.value)} />
                <button className="btn-icon" onClick={() => removeLocation(idx)} title="删除">×</button>
              </div>
              <textarea className="input wb-item-desc" placeholder="描述这个地点..." value={loc.description} onChange={(e) => updateLocation(idx, 'description', e.target.value)} />
            </div>
          ))}
        </section>

        {/* Factions */}
        <section className="wb-section">
          <div className="wb-section-header">
            <h3>阵营 / 组织</h3>
            <button className="btn btn-outline btn-sm" onClick={addFaction}>+ 添加</button>
          </div>
          {world.factions.length === 0 && <div className="wb-empty">暂无阵营设定</div>}
          {world.factions.map((fac, idx) => (
            <div key={idx} className="wb-item">
              <div className="wb-item-row">
                <input className="input" placeholder="阵营名称" value={fac.name} onChange={(e) => updateFaction(idx, 'name', e.target.value)} />
                <button className="btn-icon" onClick={() => removeFaction(idx)} title="删除">×</button>
              </div>
              <textarea className="input wb-item-desc" placeholder="描述这个阵营..." value={fac.description} onChange={(e) => updateFaction(idx, 'description', e.target.value)} />
            </div>
          ))}
        </section>

        {/* Notes */}
        <section className="wb-section">
          <h3>其他设定备注</h3>
          <textarea
            className="input wb-textarea"
            placeholder="任何你觉得重要的世界观细节..."
            value={world.notes}
            onChange={(e) => setWorld({ ...world, notes: e.target.value })}
          />
        </section>
      </div>
    </div>
  );
}
