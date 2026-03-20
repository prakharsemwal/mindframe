"use client";

import { useEffect, useRef } from "react";
import { Trash2, Copy, Tag } from "lucide-react";
import { cn, getTagStyles } from "@/lib/utils";
import { CORE_TAGS, type CustomTag } from "@/types";

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  customTags: CustomTag[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onChangeTag: (id: string, tag: string) => void;
}

export function ContextMenu({
  x,
  y,
  nodeId,
  customTags,
  onClose,
  onDelete,
  onDuplicate,
  onChangeTag,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const allTags = [...CORE_TAGS, ...customTags];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <div className="py-1">
        {/* Change tag */}
        <div className="px-3 py-1">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">
            Tag
          </span>
        </div>
        {allTags.map((t) => {
          const s = getTagStyles(t.bucket);
          return (
            <button
              key={t.id}
              onClick={() => {
                onChangeTag(nodeId, t.id);
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-left hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className={cn("w-2 h-2 rounded-full", s.dot)} />
              <span className="text-[12px] text-[var(--ink)]">{t.label}</span>
            </button>
          );
        })}

        <div className="border-t border-[var(--border)] my-1" />

        <button
          onClick={() => {
            onDuplicate(nodeId);
            onClose();
          }}
          className="flex items-center gap-2 px-3 py-1.5 w-full text-left hover:bg-[var(--surface-2)] transition-colors"
        >
          <Copy size={12} className="text-[var(--muted)]" />
          <span className="text-[12px] text-[var(--ink)]">Duplicate</span>
        </button>

        <button
          onClick={() => {
            onDelete(nodeId);
            onClose();
          }}
          className="flex items-center gap-2 px-3 py-1.5 w-full text-left hover:bg-[var(--surface-2)] transition-colors text-red-500"
        >
          <Trash2 size={12} />
          <span className="text-[12px]">Delete</span>
        </button>
      </div>
    </div>
  );
}
