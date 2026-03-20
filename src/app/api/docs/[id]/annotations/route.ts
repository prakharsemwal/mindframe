import { NextRequest, NextResponse } from "next/server";
import { getAnnotations, saveAnnotations } from "@/lib/storage";
import type { DocAnnotations } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const annotations = await getAnnotations(params.id);
  return NextResponse.json(
    annotations || { docId: params.id, projectId: "", annotations: [] }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json() as DocAnnotations;
  body.docId = params.id;
  await saveAnnotations(body);
  return NextResponse.json(body);
}
