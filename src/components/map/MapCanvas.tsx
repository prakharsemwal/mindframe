"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type NodeMouseHandler,
  type OnConnect,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";

import { MindMapNodeComponent } from "./MindMapNode";
import { TextNodeComponent, type TextNodeData } from "./TextNode";
import { NodePanel } from "./NodePanel";
import { ContextMenu } from "./ContextMenu";
import { ConversationImport } from "./ConversationImport";
import { CustomTagManager } from "./CustomTagManager";
import {
  MessageSquare,
  Download,
  Tag,
  ZoomIn,
  ZoomOut,
  Maximize,
  Plus,
  Type,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
} from "lucide-react";
import { cn, generateId, now } from "@/lib/utils";
import type {
  MindMapNode,
  MindMapEdge,
  NodeData,
  CustomTag,
  Library,
  ImportedDoc,
  Project,
} from "@/types";

const nodeTypes = {
  mindmap: MindMapNodeComponent,
  text: TextNodeComponent,
};

interface MapCanvasProps {
  project: Project;
  library?: Library;
  onSave: (nodes: MindMapNode[], edges: MindMapEdge[], customTags?: CustomTag[]) => void;
  onExport: () => void;
}

// History state for undo/redo
interface HistoryState {
  nodes: any[];
  edges: any[];
}

const MAX_HISTORY = 50;

function MapCanvasInner({ project, library, onSave, onExport }: MapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(project.nodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState(project.edges as any);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [customTags, setCustomTags] = useState<CustomTag[]>(
    project.customTags || []
  );
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const { fitView, zoomIn, zoomOut, getNodes } = useReactFlow();

  // Undo/Redo history
  const historyRef = useRef<HistoryState[]>([{ nodes: project.nodes as any, edges: project.edges as any }]);
  const historyIndexRef = useRef(0);
  const isUndoRedoAction = useRef(false);

  // Push to history (called after meaningful changes)
  const pushToHistory = useCallback((newNodes: any[], newEdges: any[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    // Remove any future states if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

    // Add new state
    historyRef.current.push({ nodes: newNodes, edges: newEdges });

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }

    historyIndexRef.current = historyRef.current.length - 1;
  }, []);


  // Auto-save with debounce
  const debouncedSave = useCallback(
    (n: typeof nodes, e: typeof edges, ct?: CustomTag[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onSave(n as unknown as MindMapNode[], e as unknown as MindMapEdge[], ct);
      }, 800);
    },
    [onSave]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      isUndoRedoAction.current = true;
      setNodes(state.nodes);
      setEdges(state.edges);
      debouncedSave(state.nodes, state.edges, customTags);
    }
  }, [setNodes, setEdges, customTags, debouncedSave]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      isUndoRedoAction.current = true;
      setNodes(state.nodes);
      setEdges(state.edges);
      debouncedSave(state.nodes, state.edges, customTags);
    }
  }, [setNodes, setEdges, customTags, debouncedSave]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(
        { ...connection, id: generateId() },
        edges
      );
      setEdges(newEdges);
      debouncedSave(nodes, newEdges);
    },
    [edges, nodes, setEdges, debouncedSave]
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only create node if clicking on the canvas background
      if (
        target.classList.contains("react-flow__pane") ||
        target.tagName === "svg"
      ) {
        const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - bounds.left - 100;
        const y = e.clientY - bounds.top - 50;

        const newNode: MindMapNode = {
          id: generateId(),
          type: "mindmap",
          position: { x, y },
          style: { width: 200 },
          data: {
            title: "New node",
            body: "",
            tag: "hold",
            bgColor: "#FFFFFF",
            annotation: "",
            createdAt: now(),
            updatedAt: now(),
          },
        };

        const updated = [...nodes, newNode as any];
        setNodes(updated);
        setSelectedNodeId(newNode.id);
        debouncedSave(updated, edges);
      }
    },
    [nodes, edges, setNodes, debouncedSave]
  );

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Partial<NodeData>) => {
      const updated = nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      );
      setNodes(updated);
      pushToHistory(updated, edges);
      debouncedSave(updated, edges, customTags);
    },
    [nodes, edges, customTags, setNodes, debouncedSave, pushToHistory]
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      const updated = nodes.filter((n) => n.id !== nodeId);
      const updatedEdges = edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      );
      setNodes(updated);
      setEdges(updatedEdges);
      setSelectedNodeId(null);
      pushToHistory(updated, updatedEdges);
      debouncedSave(updated, updatedEdges, customTags);
    },
    [nodes, edges, customTags, setNodes, setEdges, debouncedSave, pushToHistory]
  );

  const handleNodeDuplicate = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const newNode = {
        ...node,
        id: generateId(),
        position: {
          x: node.position.x + 30,
          y: node.position.y + 30,
        },
        data: {
          ...node.data,
          createdAt: now(),
          updatedAt: now(),
        },
      };
      const updated = [...nodes, newNode];
      setNodes(updated);
      pushToHistory(updated, edges);
      debouncedSave(updated, edges, customTags);
    },
    [nodes, edges, customTags, setNodes, debouncedSave, pushToHistory]
  );

  const handleTagChange = useCallback(
    (nodeId: string, tag: string) => {
      handleNodeUpdate(nodeId, { tag, isDraft: false, updatedAt: now() });
    },
    [handleNodeUpdate]
  );

  const handleImportNodes = useCallback(
    (newNodes: MindMapNode[]) => {
      const updated = [...nodes, ...(newNodes as any)];
      setNodes(updated);
      pushToHistory(updated, edges);
      debouncedSave(updated, edges, customTags);
    },
    [nodes, edges, customTags, setNodes, debouncedSave, pushToHistory]
  );

  const handleCustomTagsChange = useCallback(
    (tags: CustomTag[]) => {
      setCustomTags(tags);
      debouncedSave(nodes, edges, tags);
    },
    [nodes, edges, debouncedSave]
  );

  // Handle selection change for multi-select
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: any[] }) => {
      setSelectedNodeIds(selectedNodes.map((n) => n.id));
    },
    []
  );

  // Alignment functions
  const alignNodes = useCallback(
    (alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => {
      if (selectedNodeIds.length < 2) return;

      const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
      const nodeWidth = 200; // Fixed node width

      let updated = [...nodes];

      switch (alignment) {
        case "left": {
          const minX = Math.min(...selectedNodes.map((n) => n.position.x));
          updated = nodes.map((n) =>
            selectedNodeIds.includes(n.id)
              ? { ...n, position: { ...n.position, x: minX } }
              : n
          );
          break;
        }
        case "center-h": {
          const minX = Math.min(...selectedNodes.map((n) => n.position.x));
          const maxX = Math.max(...selectedNodes.map((n) => n.position.x + nodeWidth));
          const centerX = (minX + maxX) / 2 - nodeWidth / 2;
          updated = nodes.map((n) =>
            selectedNodeIds.includes(n.id)
              ? { ...n, position: { ...n.position, x: centerX } }
              : n
          );
          break;
        }
        case "right": {
          const maxX = Math.max(...selectedNodes.map((n) => n.position.x));
          updated = nodes.map((n) =>
            selectedNodeIds.includes(n.id)
              ? { ...n, position: { ...n.position, x: maxX } }
              : n
          );
          break;
        }
        case "top": {
          const minY = Math.min(...selectedNodes.map((n) => n.position.y));
          updated = nodes.map((n) =>
            selectedNodeIds.includes(n.id)
              ? { ...n, position: { ...n.position, y: minY } }
              : n
          );
          break;
        }
        case "center-v": {
          const positions = selectedNodes.map((n) => n.position.y);
          const minY = Math.min(...positions);
          const maxY = Math.max(...positions);
          const centerY = (minY + maxY) / 2;
          updated = nodes.map((n) =>
            selectedNodeIds.includes(n.id)
              ? { ...n, position: { ...n.position, y: centerY } }
              : n
          );
          break;
        }
        case "bottom": {
          const maxY = Math.max(...selectedNodes.map((n) => n.position.y));
          updated = nodes.map((n) =>
            selectedNodeIds.includes(n.id)
              ? { ...n, position: { ...n.position, y: maxY } }
              : n
          );
          break;
        }
      }

      setNodes(updated);
      pushToHistory(updated, edges);
      debouncedSave(updated, edges, customTags);
    },
    [nodes, edges, customTags, selectedNodeIds, setNodes, debouncedSave, pushToHistory]
  );

  // Distribute nodes evenly
  const distributeNodes = useCallback(
    (direction: "horizontal" | "vertical") => {
      if (selectedNodeIds.length < 3) return;

      const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
      const nodeWidth = 200;
      const nodeHeight = 100; // Approximate height

      let updated = [...nodes];

      if (direction === "horizontal") {
        const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
        const minX = sorted[0].position.x;
        const maxX = sorted[sorted.length - 1].position.x;
        const spacing = (maxX - minX) / (sorted.length - 1);

        updated = nodes.map((n) => {
          const idx = sorted.findIndex((s) => s.id === n.id);
          if (idx >= 0) {
            return { ...n, position: { ...n.position, x: minX + idx * spacing } };
          }
          return n;
        });
      } else {
        const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
        const minY = sorted[0].position.y;
        const maxY = sorted[sorted.length - 1].position.y;
        const spacing = (maxY - minY) / (sorted.length - 1);

        updated = nodes.map((n) => {
          const idx = sorted.findIndex((s) => s.id === n.id);
          if (idx >= 0) {
            return { ...n, position: { ...n.position, y: minY + idx * spacing } };
          }
          return n;
        });
      }

      setNodes(updated);
      pushToHistory(updated, edges);
      debouncedSave(updated, edges, customTags);
    },
    [nodes, edges, customTags, selectedNodeIds, setNodes, debouncedSave, pushToHistory]
  );

  function addNode() {
    const x = 200 + Math.random() * 400;
    const y = 200 + Math.random() * 200;
    const newNode: MindMapNode = {
      id: generateId(),
      type: "mindmap",
      position: { x, y },
      style: { width: 200 },
      data: {
        title: "New node",
        body: "",
        tag: "hold",
        bgColor: "#FFFFFF",
        createdAt: now(),
        updatedAt: now(),
      },
    };
    const updated = [...nodes, newNode as any];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    pushToHistory(updated, edges);
    debouncedSave(updated, edges, customTags);
  }

  function addTextNode() {
    const x = 200 + Math.random() * 400;
    const y = 200 + Math.random() * 200;
    const newNode = {
      id: generateId(),
      type: "text",
      position: { x, y },
      data: {
        text: "",
        fontSize: "medium" as const,
      },
    };
    const updated = [...nodes, newNode as any];
    setNodes(updated);
    pushToHistory(updated, edges);
    debouncedSave(updated, edges, customTags);
  }

  // Handle text node updates
  const handleTextNodeUpdate = useCallback(
    (nodeId: string, data: Partial<TextNodeData>) => {
      const updated = nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      );
      setNodes(updated);
      pushToHistory(updated, edges);
      debouncedSave(updated, edges, customTags);
    },
    [nodes, edges, customTags, setNodes, debouncedSave, pushToHistory]
  );

  // Delete selected nodes (for keyboard shortcut)
  const deleteSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;

    const updated = nodes.filter((n) => !selectedNodeIds.includes(n.id));
    const updatedEdges = edges.filter(
      (e) => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)
    );
    setNodes(updated);
    setEdges(updatedEdges);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    pushToHistory(updated, updatedEdges);
    debouncedSave(updated, updatedEdges, customTags);
  }, [nodes, edges, selectedNodeIds, customTags, setNodes, setEdges, debouncedSave, pushToHistory]);

  // Duplicate selected nodes (for keyboard shortcut)
  const duplicateSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;

    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const newNodes = selectedNodes.map((node) => ({
      ...node,
      id: generateId(),
      position: {
        x: node.position.x + 30,
        y: node.position.y + 30,
      },
      selected: false,
      data: {
        ...node.data,
        createdAt: now(),
        updatedAt: now(),
      },
    }));

    const updated = [...nodes, ...newNodes];
    setNodes(updated);
    pushToHistory(updated, edges);
    debouncedSave(updated, edges, customTags);
  }, [nodes, edges, selectedNodeIds, customTags, setNodes, debouncedSave, pushToHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Delete: Backspace or Delete
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteSelectedNodes();
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if (cmdOrCtrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((cmdOrCtrl && e.key === "z" && e.shiftKey) || (cmdOrCtrl && e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate: Cmd/Ctrl + D
      if (cmdOrCtrl && e.key === "d") {
        e.preventDefault();
        duplicateSelectedNodes();
        return;
      }

      // Select All: Cmd/Ctrl + A
      if (cmdOrCtrl && e.key === "a") {
        e.preventDefault();
        const allNodeIds = nodes.map((n) => n.id);
        setSelectedNodeIds(allNodeIds);
        // Also update React Flow's internal selection
        setNodes(nodes.map((n) => ({ ...n, selected: true })));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, deleteSelectedNodes, duplicateSelectedNodes, undo, redo, setNodes]);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  // Inject onUpdate callback into each node's data for inline editing
  const nodesWithCallbacks = nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      onUpdate: n.type === "text" ? handleTextNodeUpdate : handleNodeUpdate,
    },
  }));

  return (
    <div className="flex h-full relative">
      {/* Canvas */}
      <div className="flex-1 relative" onDoubleClick={onCanvasDoubleClick}>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            // Save on position or dimension changes
            const shouldSave = changes.some(
              (c) =>
                (c.type === "position" && !c.dragging) ||
                c.type === "dimensions"
            );
            if (shouldSave) {
              debouncedSave(nodes, edges, customTags);
            }
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            debouncedSave(nodes, edges, customTags);
          }}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          nodeDragThreshold={5}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          panOnDrag={[1, 2]}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          deleteKeyCode="Delete"
          className="bg-[var(--surface-2)]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="#D4D2CC"
          />
          <MiniMap
            nodeColor={(n) => {
              const tag = (n.data as NodeData)?.tag;
              const colors: Record<string, string> = {
                commit: "#D8F3DC",
                discard: "#F5F5F5",
                hold: "#FEF3C7",
                reference: "#DBEAFE",
              };
              return colors[tag] || "#F0EEE9";
            }}
            maskColor="rgba(248,247,244,0.7)"
          />
        </ReactFlow>

        {/* Toolbar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2 py-1.5 shadow-sm">
          <ToolbarButton
            onClick={addNode}
            title="Add node"
            icon={<Plus size={14} />}
          />
          <ToolbarButton
            onClick={addTextNode}
            title="Add text"
            icon={<Type size={14} />}
          />
          <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
          <ToolbarButton
            onClick={() => zoomIn()}
            title="Zoom in"
            icon={<ZoomIn size={14} />}
          />
          <ToolbarButton
            onClick={() => zoomOut()}
            title="Zoom out"
            icon={<ZoomOut size={14} />}
          />
          <ToolbarButton
            onClick={() => fitView({ padding: 0.2 })}
            title="Fit view"
            icon={<Maximize size={14} />}
          />
          <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
          <ToolbarButton
            onClick={() => setShowImport(true)}
            title="Import conversation"
            icon={<MessageSquare size={14} />}
            label="Import"
          />
          <ToolbarButton
            onClick={() => setShowTagManager(true)}
            title="Manage tags"
            icon={<Tag size={14} />}
          />
          <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
          <ToolbarButton
            onClick={onExport}
            title="Export decisions"
            icon={<Download size={14} />}
            label="Export"
          />
        </div>

        {/* Alignment toolbar - shows when multiple nodes are selected */}
        {selectedNodeIds.length >= 2 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2 py-1.5 shadow-lg z-10">
            <span className="text-[10px] font-medium text-[var(--muted)] px-2">
              {selectedNodeIds.length} selected
            </span>
            <div className="w-px h-4 bg-[var(--border)] mx-1" />
            <ToolbarButton
              onClick={() => alignNodes("left")}
              title="Align left"
              icon={<AlignStartVertical size={14} />}
            />
            <ToolbarButton
              onClick={() => alignNodes("center-h")}
              title="Align center horizontally"
              icon={<AlignCenterVertical size={14} />}
            />
            <ToolbarButton
              onClick={() => alignNodes("right")}
              title="Align right"
              icon={<AlignEndVertical size={14} />}
            />
            <div className="w-px h-4 bg-[var(--border)] mx-1" />
            <ToolbarButton
              onClick={() => alignNodes("top")}
              title="Align top"
              icon={<AlignStartHorizontal size={14} />}
            />
            <ToolbarButton
              onClick={() => alignNodes("center-v")}
              title="Align center vertically"
              icon={<AlignCenterHorizontal size={14} />}
            />
            <ToolbarButton
              onClick={() => alignNodes("bottom")}
              title="Align bottom"
              icon={<AlignEndHorizontal size={14} />}
            />
            {selectedNodeIds.length >= 3 && (
              <>
                <div className="w-px h-4 bg-[var(--border)] mx-1" />
                <ToolbarButton
                  onClick={() => distributeNodes("horizontal")}
                  title="Distribute horizontally"
                  icon={<span className="text-[10px] font-bold">H</span>}
                  label="Distribute"
                />
                <ToolbarButton
                  onClick={() => distributeNodes("vertical")}
                  title="Distribute vertically"
                  icon={<span className="text-[10px] font-bold">V</span>}
                  label="Distribute"
                />
              </>
            )}
          </div>
        )}

        {/* Hint */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-[13px] text-[var(--muted)] font-medium">
                Double-click canvas to add a node
              </p>
              <p className="text-[11px] text-[var(--muted-2)] mt-1">
                or use the toolbar below
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Node editor panel */}
      {selectedNode && (
        <NodePanel
          nodeId={selectedNode.id}
          data={selectedNode.data as NodeData}
          customTags={customTags}
          library={library}
          docs={project.docs}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          customTags={customTags}
          onClose={() => setContextMenu(null)}
          onDelete={handleNodeDelete}
          onDuplicate={handleNodeDuplicate}
          onChangeTag={handleTagChange}
        />
      )}

      {/* Conversation import modal */}
      {showImport && (
        <ConversationImport
          onImport={handleImportNodes}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Custom tag manager */}
      {showTagManager && (
        <CustomTagManager
          customTags={customTags}
          onChange={handleCustomTagsChange}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  icon,
  label,
  active,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium transition-colors",
        active
          ? "bg-[#1A1A1A] text-white"
          : "text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
      )}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

export function MapCanvas(props: MapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
