"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import { cn, getTagStyles, getContrastTextColor, getContrastMutedColor, generateId } from "@/lib/utils";
import { CORE_TAGS, type NodeData, type CustomTag, type TextHighlight } from "@/types";
import { MessageSquare, Link as LinkIcon, Image as ImageIcon, Highlighter, X, GripVertical, Pencil } from "lucide-react";
import { createPortal } from "react-dom";

function getTagInfo(tagId: string, customTags: CustomTag[] = []) {
  const coreTag = CORE_TAGS.find((t) => t.id === tagId);
  if (coreTag) return { label: coreTag.label, bucket: coreTag.bucket };

  const customTag = customTags.find((t) => t.id === tagId);
  if (customTag) return { label: customTag.label, bucket: customTag.bucket };

  return { label: tagId, bucket: "hold" as const };
}

// Highlight colors
const HIGHLIGHT_COLORS: { id: TextHighlight["color"]; bg: string; label: string }[] = [
  { id: "yellow", bg: "#FEF08A", label: "Yellow" },
  { id: "green", bg: "#BBF7D0", label: "Green" },
  { id: "blue", bg: "#BFDBFE", label: "Blue" },
  { id: "pink", bg: "#FBCFE8", label: "Pink" },
  { id: "orange", bg: "#FED7AA", label: "Orange" },
];

// Render text with highlights
function renderHighlightedText(
  text: string,
  highlights: TextHighlight[],
  field: "title" | "body",
  onRemoveHighlight?: (id: string) => void
) {
  const fieldHighlights = highlights
    .filter((h) => h.field === field)
    .sort((a, b) => a.start - b.start);

  if (fieldHighlights.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  fieldHighlights.forEach((highlight, idx) => {
    // Add text before highlight
    if (highlight.start > lastEnd) {
      parts.push(
        <span key={`text-${idx}`}>{text.slice(lastEnd, highlight.start)}</span>
      );
    }

    // Add highlighted text
    const colorInfo = HIGHLIGHT_COLORS.find((c) => c.id === highlight.color) || HIGHLIGHT_COLORS[0];
    parts.push(
      <mark
        key={`highlight-${highlight.id}`}
        className="rounded-sm px-0.5 -mx-0.5 cursor-pointer hover:opacity-70"
        style={{ backgroundColor: colorInfo.bg, color: "inherit" }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onRemoveHighlight) {
            onRemoveHighlight(highlight.id);
          }
        }}
        title="Click to remove highlight"
      >
        {text.slice(highlight.start, highlight.end)}
      </mark>
    );

    lastEnd = highlight.end;
  });

  // Add remaining text
  if (lastEnd < text.length) {
    parts.push(<span key="text-end">{text.slice(lastEnd)}</span>);
  }

  return <>{parts}</>;
}

// Floating action menu component (rendered via portal)
function ActionMenu({
  position,
  onHighlight,
  onEdit,
  onClose,
}: {
  position: { x: number; y: number };
  onHighlight: (color: TextHighlight["color"]) => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Delay adding the click listener to avoid catching the same click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside, true);
    }, 100);
    document.addEventListener("keydown", handleEscape);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Highlight colors */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100">
        <Highlighter size={12} className="text-gray-400 mr-1" />
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.id}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onHighlight(color.id);
            }}
            className="w-6 h-6 rounded-full border-2 border-white hover:border-gray-800 transition-all hover:scale-110 shadow-sm"
            style={{ backgroundColor: color.bg }}
            title={`Highlight ${color.label}`}
          />
        ))}
      </div>
      {/* Edit action */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit();
        }}
        className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Pencil size={12} />
        Edit text
      </button>
    </div>,
    document.body
  );
}

export const MindMapNodeComponent = memo(function MindMapNodeComponent({
  id,
  data,
  selected,
}: NodeProps<NodeData>) {
  const tagInfo = getTagInfo(data.tag, []);
  const styles = getTagStyles(tagInfo.bucket);
  const isDraft = data.isDraft === true;
  const isDiscard = tagInfo.bucket === "discard";

  // Calculate contrast-aware text colors based on background
  const bgColor = data.bgColor ?? "#FFFFFF";
  const textColor = getContrastTextColor(bgColor);
  const mutedColor = getContrastMutedColor(bgColor);

  // Mode: "view" (default), "edit" (editing text), "select" (selecting text for highlight)
  const [mode, setMode] = useState<"view" | "edit" | "select">("view");
  const [activeField, setActiveField] = useState<"title" | "body" | null>(null);

  // Inline editing state
  const [titleValue, setTitleValue] = useState(data.title || "");
  const [bodyValue, setBodyValue] = useState(data.body || "");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Selection state for highlighting
  const [selectionInfo, setSelectionInfo] = useState<{
    field: "title" | "body";
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const highlights = data.highlights || [];

  // Sync with data changes
  useEffect(() => {
    setTitleValue(data.title || "");
    setBodyValue(data.body || "");
  }, [data.title, data.body]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (mode === "edit" && activeField === "title" && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
    if (mode === "edit" && activeField === "body" && bodyTextareaRef.current) {
      bodyTextareaRef.current.focus();
    }
  }, [mode, activeField]);

  // Exit modes when node is deselected
  useEffect(() => {
    if (!selected) {
      setMode("view");
      setActiveField(null);
      setMenuPosition(null);
      setSelectionInfo(null);
    }
  }, [selected]);

  // Handle double-click to enter select mode
  const handleDoubleClick = (field: "title" | "body", e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMode("select");
    setActiveField(field);
    setMenuPosition(null);
    setSelectionInfo(null);
  };

  // Handle text selection in select mode
  const handleMouseUp = useCallback((field: "title" | "body") => {
    if (mode !== "select" || activeField !== field) return;

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const windowSelection = window.getSelection();
      if (!windowSelection || windowSelection.isCollapsed) {
        return;
      }

      const selectedText = windowSelection.toString();
      if (selectedText.length === 0) {
        return;
      }

      // Get the text to search in
      const text = field === "title" ? data.title : data.body;
      if (!text) return;

      const start = text.indexOf(selectedText);
      if (start === -1) return;

      // Get position for the menu (using viewport coordinates)
      const range = windowSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });

      setSelectionInfo({
        field,
        start,
        end: start + selectedText.length,
        text: selectedText,
      });
    }, 10);
  }, [mode, activeField, data.title, data.body]);

  // Switch to edit mode
  const enterEditMode = () => {
    setMenuPosition(null);
    setSelectionInfo(null);
    setMode("edit");
    window.getSelection()?.removeAllRanges();
  };

  // Add highlight
  const addHighlight = useCallback((color: TextHighlight["color"]) => {
    if (!selectionInfo || !data.onUpdate) return;

    const newHighlight: TextHighlight = {
      id: generateId(),
      start: selectionInfo.start,
      end: selectionInfo.end,
      color,
      field: selectionInfo.field,
    };

    const updatedHighlights = [...highlights, newHighlight];
    data.onUpdate(id, { highlights: updatedHighlights });

    setSelectionInfo(null);
    setMenuPosition(null);
    setMode("view");
    setActiveField(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionInfo, highlights, data, id]);

  // Remove highlight
  const removeHighlight = useCallback((highlightId: string) => {
    if (!data.onUpdate) return;
    const updatedHighlights = highlights.filter((h) => h.id !== highlightId);
    data.onUpdate(id, { highlights: updatedHighlights });
  }, [highlights, data, id]);

  // Save handlers
  const handleTitleSave = () => {
    setMode("view");
    setActiveField(null);
    if (data.onUpdate && titleValue !== data.title) {
      data.onUpdate(id, { title: titleValue });
    }
  };

  const handleBodySave = () => {
    setMode("view");
    setActiveField(null);
    if (data.onUpdate && bodyValue !== data.body) {
      data.onUpdate(id, { body: bodyValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: "title" | "body") => {
    if (e.key === "Escape") {
      if (field === "title") setTitleValue(data.title || "");
      if (field === "body") setBodyValue(data.body || "");
      setMode("view");
      setActiveField(null);
    }
    if (e.key === "Enter" && field === "title") {
      e.preventDefault();
      handleTitleSave();
    }
  };

  // Close menu
  const closeMenu = () => {
    setMenuPosition(null);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  // Exit select mode
  const exitSelectMode = () => {
    setMode("view");
    setActiveField(null);
    setMenuPosition(null);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <>
      {/* Resize handles — only visible when selected */}
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        maxWidth={200}
        minHeight={80}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#1A1A1A",
          border: "2px solid white",
        }}
        lineStyle={{
          borderColor: "#1A1A1A",
          borderWidth: 1,
        }}
      />

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!top-[-4px]" />
      <Handle type="source" position={Position.Bottom} className="!bottom-[-4px]" />
      <Handle type="target" position={Position.Left} className="!left-[-4px]" />
      <Handle type="source" position={Position.Right} className="!right-[-4px]" />

      {/* Action menu - rendered via portal outside the node */}
      {menuPosition && selectionInfo && (
        <ActionMenu
          position={menuPosition}
          onHighlight={addHighlight}
          onEdit={enterEditMode}
          onClose={closeMenu}
        />
      )}

      <div
        className={cn(
          "w-full h-full flex flex-col rounded-lg border overflow-hidden",
          isDraft && !["commit", "discard", "reference"].includes(tagInfo.bucket)
            ? "border-dashed border-[var(--border-2)]"
            : "border-[var(--border)]",
          isDiscard && "opacity-50",
          tagInfo.bucket === "commit" && "border-[#2D6A4F]/40",
          selected && "ring-2 ring-[var(--ink)] ring-offset-1",
        )}
        style={{ backgroundColor: bgColor }}
      >
        {/* Tag strip - THIS IS THE DRAG HANDLE */}
        <div
          className={cn(
            "px-2 py-1 flex items-center justify-between flex-shrink-0 cursor-grab active:cursor-grabbing",
            styles.bg
          )}
        >
          <div className="flex items-center gap-1">
            <GripVertical size={10} className={cn("opacity-50", styles.text)} />
            <div className={cn("w-1.5 h-1.5 rounded-full", styles.dot)} />
            <span className={cn("text-[10px] font-medium", styles.text)}>
              {tagInfo.label}
            </span>
          </div>
          {isDraft && (
            <span className="text-[9px] text-[var(--muted)] font-medium uppercase tracking-wider">
              draft
            </span>
          )}
        </div>

        {/* Content area - NOT draggable */}
        <div className="flex-1 px-3 py-2 overflow-hidden flex flex-col min-h-0 relative nodrag nopan">
          {/* Selection mode indicator */}
          {mode === "select" && (
            <div className="absolute top-0 right-0 flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-bl-md px-2 py-0.5 z-10">
              <span className="text-[9px] text-blue-600 font-medium">Select text to highlight</span>
              <button
                onClick={exitSelectMode}
                className="text-blue-400 hover:text-blue-600"
              >
                <X size={10} />
              </button>
            </div>
          )}

          {/* Title */}
          {mode === "edit" && activeField === "title" ? (
            <input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => handleKeyDown(e, "title")}
              className={cn(
                "text-[12px] font-medium leading-tight mb-1 flex-shrink-0 bg-transparent outline-none border-b-2 border-[var(--ink)] w-full",
                isDiscard && "line-through"
              )}
              style={{ color: textColor }}
            />
          ) : (
            <p
              onDoubleClick={(e) => handleDoubleClick("title", e)}
              onMouseUp={() => handleMouseUp("title")}
              className={cn(
                "text-[12px] font-medium leading-tight mb-1 flex-shrink-0",
                isDiscard && "line-through",
                mode === "select" && activeField === "title"
                  ? "cursor-text select-text bg-blue-50/50 -mx-1 px-1 rounded"
                  : "cursor-pointer"
              )}
              style={{ color: textColor }}
            >
              {data.title ? (
                renderHighlightedText(data.title, highlights, "title", removeHighlight)
              ) : (
                <span style={{ opacity: 0.5 }}>Untitled</span>
              )}
            </p>
          )}

          {/* Body */}
          {mode === "edit" && activeField === "body" ? (
            <textarea
              ref={bodyTextareaRef}
              value={bodyValue}
              onChange={(e) => setBodyValue(e.target.value)}
              onBlur={handleBodySave}
              onKeyDown={(e) => handleKeyDown(e, "body")}
              className="text-[11px] leading-relaxed flex-1 overflow-y-auto bg-transparent outline-none border border-[var(--border)] rounded p-1 resize-none w-full"
              style={{ color: mutedColor }}
              placeholder="Add description..."
            />
          ) : (
            <p
              onDoubleClick={(e) => handleDoubleClick("body", e)}
              onMouseUp={() => handleMouseUp("body")}
              className={cn(
                "text-[11px] leading-relaxed flex-1 overflow-y-auto",
                mode === "select" && activeField === "body"
                  ? "cursor-text select-text bg-blue-50/50 -mx-1 px-1 rounded"
                  : "cursor-pointer"
              )}
              style={{ color: mutedColor }}
            >
              {data.body ? (
                renderHighlightedText(data.body, highlights, "body", removeHighlight)
              ) : (
                <span style={{ opacity: 0.5 }}>Double-click to edit...</span>
              )}
            </p>
          )}
        </div>

        {/* Footer indicators */}
        {(data.annotation || data.linkedDocId || data.imageUrl || data.linkedLibraryEntryId || highlights.length > 0) && (
          <div className="px-3 pb-2 flex items-center gap-1.5 flex-shrink-0 nodrag">
            {highlights.length > 0 && (
              <Highlighter size={9} style={{ color: mutedColor }} />
            )}
            {data.annotation && (
              <MessageSquare size={9} style={{ color: mutedColor }} />
            )}
            {(data.linkedDocId || data.linkedLibraryEntryId) && (
              <LinkIcon size={9} style={{ color: mutedColor }} />
            )}
            {data.imageUrl && (
              <ImageIcon size={9} style={{ color: mutedColor }} />
            )}
          </div>
        )}
      </div>
    </>
  );
});
