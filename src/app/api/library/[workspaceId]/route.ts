import { NextRequest, NextResponse } from "next/server";
import { getLibrary, saveLibrary } from "@/lib/storage";
import { generateId, now } from "@/lib/utils";
import type { LibraryEntry } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const library = await getLibrary(params.workspaceId);
  return NextResponse.json(library);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const { title, category, body } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const library = await getLibrary(params.workspaceId);

  const entry: LibraryEntry = {
    id: generateId(),
    workspaceId: params.workspaceId,
    title: title.trim(),
    category: category || "General",
    body: body || "",
    createdAt: now(),
    updatedAt: now(),
  };

  library.entries.push(entry);
  if (category && !library.categories.includes(category)) {
    library.categories.push(category);
  }

  await saveLibrary(library);
  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const library = await req.json();
  library.workspaceId = params.workspaceId;
  await saveLibrary(library);
  return NextResponse.json(library);
}
