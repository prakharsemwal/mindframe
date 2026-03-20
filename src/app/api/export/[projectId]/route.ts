import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/storage";
import type { MindMapNode } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const project = await getProject(params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Filter committed nodes only
  const committed = project.nodes.filter(
    (n: MindMapNode) => n.data.tag === "commit"
  );

  // Sort by position: top to bottom, left to right
  committed.sort((a: MindMapNode, b: MindMapNode) => {
    const yDiff = a.position.y - b.position.y;
    if (Math.abs(yDiff) > 50) return yDiff;
    return a.position.x - b.position.x;
  });

  // Build markdown
  const lines: string[] = [
    `# ${project.name} — Decisions`,
    "",
    `> Exported from Mindframe on ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    "",
    "---",
    "",
  ];

  for (const node of committed) {
    const { title, body, annotation } = node.data;
    lines.push(`## ${title}`);
    lines.push("");
    if (body) {
      lines.push(body);
      lines.push("");
    }
    if (annotation) {
      lines.push(`> **Annotation:** ${annotation}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  const markdown = lines.join("\n");
  const filename = `${project.name.toLowerCase().replace(/\s+/g, "-")}-decisions.md`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
