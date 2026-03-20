import { NextRequest, NextResponse } from "next/server";
import { listWorkspaces, saveWorkspace } from "@/lib/storage";
import { generateId, now } from "@/lib/utils";
import type { Workspace } from "@/types";

export async function GET() {
  const workspaces = await listWorkspaces();
  return NextResponse.json(workspaces);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const workspace: Workspace = {
    id: generateId(),
    name: name.trim(),
    createdAt: now(),
    updatedAt: now(),
    projectIds: [],
  };

  await saveWorkspace(workspace);
  return NextResponse.json(workspace, { status: 201 });
}
