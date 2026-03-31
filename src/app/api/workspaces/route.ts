import { NextRequest, NextResponse } from "next/server";
import { listWorkspaces, saveWorkspace } from "@/lib/storage";
import { generateId, now } from "@/lib/utils";
import type { Workspace } from "@/types";

export async function GET() {
  try {
    const workspaces = await listWorkspaces();
    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("GET /api/workspaces error:", error);
    return NextResponse.json(
      { error: "Failed to list workspaces", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    console.error("POST /api/workspaces error:", error);
    return NextResponse.json(
      { error: "Failed to create workspace", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
