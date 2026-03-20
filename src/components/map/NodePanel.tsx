"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, ChevronDown, Link, BookOpen, Image as ImageIcon } from "lucide-react";
import { cn, getTagStyles, now } from "@/lib/utils";
import { CORE_TAGS, type NodeData, type CustomTag, type Library, type ImportedDoc } from "@/types";

interface NodePanelProps {
  nodeId: string;
  data: NodeData;
  customTags: CustomTag[];
  library?: Library;
  docs?: ImportedDoc[];
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  onUploadImage?: (nodeId: string, file: File) => Promise<string>;
}

const ALL_TAGS = (customTags: CustomTag[]) => [
  ...CORE_TAGS,
  ...customTags,
];

export function NodePanel({
  nodeId,
  data,
  customTags,
  library,
  docs,
  onUpdate,
  onDelete,
  onClose,
  onUploadImage,
}: NodePanelProps) {
  const [annotation, setAnnotation] = useState(data.annotation || "");
  const [tag, setTag] = useState(data.tag);
  const [bgColor, setBgColor] = useState(data.bgColor ?? "#FFFFFF");
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showLibraryLink, setShowLibraryLink] = useState(false);
  const [linkedLibraryEntryId, setLinkedLibraryEntryId] = useState(
    data.linkedLibraryEntryId || ""
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const allTags = ALL_TAGS(customTags);
  const currentTag = allTags.find((t) => t.id === tag) || CORE_TAGS[2];
  const tagStyles = getTagStyles(currentTag.bucket);

  useEffect(() => {
    setAnnotation(data.annotation || "");
    setTag(data.tag);
    setBgColor(data.bgColor ?? "#FFFFFF");
    setLinkedLibraryEntryId(data.linkedLibraryEntryId || "");
  }, [nodeId, data]);

  function save() {
    onUpdate(nodeId, {
      annotation,
      tag,
      bgColor,
      linkedLibraryEntryId: linkedLibraryEntryId || undefined,
      isDraft: tag === "hold" && data.isDraft ? true : false,
      updatedAt: now(),
    });
  }

  function handleBgColorChange(color: string) {
    setBgColor(color);
    onUpdate(nodeId, { bgColor: color, updatedAt: now() });
  }

  function handleTagSelect(tagId: string) {
    setTag(tagId);
    setShowTagMenu(false);
    onUpdate(nodeId, {
      tag: tagId,
      isDraft: false,
      updatedAt: now(),
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;
    const url = await onUploadImage(nodeId, file);
    onUpdate(nodeId, { imageUrl: url, updatedAt: now() });
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[var(--ink)] uppercase tracking-widest">
          Node
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (confirm("Delete this node?")) onDelete(nodeId);
            }}
            className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-red-500 rounded transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => { save(); onClose(); }}
            className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Tag selector */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] block mb-1.5">
            Tag
          </label>
          <div className="relative">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border text-[12px] font-medium w-full",
                tagStyles.bg,
                tagStyles.text,
                tagStyles.border
              )}
            >
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", tagStyles.dot)} />
              <span className="flex-1 text-left">{currentTag.label}</span>
              <ChevronDown size={12} />
            </button>

            {showTagMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 overflow-hidden">
                {allTags.map((t) => {
                  const s = getTagStyles(t.bucket);
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTagSelect(t.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 w-full text-left text-[12px] hover:bg-[var(--surface-2)] transition-colors",
                        t.id === tag && "bg-[var(--surface-2)]"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", s.dot)} />
                      <span className="font-medium">{t.label}</span>
                      {t.isCustom && (
                        <span className="text-[10px] text-[var(--muted)] ml-auto">custom</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Background color */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] block mb-2">
            Background
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { color: "#FFFFFF", label: "White" },
              { color: "#FFFBEB", label: "Cream" },
              { color: "#FEF9C3", label: "Yellow" },
              { color: "#DCFCE7", label: "Green" },
              { color: "#DBEAFE", label: "Blue" },
              { color: "#EDE9FE", label: "Purple" },
              { color: "#FCE7F3", label: "Pink" },
              { color: "#FFEDD5", label: "Orange" },
            ].map(({ color, label }) => (
              <button
                key={color}
                title={label}
                onClick={() => handleBgColorChange(color)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
                style={{
                  backgroundColor: color,
                  borderColor: bgColor === color ? "var(--ink)" : "var(--border)",
                  boxShadow: bgColor === color ? "0 0 0 1px var(--ink)" : undefined,
                }}
              />
            ))}
            {/* Custom colour input */}
            <label
              title="Custom colour"
              className="w-6 h-6 rounded-full border-2 border-[var(--border)] overflow-hidden cursor-pointer flex-shrink-0 hover:scale-110 transition-transform"
              style={{
                background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                borderColor: ![
                  "#FFFFFF","#FFFBEB","#FEF9C3","#DCFCE7",
                  "#DBEAFE","#EDE9FE","#FCE7F3","#FFEDD5",
                ].includes(bgColor) ? "var(--ink)" : "var(--border)",
              }}
            >
              <input
                type="color"
                value={bgColor}
                onChange={(e) => handleBgColorChange(e.target.value)}
                className="opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Annotation */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] block mb-1.5">
            Annotation
          </label>
          <textarea
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            onBlur={save}
            placeholder="What were you thinking at this point?"
            rows={3}
            className="w-full text-[12px] bg-transparent outline-none text-[var(--ink)] resize-none leading-relaxed placeholder:text-[var(--muted-3)]"
          />
        </div>

        {/* Image */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] block mb-1.5">
            Image
          </label>
          {data.imageUrl ? (
            <div className="relative">
              <img
                src={data.imageUrl}
                alt="Node attachment"
                className="w-full rounded-md border border-[var(--border)]"
              />
              <button
                onClick={() => onUpdate(nodeId, { imageUrl: undefined, updatedAt: now() })}
                className="absolute top-1 right-1 w-5 h-5 bg-[var(--surface)] border border-[var(--border)] rounded flex items-center justify-center text-[var(--muted)] hover:text-red-500"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-[var(--border)] rounded-md py-3 text-[11px] text-[var(--muted)] hover:border-[#1A1A1A] hover:text-[var(--ink)] transition-colors flex items-center justify-center gap-1.5"
            >
              <ImageIcon size={12} />
              Upload or paste image
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Library link */}
        {library && library.entries.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                Library Link
              </label>
              <button
                onClick={() => setShowLibraryLink(!showLibraryLink)}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {showLibraryLink ? "Hide" : "Link entry"}
              </button>
            </div>

            {linkedLibraryEntryId && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#1E40AF] bg-[#DBEAFE] px-2 py-1 rounded mb-2">
                <BookOpen size={10} />
                <span className="truncate">
                  {library.entries.find((e) => e.id === linkedLibraryEntryId)?.title || "Linked"}
                </span>
                <button
                  onClick={() => {
                    setLinkedLibraryEntryId("");
                    onUpdate(nodeId, { linkedLibraryEntryId: undefined, updatedAt: now() });
                  }}
                  className="ml-auto"
                >
                  <X size={9} />
                </button>
              </div>
            )}

            {showLibraryLink && (
              <div className="border border-[var(--border)] rounded-md overflow-hidden">
                {library.entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setLinkedLibraryEntryId(entry.id);
                      onUpdate(nodeId, { linkedLibraryEntryId: entry.id, updatedAt: now() });
                      setShowLibraryLink(false);
                    }}
                    className="flex items-start gap-2 px-3 py-2 w-full text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)] last:border-0"
                  >
                    <BookOpen size={10} className="text-[var(--muted)] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] font-medium text-[var(--ink)]">{entry.title}</div>
                      <div className="text-[10px] text-[var(--muted)]">{entry.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <button
          onClick={save}
          className="w-full bg-[#1A1A1A] text-white text-[12px] font-medium py-2 rounded-md hover:bg-[var(--ink-2)] transition-colors"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
