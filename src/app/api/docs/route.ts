import { NextRequest, NextResponse } from "next/server";
import { saveDoc, getProject, saveProject } from "@/lib/storage";
import { generateId, now } from "@/lib/utils";
import type { ImportedDoc } from "@/types";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string;

  if (!file || !projectId) {
    return NextResponse.json({ error: "File and projectId required" }, { status: 400 });
  }

  const content = await file.text();
  const docId = generateId();

  await saveDoc(docId, content);

  // Register doc in project
  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const importedDoc: ImportedDoc = {
    id: docId,
    filename: file.name,
    title: file.name.replace(/\.md$/, ""),
    importedAt: now(),
  };

  project.docs = [...(project.docs || []), importedDoc];
  project.updatedAt = now();
  await saveProject(project);

  return NextResponse.json(importedDoc, { status: 201 });
}
