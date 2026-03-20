import { z } from "zod";
import type { MindMapNode, MindMapEdge, TagBucket } from "../types.js";
import {
  addNodeToProject,
  addNodesToProject,
  updateNodeInProject,
  deleteNodeFromProject,
  addEdgeToProject,
  generateId,
  now,
  getProject,
} from "../api-client.js";

const tagBucketSchema = z.enum(["commit", "discard", "hold", "reference"]);

const positionSchema = z.object({
  x: z.number().describe("X coordinate on the canvas"),
  y: z.number().describe("Y coordinate on the canvas"),
});

export const createNodeSchema = z.object({
  projectId: z.string().describe("The project ID to add the node to"),
  title: z.string().describe("Title of the node"),
  body: z.string().describe("Body content of the node (supports markdown)"),
  tag: tagBucketSchema
    .optional()
    .default("hold")
    .describe("Tag for the node: commit (use this), discard (don't use), hold (park it), or reference"),
  position: positionSchema
    .optional()
    .describe("Position on the canvas. If not provided, will auto-position"),
});

const nodeInputSchema = z.object({
  title: z.string().describe("Title of the node"),
  body: z.string().describe("Body content of the node"),
  tag: tagBucketSchema.optional().default("hold").describe("Tag for the node"),
});

export const createNodesSchema = z.object({
  projectId: z.string().describe("The project ID to add nodes to"),
  nodes: z.array(nodeInputSchema).describe("Array of nodes to create"),
});

export const createEdgeSchema = z.object({
  projectId: z.string().describe("The project ID"),
  sourceId: z.string().describe("ID of the source node"),
  targetId: z.string().describe("ID of the target node"),
});

export const updateNodeSchema = z.object({
  projectId: z.string().describe("The project ID"),
  nodeId: z.string().describe("ID of the node to update"),
  title: z.string().optional().describe("New title for the node"),
  body: z.string().optional().describe("New body content for the node"),
  tag: tagBucketSchema.optional().describe("New tag for the node"),
  bgColor: z.string().optional().describe("Background color in hex format (e.g., #FFFFFF)"),
});

export const deleteNodeSchema = z.object({
  projectId: z.string().describe("The project ID"),
  nodeId: z.string().describe("ID of the node to delete"),
});

function calculateNextPosition(existingNodes: MindMapNode[]): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 100, y: 100 };
  }

  // Find the rightmost node and place new node to its right
  const rightmostNode = existingNodes.reduce((max, node) =>
    node.position.x > max.position.x ? node : max
  );

  return {
    x: rightmostNode.position.x + 300,
    y: rightmostNode.position.y,
  };
}

function calculateGridPositions(
  count: number,
  existingNodes: MindMapNode[],
  startX = 100,
  startY = 100
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const nodeWidth = 280;
  const nodeHeight = 180;
  const gap = 40;
  const columns = 3;

  // If there are existing nodes, start below them
  if (existingNodes.length > 0) {
    const maxY = Math.max(...existingNodes.map((n) => n.position.y));
    startY = maxY + nodeHeight + gap * 2;
  }

  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    positions.push({
      x: startX + col * (nodeWidth + gap),
      y: startY + row * (nodeHeight + gap),
    });
  }

  return positions;
}

export async function createNode(args: z.infer<typeof createNodeSchema>) {
  const project = await getProject(args.projectId);
  const position = args.position || calculateNextPosition(project.nodes);
  const timestamp = now();

  const node: MindMapNode = {
    id: generateId(),
    type: "mindmap",
    position,
    data: {
      title: args.title,
      body: args.body,
      tag: args.tag || "hold",
      source: "conversation",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  await addNodeToProject(args.projectId, node);

  return {
    content: [
      {
        type: "text" as const,
        text: `Created node "${args.title}" with ID: ${node.id} in project ${args.projectId}`,
      },
    ],
  };
}

export async function createNodes(args: z.infer<typeof createNodesSchema>) {
  const project = await getProject(args.projectId);
  const positions = calculateGridPositions(args.nodes.length, project.nodes);
  const timestamp = now();

  const nodes: MindMapNode[] = args.nodes.map((nodeInput, index) => ({
    id: generateId(),
    type: "mindmap" as const,
    position: positions[index],
    data: {
      title: nodeInput.title,
      body: nodeInput.body,
      tag: nodeInput.tag || "hold",
      source: "conversation" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  }));

  await addNodesToProject(args.projectId, nodes);

  return {
    content: [
      {
        type: "text" as const,
        text: `Created ${nodes.length} nodes in project ${args.projectId}:\n${nodes
          .map((n) => `- "${n.data.title}" (ID: ${n.id})`)
          .join("\n")}`,
      },
    ],
  };
}

export async function createEdge(args: z.infer<typeof createEdgeSchema>) {
  const edge: MindMapEdge = {
    id: generateId(),
    source: args.sourceId,
    target: args.targetId,
  };

  await addEdgeToProject(args.projectId, edge);

  return {
    content: [
      {
        type: "text" as const,
        text: `Created edge from ${args.sourceId} to ${args.targetId} (ID: ${edge.id})`,
      },
    ],
  };
}

export async function updateNode(args: z.infer<typeof updateNodeSchema>) {
  const updates: Record<string, unknown> = {};
  if (args.title !== undefined) updates.title = args.title;
  if (args.body !== undefined) updates.body = args.body;
  if (args.tag !== undefined) updates.tag = args.tag;
  if (args.bgColor !== undefined) updates.bgColor = args.bgColor;

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No updates provided",
        },
      ],
    };
  }

  await updateNodeInProject(args.projectId, args.nodeId, updates);

  return {
    content: [
      {
        type: "text" as const,
        text: `Updated node ${args.nodeId}: ${Object.keys(updates).join(", ")}`,
      },
    ],
  };
}

export async function deleteNode(args: z.infer<typeof deleteNodeSchema>) {
  await deleteNodeFromProject(args.projectId, args.nodeId);

  return {
    content: [
      {
        type: "text" as const,
        text: `Deleted node ${args.nodeId} from project ${args.projectId}`,
      },
    ],
  };
}
