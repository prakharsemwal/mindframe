"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, ArrowRight, Plus } from "lucide-react";
import type { Workspace } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(data);
        // If workspaces exist, redirect to first project or workspace
        if (data.length > 0) {
          router.push(`/workspace/${data[0].id}`);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function createWorkspace() {
    if (!newName.trim()) return;
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const ws = await res.json();
    router.push(`/workspace/${ws.id}`);
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-4 h-4 border-2 border-[var(--border)] border-t-[var(--ink)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="max-w-sm w-full px-6">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-12 h-12 bg-[var(--accent)] rounded-2xl flex items-center justify-center mb-4">
            <Layers size={22} className="text-[var(--accent-fg)]" strokeWidth={1.5} />
          </div>
          <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight mb-1">
            Mindframe
          </h1>
          <p className="text-[13px] text-[var(--muted)]">
            Thinking tool for product designers
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-[15px] font-semibold text-[var(--ink)] mb-1">
            Create your first workspace
          </h2>
          <p className="text-[13px] text-[var(--muted)] mb-5 leading-relaxed">
            A workspace holds your projects, maps, and knowledge library for a product or client.
          </p>

          <div className="flex flex-col gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
              placeholder="e.g. Tortoise, Lumov, Acme..."
              className="w-full text-[13px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--ink)] text-[var(--ink)] placeholder:text-[var(--muted-2)] transition-colors"
            />
            <button
              onClick={createWorkspace}
              disabled={!newName.trim() || creating}
              className="flex items-center justify-center gap-1.5 bg-[var(--accent)] text-[var(--accent-fg)] text-[13px] font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              Create workspace
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
