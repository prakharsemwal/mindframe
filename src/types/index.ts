// ─── Core Types ─────────────────────────────────────────────────────────────

export type TagBucket = "commit" | "discard" | "hold" | "reference";

export interface CoreTag {
  id: TagBucket;
  label: string;
  bucket: TagBucket;
  isCustom: false;
}

export interface CustomTag {
  id: string;
  label: string;
  bucket: TagBucket;
  isCustom: true;
}

export type Tag = CoreTag | CustomTag;

export const CORE_TAGS: CoreTag[] = [
  { id: "commit", label: "Use this", bucket: "commit", isCustom: false },
  { id: "discard", label: "Don't use", bucket: "discard", isCustom: false },
  { id: "hold", label: "Park it", bucket: "hold", isCustom: false },
  { id: "reference", label: "Reference", bucket: "reference", isCustom: false },
];

// ─── Node Types ──────────────────────────────────────────────────────────────

export interface TextHighlight {
  id: string;
  start: number;
  end: number;
  color: "yellow" | "green" | "blue" | "pink" | "orange";
  field: "title" | "body";
}

export interface MindMapNode {
  id: string;
  type: "mindmap";
  position: { x: number; y: number };
  style?: Record<string, unknown>;
  data: NodeData;
}

export interface NodeData {
  title: string;
  body: string;
  tag: string; // tag id
  bgColor?: string; // custom node background colour (default: #FFFFFF)
  annotation?: string;
  linkedDocId?: string;
  linkedDocSection?: string;
  linkedLibraryEntryId?: string;
  imageUrl?: string;
  isDraft?: boolean;
  source?: "conversation" | "manual";
  highlights?: TextHighlight[];
  createdAt: string;
  updatedAt: string;
  // Callback for inline editing (passed through from canvas)
  onUpdate?: (nodeId: string, data: Partial<NodeData>) => void;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// ─── Project Types ───────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  docs: ImportedDoc[];
  customTags?: CustomTag[];
}

export interface ImportedDoc {
  id: string;
  filename: string;
  title: string;
  importedAt: string;
}

// ─── Workspace Types ─────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  projectIds: string[];
}

// ─── Knowledge Library Types ─────────────────────────────────────────────────

export interface LibraryEntry {
  id: string;
  workspaceId: string;
  title: string;
  category: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Library {
  workspaceId: string;
  entries: LibraryEntry[];
  categories: string[];
}

// ─── Annotation Types ────────────────────────────────────────────────────────

export interface Annotation {
  id: string;
  docId: string;
  projectId: string;
  selectionText: string;
  startOffset: number;
  endOffset: number;
  paragraphIndex: number;
  note: string;
  createdAt: string;
}

export interface DocAnnotations {
  docId: string;
  projectId: string;
  annotations: Annotation[];
}

// ─── Draft Node (conversation import) ────────────────────────────────────────

export interface DraftNode {
  id: string;
  title: string;
  body: string;
  fullText: string;
  selected: boolean;
}
