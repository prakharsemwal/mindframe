import { z } from "zod";
import { listWorkspaces as apiListWorkspaces, createWorkspace } from "../api-client.js";

export const listWorkspacesSchema = z.object({});

export const createWorkspaceSchema = z.object({
  name: z.string().describe("Name for the new workspace"),
});

export async function listWorkspaces() {
  const workspaces = await apiListWorkspaces();
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          workspaces.map((w) => ({
            id: w.id,
            name: w.name,
            projectCount: w.projectIds.length,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
          })),
          null,
          2
        ),
      },
    ],
  };
}

export async function createNewWorkspace(args: z.infer<typeof createWorkspaceSchema>) {
  const workspace = await createWorkspace(args.name);
  return {
    content: [
      {
        type: "text" as const,
        text: `Created workspace "${workspace.name}" with ID: ${workspace.id}`,
      },
    ],
  };
}
