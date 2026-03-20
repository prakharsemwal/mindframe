import { z } from "zod";
import {
  listProjects as apiListProjects,
  getProject as apiGetProject,
  createProject,
} from "../api-client";

export const listProjectsSchema = z.object({
  workspaceId: z.string().describe("The workspace ID to list projects from"),
});

export const getProjectSchema = z.object({
  projectId: z.string().describe("The project ID to retrieve"),
});

export const createProjectSchema = z.object({
  name: z.string().describe("Name for the new project"),
  workspaceId: z.string().describe("The workspace ID to create the project in"),
});

export const searchNodesSchema = z.object({
  projectId: z.string().describe("The project ID to search in"),
  query: z.string().describe("Search query to match against node titles and bodies"),
});

export async function listProjects(args: z.infer<typeof listProjectsSchema>) {
  const projects = await apiListProjects(args.workspaceId);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          projects.map((p) => ({
            id: p.id,
            name: p.name,
            nodeCount: p.nodes.length,
            edgeCount: p.edges.length,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })),
          null,
          2
        ),
      },
    ],
  };
}

export async function getProject(args: z.infer<typeof getProjectSchema>) {
  const project = await apiGetProject(args.projectId);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            id: project.id,
            name: project.name,
            workspaceId: project.workspaceId,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            nodes: project.nodes.map((n) => ({
              id: n.id,
              title: n.data.title,
              body: n.data.body,
              tag: n.data.tag,
              position: n.position,
              createdAt: n.data.createdAt,
              updatedAt: n.data.updatedAt,
            })),
            edges: project.edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function createNewProject(args: z.infer<typeof createProjectSchema>) {
  const project = await createProject(args.name, args.workspaceId);
  return {
    content: [
      {
        type: "text" as const,
        text: `Created project "${project.name}" with ID: ${project.id}`,
      },
    ],
  };
}

export async function searchNodes(args: z.infer<typeof searchNodesSchema>) {
  const project = await apiGetProject(args.projectId);
  const query = args.query.toLowerCase();

  const matchingNodes = project.nodes.filter(
    (n) =>
      n.data.title.toLowerCase().includes(query) ||
      n.data.body.toLowerCase().includes(query)
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            projectId: project.id,
            projectName: project.name,
            query: args.query,
            matchCount: matchingNodes.length,
            nodes: matchingNodes.map((n) => ({
              id: n.id,
              title: n.data.title,
              body: n.data.body,
              tag: n.data.tag,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
