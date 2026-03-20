import { z } from "zod";
import type { MindMapNode, MindMapEdge, TagBucket, ConversationNode } from "../types.js";
import {
  addNodesToProject,
  addEdgesToProject,
  generateId,
  now,
  getProject,
} from "../api-client.js";

export const importConversationSchema = z.object({
  projectId: z.string().describe("The project ID to import the conversation into"),
  conversation: z.string().describe("The conversation text to parse and import"),
  context: z
    .string()
    .optional()
    .describe(
      "Optional context to guide parsing (e.g., 'focus on action items', 'extract key decisions')"
    ),
});

const conversationNodeSchema = z.object({
  title: z.string(),
  body: z.string(),
  tag: z.enum(["commit", "discard", "hold", "reference"]),
  relatedTo: z.array(z.string()).optional(),
});

export const parseConversationSchema = z.object({
  nodes: z.array(conversationNodeSchema),
});

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

// Simple heuristic-based parsing when Claude isn't doing the parsing
function parseConversationText(text: string, context?: string): ConversationNode[] {
  const nodes: ConversationNode[] = [];

  // Split by bullet points, numbered lists, or paragraphs
  const lines = text.split(/\n/).filter((line) => line.trim());

  // Patterns for different types of content
  const decisionPatterns = [
    /^(?:decision|decided|we will|let's|going to|should|must|need to)/i,
    /^[-*]\s*(?:decision|decided)/i,
  ];

  const questionPatterns = [
    /\?$/,
    /^(?:question|how|what|why|when|where|who|should we)/i,
  ];

  const rejectedPatterns = [
    /^(?:rejected|not|don't|won't|can't|shouldn't|ruled out|discarded)/i,
    /^[-*]\s*(?:rejected|not using|don't)/i,
  ];

  const referencePatterns = [
    /^(?:note|reference|see also|related|fyi|context)/i,
    /^[-*]\s*(?:note|reference)/i,
  ];

  // Process bullet points and list items
  const bulletPattern = /^[-*•]\s*(.+)$/;
  const numberedPattern = /^\d+[.)]\s*(.+)$/;

  for (const line of lines) {
    let content = line.trim();
    let match = content.match(bulletPattern) || content.match(numberedPattern);
    if (match) {
      content = match[1];
    }

    if (content.length < 10) continue;

    // Determine tag based on content
    let tag: TagBucket = "hold";

    if (decisionPatterns.some((p) => p.test(content))) {
      tag = "commit";
    } else if (questionPatterns.some((p) => p.test(content))) {
      tag = "hold";
    } else if (rejectedPatterns.some((p) => p.test(content))) {
      tag = "discard";
    } else if (referencePatterns.some((p) => p.test(content))) {
      tag = "reference";
    }

    // Apply context-based adjustments
    if (context) {
      const contextLower = context.toLowerCase();
      if (contextLower.includes("action") || contextLower.includes("todo")) {
        // For action items context, treat most things as commits
        if (tag === "hold") tag = "commit";
      } else if (contextLower.includes("decision")) {
        // For decisions context, be more selective about commits
        if (!decisionPatterns.some((p) => p.test(content))) {
          tag = "hold";
        }
      }
    }

    // Create title from first few words
    const words = content.split(/\s+/);
    const title = words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "");

    nodes.push({
      title,
      body: content,
      tag,
    });
  }

  return nodes;
}

export async function importConversation(args: z.infer<typeof importConversationSchema>) {
  const project = await getProject(args.projectId);

  // Parse the conversation into nodes
  const parsedNodes = parseConversationText(args.conversation, args.context);

  if (parsedNodes.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No extractable content found in the conversation. Try providing more structured text with bullet points or clear statements.",
        },
      ],
    };
  }

  const positions = calculateGridPositions(parsedNodes.length, project.nodes);
  const timestamp = now();

  // Create nodes with IDs for edge creation
  const nodeIdMap = new Map<string, string>();
  const nodes: MindMapNode[] = parsedNodes.map((parsed, index) => {
    const id = generateId();
    nodeIdMap.set(parsed.title, id);
    return {
      id,
      type: "mindmap" as const,
      position: positions[index],
      data: {
        title: parsed.title,
        body: parsed.body,
        tag: parsed.tag,
        source: "conversation" as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };
  });

  // Create edges for related nodes
  const edges: MindMapEdge[] = [];
  parsedNodes.forEach((parsed, index) => {
    if (parsed.relatedTo) {
      const sourceId = nodes[index].id;
      for (const relatedTitle of parsed.relatedTo) {
        const targetId = nodeIdMap.get(relatedTitle);
        if (targetId && targetId !== sourceId) {
          edges.push({
            id: generateId(),
            source: sourceId,
            target: targetId,
          });
        }
      }
    }
  });

  await addNodesToProject(args.projectId, nodes);

  if (edges.length > 0) {
    await addEdgesToProject(args.projectId, edges);
  }

  // Group nodes by tag for summary
  const byTag = nodes.reduce(
    (acc, node) => {
      const tag = node.data.tag;
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(node.data.title);
      return acc;
    },
    {} as Record<string, string[]>
  );

  const summary = Object.entries(byTag)
    .map(([tag, titles]) => `${tag}: ${titles.length} nodes`)
    .join(", ");

  return {
    content: [
      {
        type: "text" as const,
        text: `Imported ${nodes.length} nodes into project ${args.projectId}:\n${summary}\n\nNodes created:\n${nodes
          .map((n) => `- "${n.data.title}" [${n.data.tag}] (ID: ${n.id})`)
          .join("\n")}${edges.length > 0 ? `\n\nCreated ${edges.length} edges between related nodes.` : ""}`,
      },
    ],
  };
}
