"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen } from "lucide-react";
import { KnowledgeLibrary } from "@/components/library/KnowledgeLibrary";
import type { Library } from "@/types";

interface LibraryPageProps {
  params: { workspaceId: string };
}

export default function LibraryPage({ params }: LibraryPageProps) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/library/${params.workspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        setLibrary(data);
        setLoading(false);
      });
  }, [params.workspaceId]);

  const handleSave = useCallback(
    async (updated: Library) => {
      setLibrary(updated);
      await fetch(`/api/library/${params.workspaceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    },
    [params.workspaceId]
  );

  if (loading || !library) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[#1A1A1A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <BookOpen size={16} className="text-[var(--muted)]" />
        <h1 className="text-[14px] font-semibold text-[var(--ink)]">
          Knowledge Library
        </h1>
        <span className="text-[11px] text-[var(--muted)]">
          {library.entries.length} entr{library.entries.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      {/* Library content */}
      <div className="flex-1 overflow-hidden">
        <KnowledgeLibrary library={library} onSave={handleSave} />
      </div>
    </div>
  );
}
