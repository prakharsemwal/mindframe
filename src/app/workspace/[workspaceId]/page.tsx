"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Map, BookOpen, Plus, ArrowRight, Check, X } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import type { Workspace, Project } from "@/types";

interface WorkspacePageProps {
  params: { workspaceId: string };
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/workspaces/${params.workspaceId}`).then((r) => r.json()),
      fetch(`/api/projects?workspaceId=${params.workspaceId}`).then((r) => r.json()),
    ]).then(([ws, projs]) => {
      setWorkspace(ws);
      setProjects(projs);
      setLoading(false);
    });
  }, [params.workspaceId]);

  useEffect(() => {
    if (showNewProject) {
      inputRef.current?.focus();
    }
  }, [showNewProject]);

  async function createProject() {
    if (!newProjectName.trim() || creating) return;
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim(), workspaceId: params.workspaceId }),
    });
    const project = await res.json();
    router.push(`/workspace/${params.workspaceId}/project/${project.id}`);
  }

  function openNewProjectForm() {
    setShowNewProject(true);
    setNewProjectName("");
  }

  function cancelNewProject() {
    setShowNewProject(false);
    setNewProjectName("");
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-[var(--border)] border-t-[var(--ink)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-10 py-10 max-w-4xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[26px] font-semibold text-[var(--ink)] tracking-tight mb-1">
          {workspace?.name}
        </h1>
        <p className="text-[13px] text-[var(--muted)]">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Projects section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[12px] font-semibold text-[var(--ink-3)] tracking-wide">
            Projects
          </h2>
          {!showNewProject && (
            <button
              onClick={openNewProjectForm}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              <Plus size={13} />
              New project
            </button>
          )}
        </div>

        {/* Inline new project form */}
        {showNewProject && (
          <div className="mb-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-2">
            <input
              ref={inputRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createProject();
                if (e.key === "Escape") cancelNewProject();
              }}
              placeholder="Project name..."
              className="flex-1 text-[13px] bg-transparent outline-none text-[var(--ink)] placeholder:text-[var(--muted-2)]"
            />
            <button
              onClick={createProject}
              disabled={!newProjectName.trim() || creating}
              className="flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-fg)] text-[12px] font-medium px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              <Check size={12} />
              Create
            </button>
            <button
              onClick={cancelNewProject}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {projects.length === 0 && !showNewProject ? (
          <button
            onClick={openNewProjectForm}
            className="w-full border-2 border-dashed border-[var(--border)] rounded-xl py-12 flex flex-col items-center gap-2.5 hover:border-[var(--border-2)] hover:bg-[var(--surface)] transition-all group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] flex items-center justify-center transition-colors">
              <Plus size={18} className="text-[var(--muted)]" />
            </div>
            <span className="text-[13px] text-[var(--muted)] group-hover:text-[var(--ink-2)] transition-colors">
              Create your first project
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() =>
                  router.push(
                    `/workspace/${params.workspaceId}/project/${project.id}`
                  )
                }
                className="text-left bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-2)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-8 h-8 bg-[var(--surface-2)] rounded-lg flex items-center justify-center group-hover:bg-[var(--surface-3)] transition-colors">
                    <Map size={15} className="text-[var(--muted)]" />
                  </div>
                  <ArrowRight
                    size={13}
                    className="text-[var(--muted-3)] group-hover:text-[var(--ink-3)] group-hover:translate-x-0.5 transition-all mt-1"
                  />
                </div>
                <h3 className="text-[13px] font-medium text-[var(--ink)] mb-2 leading-snug">
                  {project.name}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[var(--muted)] tabular-nums">
                    {project.nodes?.length || 0} nodes
                  </span>
                  <span className="text-[var(--muted-2)]">·</span>
                  <span className="text-[11px] text-[var(--muted-2)]">
                    {formatRelativeDate(project.updatedAt)}
                  </span>
                </div>
              </button>
            ))}

            {/* Add project card */}
            {!showNewProject && (
              <button
                onClick={openNewProjectForm}
                className="text-left border-2 border-dashed border-[var(--border)] rounded-xl p-5 flex flex-col items-center justify-center hover:border-[var(--border-2)] hover:bg-[var(--surface)] transition-all group min-h-[120px] cursor-pointer"
              >
                <Plus size={16} className="text-[var(--muted-3)] group-hover:text-[var(--muted)] mb-1.5 transition-colors" />
                <span className="text-[12px] text-[var(--muted-2)] group-hover:text-[var(--muted)] transition-colors">
                  New project
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Library link */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[12px] font-semibold text-[var(--ink-3)] tracking-wide">
            Knowledge Library
          </h2>
        </div>
        <button
          onClick={() =>
            router.push(`/workspace/${params.workspaceId}/library`)
          }
          className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-2)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all group flex items-center gap-4 cursor-pointer"
        >
          <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl flex items-center justify-center group-hover:bg-[var(--surface-3)] transition-colors flex-shrink-0">
            <BookOpen size={18} className="text-[var(--muted)]" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--ink)] mb-0.5">
              {workspace?.name} Library
            </p>
            <p className="text-[12px] text-[var(--muted)]">
              Business logic, design rules, constraints
            </p>
          </div>
          <ArrowRight
            size={13}
            className="text-[var(--muted-3)] group-hover:text-[var(--ink-3)] group-hover:translate-x-0.5 transition-all"
          />
        </button>
      </div>
    </div>
  );
}
