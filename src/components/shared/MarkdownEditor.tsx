"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  Eye,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}

type Action =
  | "bold"
  | "italic"
  | "h2"
  | "h3"
  | "ul"
  | "ol"
  | "code"
  | "blockquote"
  | "hr";

function wrap(
  textarea: HTMLTextAreaElement,
  before: string,
  after = "",
  defaultText = "text"
): string {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end) || defaultText;
  const newValue =
    value.slice(0, start) + before + selected + after + value.slice(end);
  // Schedule cursor placement after React re-render
  setTimeout(() => {
    const newStart = start + before.length;
    const newEnd = newStart + selected.length;
    textarea.setSelectionRange(newStart, newEnd);
    textarea.focus();
  }, 0);
  return newValue;
}

function prependLine(
  textarea: HTMLTextAreaElement,
  prefix: string
): string {
  const { selectionStart: start, value } = textarea;
  // Find line start
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const newValue =
    value.slice(0, lineStart) + prefix + value.slice(lineStart);
  setTimeout(() => {
    const pos = start + prefix.length;
    textarea.setSelectionRange(pos, pos);
    textarea.focus();
  }, 0);
  return newValue;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write in Markdown...",
  minRows = 12,
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyAction(action: Action) {
    const ta = textareaRef.current;
    if (!ta) return;

    let next = value;
    switch (action) {
      case "bold":
        next = wrap(ta, "**", "**", "bold text");
        break;
      case "italic":
        next = wrap(ta, "_", "_", "italic text");
        break;
      case "h2":
        next = prependLine(ta, "## ");
        break;
      case "h3":
        next = prependLine(ta, "### ");
        break;
      case "ul":
        next = prependLine(ta, "- ");
        break;
      case "ol":
        next = prependLine(ta, "1. ");
        break;
      case "code":
        next = wrap(ta, "`", "`", "code");
        break;
      case "blockquote":
        next = prependLine(ta, "> ");
        break;
      case "hr":
        next = wrap(ta, "\n\n---\n\n", "", "");
        break;
    }
    onChange(next);
  }

  const toolbarButtons: {
    action: Action;
    icon: React.ReactNode;
    title: string;
    separator?: boolean;
  }[] = [
    { action: "bold", icon: <Bold size={13} />, title: "Bold (wrap selection)" },
    { action: "italic", icon: <Italic size={13} />, title: "Italic" },
    { action: "h2", icon: <Heading2 size={13} />, title: "Heading 2", separator: true },
    { action: "h3", icon: <Heading3 size={13} />, title: "Heading 3" },
    { action: "ul", icon: <List size={13} />, title: "Bullet list", separator: true },
    { action: "ol", icon: <ListOrdered size={13} />, title: "Numbered list" },
    { action: "code", icon: <Code size={13} />, title: "Inline code", separator: true },
    { action: "blockquote", icon: <Quote size={13} />, title: "Blockquote" },
    { action: "hr", icon: <Minus size={13} />, title: "Divider" },
  ];

  return (
    <div className={cn("border border-[var(--border)] rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
        {/* Formatting actions */}
        <div className="flex items-center gap-0.5">
          {toolbarButtons.map((btn, i) => (
            <span key={btn.action} className="flex items-center">
              {btn.separator && (
                <span className="w-px h-3.5 bg-[#E4E2DC] mx-1" />
              )}
              <button
                type="button"
                onClick={() => applyAction(btn.action)}
                title={btn.title}
                disabled={mode === "preview"}
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {btn.icon}
              </button>
            </span>
          ))}
        </div>

        {/* Write / Preview toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--surface-3)] rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
              mode === "write"
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            <Edit3 size={10} />
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
              mode === "preview"
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            <Eye size={10} />
            Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview area */}
      {mode === "write" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={minRows}
          className="w-full px-4 py-3 text-[13px] text-[var(--ink)] bg-[var(--surface)] outline-none resize-none leading-relaxed placeholder:text-[var(--muted-2)] font-mono"
        />
      ) : (
        <div
          className="px-4 py-3 prose-mindframe overflow-y-auto bg-[var(--surface)]"
          style={{ minHeight: `${minRows * 1.625}rem` }}
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-[13px] text-[var(--muted-2)] italic">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
