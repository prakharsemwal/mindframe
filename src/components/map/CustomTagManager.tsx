"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { cn, getTagStyles, generateId, now } from "@/lib/utils";
import { CORE_TAGS, type CustomTag, type TagBucket } from "@/types";

const BUCKETS: { id: TagBucket; label: string }[] = [
  { id: "commit", label: "Use this" },
  { id: "discard", label: "Don't use" },
  { id: "hold", label: "Park it" },
  { id: "reference", label: "Reference" },
];

interface CustomTagManagerProps {
  customTags: CustomTag[];
  onChange: (tags: CustomTag[]) => void;
  onClose: () => void;
}

export function CustomTagManager({ customTags, onChange, onClose }: CustomTagManagerProps) {
  const [newLabel, setNewLabel] = useState("");
  const [newBucket, setNewBucket] = useState<TagBucket>("hold");

  function addTag() {
    if (!newLabel.trim()) return;
    const tag: CustomTag = {
      id: generateId(),
      label: newLabel.trim(),
      bucket: newBucket,
      isCustom: true,
    };
    onChange([...customTags, tag]);
    setNewLabel("");
  }

  function removeTag(id: string) {
    onChange(customTags.filter((t) => t.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-2xl w-[480px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <span className="text-[14px] font-semibold text-[var(--ink)]">Custom Tags</span>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Core tags reference */}
          <p className="text-[11px] text-[var(--muted)] mb-3">
            Custom tags inherit the behavior of a core tag bucket.
          </p>

          {/* Existing custom tags */}
          {customTags.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {customTags.map((tag) => {
                const s = getTagStyles(tag.bucket);
                const bucket = BUCKETS.find((b) => b.id === tag.bucket);
                return (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 p-2 rounded-md border border-[var(--border)]"
                  >
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", s.dot)} />
                    <span className="text-[12px] font-medium text-[var(--ink)] flex-1">
                      {tag.label}
                    </span>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", s.bg, s.text)}>
                      {bucket?.label}
                    </span>
                    <button
                      onClick={() => removeTag(tag.id)}
                      className="text-[var(--muted)] hover:text-red-500"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new tag */}
          <div className="border border-dashed border-[var(--border)] rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
              New tag
            </p>
            <div className="flex items-center gap-2 mb-2">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="Tag name"
                className="flex-1 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded px-2.5 py-1.5 outline-none focus:border-[var(--ink)] text-[var(--ink)] placeholder:text-[var(--muted-2)]"
              />
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              {BUCKETS.map((b) => {
                const s = getTagStyles(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => setNewBucket(b.id)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-all",
                      newBucket === b.id
                        ? cn(s.bg, s.text, "border-current")
                        : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", newBucket === b.id ? s.dot : "bg-[#8A8880]")} />
                    {b.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={addTag}
              disabled={!newLabel.trim()}
              className="w-full flex items-center justify-center gap-1.5 bg-[#1A1A1A] text-white text-[12px] font-medium py-2 rounded-md hover:bg-[var(--ink-2)] transition-colors disabled:opacity-40"
            >
              <Plus size={12} />
              Add tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
