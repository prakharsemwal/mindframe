import { createMcpHandler } from "mcp-handler";

// Import tool schemas and handlers
import {
  listWorkspacesSchema,
  createWorkspaceSchema,
  listWorkspaces,
  createNewWorkspace,
} from "@/lib/mcp/tools/workspaces";

import {
  listProjectsSchema,
  getProjectSchema,
  createProjectSchema,
  searchNodesSchema,
  listProjects,
  getProject,
  createNewProject,
  searchNodes,
} from "@/lib/mcp/tools/projects";

import {
  createNodeSchema,
  createNodesSchema,
  createEdgeSchema,
  updateNodeSchema,
  deleteNodeSchema,
  createNode,
  createNodes,
  createEdge,
  updateNode,
  deleteNode,
} from "@/lib/mcp/tools/nodes";

import {
  importConversationSchema,
  importConversation,
} from "@/lib/mcp/tools/conversation";

const handler = createMcpHandler(
  (server) => {
    // Workspace tools
    server.tool(
      "list_workspaces",
      "Get all workspaces in Mindframe",
      listWorkspacesSchema.shape,
      async () => listWorkspaces()
    );

    server.tool(
      "create_workspace",
      "Create a new workspace",
      createWorkspaceSchema.shape,
      async (args) => createNewWorkspace(args)
    );

    // Project tools
    server.tool(
      "list_projects",
      "Get all projects in a workspace",
      listProjectsSchema.shape,
      async (args) => listProjects(args)
    );

    server.tool(
      "get_project",
      "Get a project with all its nodes and edges. Use this to see the full mind map structure.",
      getProjectSchema.shape,
      async (args) => getProject(args)
    );

    server.tool(
      "create_project",
      "Create a new project in a workspace",
      createProjectSchema.shape,
      async (args) => createNewProject(args)
    );

    server.tool(
      "search_nodes",
      "Search for nodes by text in their title or body",
      searchNodesSchema.shape,
      async (args) => searchNodes(args)
    );

    // Node tools
    server.tool(
      "create_node",
      "Create a single node in a project. Nodes can be tagged as: commit (use this), discard (don't use), hold (park it), or reference.",
      createNodeSchema.shape,
      async (args) => createNode(args)
    );

    server.tool(
      "create_nodes",
      "Create multiple nodes at once. Useful for batch importing ideas or breaking down a topic.",
      createNodesSchema.shape,
      async (args) => createNodes(args)
    );

    server.tool(
      "create_edge",
      "Create a connection between two nodes",
      createEdgeSchema.shape,
      async (args) => createEdge(args)
    );

    server.tool(
      "update_node",
      "Update an existing node's title, body, tag, or background color",
      updateNodeSchema.shape,
      async (args) => updateNode(args)
    );

    server.tool(
      "delete_node",
      "Delete a node from a project (also removes connected edges)",
      deleteNodeSchema.shape,
      async (args) => deleteNode(args)
    );

    // Conversation tools
    server.tool(
      "import_conversation",
      "Parse a conversation or text and create structured nodes. Automatically extracts key points, decisions, questions, and ideas. Tags are auto-assigned based on content type.",
      importConversationSchema.shape,
      async (args) => importConversation(args)
    );
  },
  {
    serverInfo: {
      name: "mindframe",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
