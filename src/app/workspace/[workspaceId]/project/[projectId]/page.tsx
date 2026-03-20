"use client";

import { useEffect, useState, useCallback } from "react";
import { Map as MapIcon, FileText } from "lucide-react";
import { cn, generateId, now } from "@/lib/utils";
import { MapCanvas } from "@/components/map/MapCanvas";
import { DocViewer } from "@/components/docs/DocViewer";
import type {
  Project,
  MindMapNode,
  MindMapEdge,
  CustomTag,
  Library,
  ImportedDoc,
} from "@/types";

interface ProjectPageProps {
  params: { workspaceId: string; projectId: string };
}

type ActiveTab = "map" | "docs";

export default function ProjectPage({ params }: ProjectPageProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [library, setLibrary] = useState<Library | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<ActiveTab>("map");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.projectId}`).then((r) => r.json()),
      fetch(`/api/library/${params.workspaceId}`).then((r) => r.json()),
    ]).then(([proj, lib]) => {
      setProject(proj);
      setLibrary(lib);
      setLoading(false);
    });
  }, [params.projectId, params.workspaceId]);

  const handleMapSave = useCallback(
    async (
      nodes: MindMapNode[],
      edges: MindMapEdge[],
      customTags?: CustomTag[]
    ) => {
      if (!project) return;
      setSaveStatus("saving");
      const updated = {
        ...project,
        nodes,
        edges,
        customTags: customTags || project.customTags,
      };
      await fetch(`/api/projects/${params.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      setProject(updated);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    },
    [project, params.projectId]
  );

  const handleExport = useCallback(async () => {
    const res = await fetch(`/api/export/${params.projectId}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition") || "";
    const filename =
      disposition.match(/filename="(.+)"/)?.[1] || "decisions.md";
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [params.projectId]);

  const handleDocImport = useCallback(async (file: File): Promise<ImportedDoc> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", params.projectId);
    const res = await fetch("/api/docs", {
      method: "POST",
      body: formData,
    });
    const doc: ImportedDoc = await res.json();
    setProject((p) => p ? { ...p, docs: [...(p.docs || []), doc] } : p);
    return doc;
  }, [params.projectId]);

  const handleDocDelete = useCallback(async (docId: string) => {
    await fetch(`/api/docs/${docId}`, { method: "DELETE" });
    setProject((p) =>
      p ? { ...p, docs: (p.docs || []).filter((d) => d.id !== docId) } : p
    );
    if (project) {
      await fetch(`/api/projects/${params.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...project,
          docs: (project.docs || []).filter((d) => d.id !== docId),
        }),
      });
    }
  }, [project, params.projectId]);

  const handleSendToMap = useCallback(
    (partialNode: Partial<MindMapNode>) => {
      if (!project) return;
      const newNode: MindMapNode = {
        id: generateId(),
        type: "mindmap",
        position: {
          x: 200 + Math.random() * 400,
          y: 200 + Math.random() * 200,
        },
        data: {
          title: "From doc",
          body: "",
          tag: "hold",
          ...partialNode.data,
          createdAt: now(),
          updatedAt: now(),
        },
      };
      const updatedNodes = [...(project.nodes || []), newNode];
      setProject((p) => p ? { ...p, nodes: updatedNodes } : p);
      handleMapSave(updatedNodes, project.edges || [], project.customTags);
      setActiveTab("map");
    },
    [project, handleMapSave]
  );

  if (loading || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[#1A1A1A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-4">
          <h1 className="text-[13px] font-semibold text-[var(--ink)] tracking-tight">
            {project.name}
          </h1>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("map")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
                activeTab === "map"
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink-2)]"
              )}
            >
              <MapIcon size={12} />
              Map
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
                activeTab === "docs"
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink-2)]"
              )}
            >
              <FileText size={12} />
              Docs
              {(project.docs || []).length > 0 && (
                <span className="text-[10px] bg-[var(--surface-3)] text-[var(--muted)] px-1.5 py-0.5 rounded-full font-medium">
                  {project.docs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Save status + meta */}
        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
              <span className="w-3 h-3 border border-[var(--border-2)] border-t-[var(--muted)] rounded-full animate-spin inline-block" />
              Saving
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[11px] text-[#2D6A4F] font-medium">Saved</span>
          )}
          <span className="text-[11px] text-[var(--muted-2)] tabular-nums">
            {project.nodes?.length || 0} nodes
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "map" && (
          <MapCanvas
            project={project}
            library={library}
            onSave={handleMapSave}
            onExport={handleExport}
          />
        )}
        {activeTab === "docs" && (
          <DocViewer
            projectId={params.projectId}
            docs={project.docs || []}
            onDocImport={handleDocImport}
            onDocDelete={handleDocDelete}
            onSendToMap={handleSendToMap}
          />
        )}
      </div>
    </div>
  );
}
