import { NextRequest, NextResponse } from "next/server";
import { listProjects, saveProject, getWorkspace, saveWorkspace } from "@/lib/storage";
import { generateId, now } from "@/lib/utils";
import type { Project } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  const projects = await listProjects(workspaceId);
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const { name, workspaceId } = await req.json();
  if (!name?.trim() || !workspaceId) {
    return NextResponse.json({ error: "Name and workspaceId required" }, { status: 400 });
  }

  const project: Project = {
    id: generateId(),
    name: name.trim(),
    workspaceId,
    createdAt: now(),
    updatedAt: now(),
    nodes: [],
    edges: [],
    docs: [],
    customTags: [],
  };

  await saveProject(project);

  // Add project to workspace
  const workspace = await getWorkspace(workspaceId);
  if (workspace) {
    workspace.projectIds = [...(workspace.projectIds || []), project.id];
    workspace.updatedAt = now();
    await saveWorkspace(workspace);
  }

  return NextResponse.json(project, { status: 201 });
}
