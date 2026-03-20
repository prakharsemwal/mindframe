"use client";

import { memo, useState, useRef, useEffect } from "react";
import { type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export interface TextNodeData {
  text: string;
  fontSize?: "small" | "medium" | "large";
  onUpdate?: (nodeId: string, data: Partial<TextNodeData>) => void;
}

const FONT_SIZES = [
  { id: "small", label: "S", size: "12px" },
  { id: "medium", label: "M", size: "16px" },
  { id: "large", label: "L", size: "24px" },
] as const;

export const TextNodeComponent = memo(function TextNodeComponent({
  id,
  data,
  selected,
}: NodeProps<TextNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(data.text || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fontSize = data.fontSize || "medium";
  const fontSizeClasses = {
    small: "text-[12px]",
    medium: "text-[16px]",
    large: "text-[24px] font-semibold",
  };

  const handleFontSizeChange = (size: "small" | "medium" | "large") => {
    if (data.onUpdate) {
      data.onUpdate(id, { fontSize: size });
    }
  };

  // Sync with data changes
  useEffect(() => {
    setTextValue(data.text || "");
  }, [data.text]);

  // Focus and select when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [textValue, isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (data.onUpdate && textValue !== data.text) {
      data.onUpdate(id, { text: textValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setTextValue(data.text || "");
      setIsEditing(false);
    }
    // Allow Shift+Enter for new lines, Enter alone saves
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="relative">
      {/* Font size toolbar - shows when selected */}
      {selected && !isEditing && (
        <div className="absolute -top-8 left-0 flex items-center gap-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-md px-1 py-0.5 shadow-sm">
          {FONT_SIZES.map((size) => (
            <button
              key={size.id}
              onClick={(e) => {
                e.stopPropagation();
                handleFontSizeChange(size.id);
              }}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded text-[11px] font-medium transition-colors",
                fontSize === size.id
                  ? "bg-[var(--ink)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              )}
              title={`Font size: ${size.size}`}
            >
              {size.label}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "min-w-[60px] max-w-[400px] px-2 py-1 rounded",
          selected && "ring-2 ring-[var(--ink)] ring-offset-2",
          !isEditing && "cursor-text"
        )}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={cn(
              "bg-transparent outline-none resize-none w-full text-[var(--ink)] leading-relaxed",
              fontSizeClasses[fontSize]
            )}
            placeholder="Type here..."
            rows={1}
          />
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            className={cn(
              "text-[var(--ink)] leading-relaxed whitespace-pre-wrap hover:opacity-70 transition-opacity",
              fontSizeClasses[fontSize]
            )}
          >
            {data.text || (
              <span className="text-[var(--muted)]">Click to add text...</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
});
