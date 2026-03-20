#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tool implementations
import {
  listWorkspaces,
  listWorkspacesSchema,
  createNewWorkspace,
  createWorkspaceSchema,
} from "./tools/workspaces.js";

import {
  listProjects,
  listProjectsSchema,
  getProject,
  getProjectSchema,
  createNewProject,
  createProjectSchema,
  searchNodes,
  searchNodesSchema,
} from "./tools/projects.js";

import {
  createNode,
  createNodeSchema,
  createNodes,
  createNodesSchema,
  createEdge,
  createEdgeSchema,
  updateNode,
  updateNodeSchema,
  deleteNode,
  deleteNodeSchema,
} from "./tools/nodes.js";

import {
  importConversation,
  importConversationSchema,
} from "./tools/conversation.js";

// Create MCP server
const server = new Server(
  {
    name: "mindframe",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all available tools
const tools = [
  // Workspace tools
  {
    name: "list_workspaces",
    description: "Get all workspaces in Mindframe",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "create_workspace",
    description: "Create a new workspace",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Name for the new workspace",
        },
      },
      required: ["name"],
    },
  },

  // Project tools
  {
    name: "list_projects",
    description: "Get all projects in a workspace",
    inputSchema: {
      type: "object" as const,
      properties: {
        workspaceId: {
          type: "string",
          description: "The workspace ID to list projects from",
        },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "get_project",
    description:
      "Get a project with all its nodes and edges. Use this to see the full mind map structure.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to retrieve",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "create_project",
    description: "Create a new project in a workspace",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Name for the new project",
        },
        workspaceId: {
          type: "string",
          description: "The workspace ID to create the project in",
        },
      },
      required: ["name", "workspaceId"],
    },
  },
  {
    name: "search_nodes",
    description: "Search for nodes by text in their title or body",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to search in",
        },
        query: {
          type: "string",
          description: "Search query to match against node titles and bodies",
        },
      },
      required: ["projectId", "query"],
    },
  },

  // Node tools
  {
    name: "create_node",
    description:
      "Create a single node in a project. Nodes can be tagged as: commit (use this), discard (don't use), hold (park it), or reference.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to add the node to",
        },
        title: {
          type: "string",
          description: "Title of the node",
        },
        body: {
          type: "string",
          description: "Body content of the node (supports markdown)",
        },
        tag: {
          type: "string",
          enum: ["commit", "discard", "hold", "reference"],
          description:
            "Tag for the node: commit (use this), discard (don't use), hold (park it), or reference. Defaults to hold.",
        },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X coordinate" },
            y: { type: "number", description: "Y coordinate" },
          },
          description: "Position on the canvas. Auto-positioned if not provided.",
        },
      },
      required: ["projectId", "title", "body"],
    },
  },
  {
    name: "create_nodes",
    description:
      "Create multiple nodes at once. Useful for batch importing ideas or breaking down a topic.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to add nodes to",
        },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Title of the node" },
              body: { type: "string", description: "Body content of the node" },
              tag: {
                type: "string",
                enum: ["commit", "discard", "hold", "reference"],
                description: "Tag for the node",
              },
            },
            required: ["title", "body"],
          },
          description: "Array of nodes to create",
        },
      },
      required: ["projectId", "nodes"],
    },
  },
  {
    name: "create_edge",
    description: "Create a connection between two nodes",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID",
        },
        sourceId: {
          type: "string",
          description: "ID of the source node",
        },
        targetId: {
          type: "string",
          description: "ID of the target node",
        },
      },
      required: ["projectId", "sourceId", "targetId"],
    },
  },
  {
    name: "update_node",
    description: "Update an existing node's title, body, tag, or background color",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID",
        },
        nodeId: {
          type: "string",
          description: "ID of the node to update",
        },
        title: {
          type: "string",
          description: "New title for the node",
        },
        body: {
          type: "string",
          description: "New body content for the node",
        },
        tag: {
          type: "string",
          enum: ["commit", "discard", "hold", "reference"],
          description: "New tag for the node",
        },
        bgColor: {
          type: "string",
          description: "Background color in hex format (e.g., #FFFFFF)",
        },
      },
      required: ["projectId", "nodeId"],
    },
  },
  {
    name: "delete_node",
    description: "Delete a node from a project (also removes connected edges)",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID",
        },
        nodeId: {
          type: "string",
          description: "ID of the node to delete",
        },
      },
      required: ["projectId", "nodeId"],
    },
  },

  // Conversation import tool
  {
    name: "import_conversation",
    description:
      "Parse a conversation or text and create structured nodes. Automatically extracts key points, decisions, questions, and ideas. Tags are auto-assigned based on content type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to import the conversation into",
        },
        conversation: {
          type: "string",
          description: "The conversation text or bullet points to parse and import",
        },
        context: {
          type: "string",
          description:
            "Optional context to guide parsing (e.g., 'focus on action items', 'extract key decisions')",
        },
      },
      required: ["projectId", "conversation"],
    },
  },
];

// Handle list_tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle call_tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Workspace tools
      case "list_workspaces":
        return await listWorkspaces();
      case "create_workspace":
        return await createNewWorkspace(createWorkspaceSchema.parse(args));

      // Project tools
      case "list_projects":
        return await listProjects(listProjectsSchema.parse(args));
      case "get_project":
        return await getProject(getProjectSchema.parse(args));
      case "create_project":
        return await createNewProject(createProjectSchema.parse(args));
      case "search_nodes":
        return await searchNodes(searchNodesSchema.parse(args));

      // Node tools
      case "create_node":
        return await createNode(createNodeSchema.parse(args));
      case "create_nodes":
        return await createNodes(createNodesSchema.parse(args));
      case "create_edge":
        return await createEdge(createEdgeSchema.parse(args));
      case "update_node":
        return await updateNode(updateNodeSchema.parse(args));
      case "delete_node":
        return await deleteNode(deleteNodeSchema.parse(args));

      // Conversation import
      case "import_conversation":
        return await importConversation(importConversationSchema.parse(args));

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mindframe MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
