"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import type { Workspace, Project } from "@/types";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: { workspaceId: string };
}

export default function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Record<string, Project[]>>({});
  const [loading, setLoading] = useState(true);

  // Extract active project ID from pathname
  const projectMatch = pathname.match(/\/project\/([^/]+)/);
  const activeProjectId = projectMatch?.[1];

  const loadData = useCallback(async () => {
    const wsRes = await fetch("/api/workspaces");
    const wsList: Workspace[] = await wsRes.json();
    setWorkspaces(wsList);

    const projectsMap: Record<string, Project[]> = {};
    await Promise.all(
      wsList.map(async (ws) => {
        const pRes = await fetch(`/api/projects?workspaceId=${ws.id}`);
        projectsMap[ws.id] = await pRes.json();
      })
    );
    setProjects(projectsMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateWorkspace(name: string) {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const ws: Workspace = await res.json();
    await loadData();
    router.push(`/workspace/${ws.id}`);
  }

  async function handleRenameWorkspace(id: string, name: string) {
    await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await loadData();
  }

  async function handleDeleteWorkspace(id: string) {
    await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
    await loadData();
    const remaining = workspaces.filter((w) => w.id !== id);
    if (remaining.length > 0) {
      router.push(`/workspace/${remaining[0].id}`);
    } else {
      router.push("/");
    }
  }

  async function handleCreateProject(workspaceId: string, name: string) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workspaceId }),
    });
    const project: Project = await res.json();
    await loadData();
    router.push(`/workspace/${workspaceId}/project/${project.id}`);
  }

  async function handleRenameProject(id: string, name: string) {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await loadData();
  }

  async function handleDeleteProject(id: string) {
    const proj = Object.values(projects)
      .flat()
      .find((p) => p.id === id);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    await loadData();
    if (activeProjectId === id && proj) {
      router.push(`/workspace/${proj.workspaceId}`);
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--surface-2)]">
      {!loading && (
        <Sidebar
          workspaces={workspaces}
          projects={projects}
          activeWorkspaceId={params.workspaceId}
          activeProjectId={activeProjectId}
          onCreateWorkspace={handleCreateWorkspace}
          onRenameWorkspace={handleRenameWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onCreateProject={handleCreateProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
        />
      )}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
