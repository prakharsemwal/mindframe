import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  saveProject,
  deleteProject,
  getWorkspace,
  saveWorkspace,
} from "@/lib/storage";
import { now } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = { ...project, ...body, id: params.id, updatedAt: now() };
  await saveProject(updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await getProject(params.id);
  if (project) {
    // Remove from workspace
    const workspace = await getWorkspace(project.workspaceId);
    if (workspace) {
      workspace.projectIds = workspace.projectIds.filter(
        (id) => id !== params.id
      );
      workspace.updatedAt = now();
      await saveWorkspace(workspace);
    }
  }

  await deleteProject(params.id);
  return NextResponse.json({ ok: true });
}
