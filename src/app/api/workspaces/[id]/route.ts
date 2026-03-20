import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspace,
  saveWorkspace,
  deleteWorkspace,
  listProjects,
  deleteProject,
} from "@/lib/storage";
import { now } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspace = await getWorkspace(params.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workspace);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspace = await getWorkspace(params.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = { ...workspace, ...body, id: params.id, updatedAt: now() };
  await saveWorkspace(updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Delete all projects first
  const projects = await listProjects(params.id);
  await Promise.all(projects.map((p) => deleteProject(p.id)));

  await deleteWorkspace(params.id);
  return NextResponse.json({ ok: true });
}
