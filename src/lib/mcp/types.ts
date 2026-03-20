// Types mirrored from Mindframe's src/types/index.ts

export type TagBucket = "commit" | "discard" | "hold" | "reference";

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
  tag: string;
  bgColor?: string;
  annotation?: string;
  linkedDocId?: string;
  linkedDocSection?: string;
  linkedLibraryEntryId?: string;
  imageUrl?: string;
  isDraft?: boolean;
  source?: "conversation" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ImportedDoc {
  id: string;
  filename: string;
  title: string;
  importedAt: string;
}

export interface CustomTag {
  id: string;
  label: string;
  bucket: TagBucket;
  isCustom: true;
}

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

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  projectIds: string[];
}

// Input types for MCP tools

export interface CreateNodeInput {
  title: string;
  body: string;
  tag?: TagBucket;
  position?: { x: number; y: number };
}

export interface UpdateNodeInput {
  title?: string;
  body?: string;
  tag?: string;
  bgColor?: string;
}

export interface CreateEdgeInput {
  sourceId: string;
  targetId: string;
}

export interface ConversationNode {
  title: string;
  body: string;
  tag: TagBucket;
  relatedTo?: string[];
}
