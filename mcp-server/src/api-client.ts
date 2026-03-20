import type { Project, Workspace, MindMapNode, MindMapEdge } from "./types.js";

const BASE_URL = process.env.MINDFRAME_API_URL || "http://localhost:3001";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, `API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// Workspace operations
export async function listWorkspaces(): Promise<Workspace[]> {
  return request<Workspace[]>("/api/workspaces");
}

export async function getWorkspace(id: string): Promise<Workspace> {
  return request<Workspace>(`/api/workspaces/${id}`);
}

export async function createWorkspace(name: string): Promise<Workspace> {
  return request<Workspace>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// Project operations
export async function listProjects(workspaceId: string): Promise<Project[]> {
  return request<Project[]>(`/api/projects?workspaceId=${encodeURIComponent(workspaceId)}`);
}

export async function getProject(id: string): Promise<Project> {
  return request<Project>(`/api/projects/${id}`);
}

export async function createProject(name: string, workspaceId: string): Promise<Project> {
  return request<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name, workspaceId }),
  });
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, "id">>
): Promise<Project> {
  return request<Project>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/projects/${id}`, {
    method: "DELETE",
  });
}

// Helper functions for node/edge operations

export async function addNodeToProject(
  projectId: string,
  node: MindMapNode
): Promise<Project> {
  const project = await getProject(projectId);
  return updateProject(projectId, {
    nodes: [...project.nodes, node],
  });
}

export async function addNodesToProject(
  projectId: string,
  nodes: MindMapNode[]
): Promise<Project> {
  const project = await getProject(projectId);
  return updateProject(projectId, {
    nodes: [...project.nodes, ...nodes],
  });
}

export async function updateNodeInProject(
  projectId: string,
  nodeId: string,
  updates: Partial<MindMapNode["data"]>
): Promise<Project> {
  const project = await getProject(projectId);
  const nodeIndex = project.nodes.findIndex((n) => n.id === nodeId);
  if (nodeIndex === -1) {
    throw new ApiError(404, `Node ${nodeId} not found in project ${projectId}`);
  }

  const updatedNodes = [...project.nodes];
  updatedNodes[nodeIndex] = {
    ...updatedNodes[nodeIndex],
    data: {
      ...updatedNodes[nodeIndex].data,
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  };

  return updateProject(projectId, { nodes: updatedNodes });
}

export async function deleteNodeFromProject(
  projectId: string,
  nodeId: string
): Promise<Project> {
  const project = await getProject(projectId);
  const filteredNodes = project.nodes.filter((n) => n.id !== nodeId);
  const filteredEdges = project.edges.filter(
    (e) => e.source !== nodeId && e.target !== nodeId
  );

  if (filteredNodes.length === project.nodes.length) {
    throw new ApiError(404, `Node ${nodeId} not found in project ${projectId}`);
  }

  return updateProject(projectId, {
    nodes: filteredNodes,
    edges: filteredEdges,
  });
}

export async function addEdgeToProject(
  projectId: string,
  edge: MindMapEdge
): Promise<Project> {
  const project = await getProject(projectId);

  // Validate that source and target nodes exist
  const sourceExists = project.nodes.some((n) => n.id === edge.source);
  const targetExists = project.nodes.some((n) => n.id === edge.target);

  if (!sourceExists) {
    throw new ApiError(404, `Source node ${edge.source} not found`);
  }
  if (!targetExists) {
    throw new ApiError(404, `Target node ${edge.target} not found`);
  }

  return updateProject(projectId, {
    edges: [...project.edges, edge],
  });
}

export async function addEdgesToProject(
  projectId: string,
  edges: MindMapEdge[]
): Promise<Project> {
  const project = await getProject(projectId);

  // Validate all edges
  for (const edge of edges) {
    const sourceExists = project.nodes.some((n) => n.id === edge.source);
    const targetExists = project.nodes.some((n) => n.id === edge.target);

    if (!sourceExists) {
      throw new ApiError(404, `Source node ${edge.source} not found`);
    }
    if (!targetExists) {
      throw new ApiError(404, `Target node ${edge.target} not found`);
    }
  }

  return updateProject(projectId, {
    edges: [...project.edges, ...edges],
  });
}

// Utility functions
export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
