import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getImage } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filename = params.path.join("/");

  try {
    const data = await getImage(filename);

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": contentType } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
