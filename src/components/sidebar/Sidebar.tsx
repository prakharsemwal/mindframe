"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Map,
  BookOpen,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { Workspace, Project } from "@/types";

interface SidebarProps {
  workspaces: Workspace[];
  projects: Record<string, Project[]>;
  activeWorkspaceId?: string;
  activeProjectId?: string;
  onCreateWorkspace: (name: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onCreateProject: (workspaceId: string, name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

export function Sidebar({
  workspaces,
  projects,
  activeWorkspaceId,
  activeProjectId,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(
    new Set(activeWorkspaceId ? [activeWorkspaceId] : [])
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newProjectNames, setNewProjectNames] = useState<Record<string, string>>({});
  const [showNewProject, setShowNewProject] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{
    type: "workspace" | "project";
    id: string;
    value: string;
  } | null>(null);

  function toggleWorkspace(id: string) {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitNewWorkspace() {
    if (newWorkspaceName.trim()) {
      onCreateWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName("");
      setShowNewWorkspace(false);
    }
  }

  function submitNewProject(workspaceId: string) {
    const name = newProjectNames[workspaceId] || "";
    if (name.trim()) {
      onCreateProject(workspaceId, name.trim());
      setNewProjectNames((p) => ({ ...p, [workspaceId]: "" }));
      setShowNewProject(null);
    }
  }

  function submitRename() {
    if (!renaming) return;
    if (renaming.value.trim()) {
      if (renaming.type === "workspace") {
        onRenameWorkspace(renaming.id, renaming.value.trim());
      } else {
        onRenameProject(renaming.id, renaming.value.trim());
      }
    }
    setRenaming(null);
  }

  return (
    <aside className="w-60 flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-3.5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[var(--accent)] rounded-lg flex items-center justify-center flex-shrink-0">
              <Layers size={14} className="text-[var(--accent-fg)]" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-[13px] tracking-tight text-[var(--ink)]">
              Mindframe
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Workspaces */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 pt-2 pb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
            Workspaces
          </span>
          <button
            onClick={() => setShowNewWorkspace(true)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            title="New workspace"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* New workspace input */}
        {showNewWorkspace && (
          <div className="px-3 py-1">
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitNewWorkspace();
                  if (e.key === "Escape") {
                    setShowNewWorkspace(false);
                    setNewWorkspaceName("");
                  }
                }}
                placeholder="Workspace name"
                className="flex-1 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 outline-none focus:border-[var(--ink)] text-[var(--ink)] placeholder:text-[var(--muted)]"
              />
              <button
                onClick={submitNewWorkspace}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-3)] text-[var(--ink)] cursor-pointer"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => {
                  setShowNewWorkspace(false);
                  setNewWorkspaceName("");
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {workspaces.map((ws) => {
          const isExpanded = expandedWorkspaces.has(ws.id);
          const wsProjects = projects[ws.id] || [];
          const isActiveWorkspace = activeWorkspaceId === ws.id;

          return (
            <div key={ws.id}>
              {/* Workspace row */}
              <div
                className={cn(
                  "group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors mx-1 rounded-md",
                  isActiveWorkspace
                    ? "bg-[var(--surface-2)] text-[var(--ink)]"
                    : "hover:bg-[var(--surface-2)]"
                )}
              >
                <button
                  onClick={() => toggleWorkspace(ws.id)}
                  className="text-[var(--muted)] flex-shrink-0 cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown size={11} />
                  ) : (
                    <ChevronRight size={11} />
                  )}
                </button>

                {renaming?.type === "workspace" && renaming.id === ws.id ? (
                  <input
                    autoFocus
                    value={renaming.value}
                    onChange={(e) =>
                      setRenaming({ ...renaming, value: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onBlur={submitRename}
                    className="flex-1 text-[12px] bg-transparent border-b border-[var(--ink)] outline-none text-[var(--ink)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 text-[12px] font-medium text-[var(--ink)] truncate"
                    onClick={() => toggleWorkspace(ws.id)}
                  >
                    {ws.name}
                  </span>
                )}

                {/* Workspace actions */}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming({
                        type: "workspace",
                        id: ws.id,
                        value: ws.name,
                      });
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-3)] cursor-pointer"
                  >
                    <Edit2 size={10} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)
                      ) {
                        onDeleteWorkspace(ws.id);
                      }
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              {/* Projects under workspace */}
              {isExpanded && (
                <div className="ml-5 border-l border-[var(--border)] mt-0.5 mb-1">
                  {wsProjects.map((proj) => {
                    const isActive = activeProjectId === proj.id;
                    return (
                      <div key={proj.id} className="group">
                        {renaming?.type === "project" && renaming.id === proj.id ? (
                          <div className="flex items-center gap-1 px-2 py-1">
                            <input
                              autoFocus
                              value={renaming.value}
                              onChange={(e) =>
                                setRenaming({ ...renaming, value: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitRename();
                                if (e.key === "Escape") setRenaming(null);
                              }}
                              onBlur={submitRename}
                              className="flex-1 text-[12px] bg-transparent border-b border-[var(--ink)] outline-none text-[var(--ink)]"
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "flex items-center gap-1.5 pl-2 pr-1.5 py-1 mx-1 rounded-md transition-colors",
                              isActive
                                ? "bg-[var(--surface-3)] text-[var(--ink)]"
                                : "hover:bg-[var(--surface-2)]"
                            )}
                          >
                            <Link
                              href={`/workspace/${ws.id}/project/${proj.id}`}
                              className="flex-1 flex items-center gap-1.5 min-w-0"
                            >
                              <Map
                                size={11}
                                className={cn(
                                  "flex-shrink-0",
                                  isActive ? "text-[var(--ink-3)]" : "text-[var(--muted)]"
                                )}
                              />
                              <span
                                className={cn(
                                  "text-[12px] truncate",
                                  isActive
                                    ? "text-[var(--ink)] font-medium"
                                    : "text-[var(--ink-2)]"
                                )}
                              >
                                {proj.name}
                              </span>
                            </Link>

                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <button
                                onClick={() =>
                                  setRenaming({
                                    type: "project",
                                    id: proj.id,
                                    value: proj.name,
                                  })
                                }
                                className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-3)] cursor-pointer"
                              >
                                <Edit2 size={10} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete project "${proj.name}"?`)) {
                                    onDeleteProject(proj.id);
                                  }
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Library link */}
                  <Link
                    href={`/workspace/${ws.id}/library`}
                    className={cn(
                      "flex items-center gap-1.5 pl-2 pr-1.5 py-1 mx-1 rounded-md transition-colors",
                      pathname === `/workspace/${ws.id}/library`
                        ? "bg-[var(--surface-3)] text-[var(--ink)]"
                        : "hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <BookOpen
                      size={11}
                      className={cn(
                        pathname === `/workspace/${ws.id}/library`
                          ? "text-[var(--ink-3)]"
                          : "text-[var(--muted)]"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[12px]",
                        pathname === `/workspace/${ws.id}/library`
                          ? "text-[var(--ink)] font-medium"
                          : "text-[var(--ink-2)]"
                      )}
                    >
                      Library
                    </span>
                  </Link>

                  {/* New project */}
                  {showNewProject === ws.id ? (
                    <div className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={newProjectNames[ws.id] || ""}
                          onChange={(e) =>
                            setNewProjectNames((p) => ({
                              ...p,
                              [ws.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitNewProject(ws.id);
                            if (e.key === "Escape") setShowNewProject(null);
                          }}
                          placeholder="Project name"
                          className="flex-1 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded px-1.5 py-1 outline-none focus:border-[var(--ink)] text-[var(--ink)] placeholder:text-[var(--muted)]"
                        />
                        <button onClick={() => submitNewProject(ws.id)} className="cursor-pointer">
                          <Check size={11} className="text-[var(--ink)]" />
                        </button>
                        <button onClick={() => setShowNewProject(null)} className="cursor-pointer">
                          <X size={11} className="text-[var(--muted)]" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowNewProject(ws.id);
                        setExpandedWorkspaces((prev) =>
                          new Set([...prev, ws.id])
                        );
                      }}
                      className="flex items-center gap-1.5 pl-2 py-1 mx-1 w-[calc(100%-8px)] text-left rounded-md hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                    >
                      <Plus size={10} className="text-[var(--muted)]" />
                      <span className="text-[12px] text-[var(--muted)]">New project</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {workspaces.length === 0 && !showNewWorkspace && (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-[var(--muted)] leading-relaxed">
              No workspaces yet.
              <br />
              Create one to get started.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
