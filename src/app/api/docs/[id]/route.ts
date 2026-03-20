import { NextRequest, NextResponse } from "next/server";
import { getDoc, getAnnotations, saveAnnotations, deleteDoc } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const content = await getDoc(params.id);
  if (content === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ content });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await deleteDoc(params.id);
  return NextResponse.json({ ok: true });
}
