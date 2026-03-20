"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Plus, Upload, X, MessageSquare, ArrowRight } from "lucide-react";
import { cn, generateId, now } from "@/lib/utils";
import type { ImportedDoc, Annotation, MindMapNode, NodeData } from "@/types";

interface DocViewerProps {
  projectId: string;
  docs: ImportedDoc[];
  onDocImport: (file: File) => Promise<ImportedDoc>;
  onDocDelete: (docId: string) => void;
  onSendToMap: (node: Partial<MindMapNode>) => void;
}

interface AnnotationPopover {
  x: number;
  y: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  paragraphIndex: number;
}

export function DocViewer({ projectId, docs, onDocImport, onDocDelete, onSendToMap }: DocViewerProps) {
  const [activeDocId, setActiveDocId] = useState<string | null>(docs[0]?.id || null);
  const [docContent, setDocContent] = useState<string>("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [popover, setPopover] = useState<AnnotationPopover | null>(null);
  const [annotationText, setAnnotationText] = useState("");
  const [showAnnotation, setShowAnnotation] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeDocId) {
      loadDoc(activeDocId);
      loadAnnotations(activeDocId);
    }
  }, [activeDocId]);

  async function loadDoc(docId: string) {
    const res = await fetch(`/api/docs/${docId}`);
    if (res.ok) {
      const data = await res.json();
      setDocContent(data.content);
    }
  }

  async function loadAnnotations(docId: string) {
    const res = await fetch(`/api/docs/${docId}/annotations`);
    if (res.ok) {
      const data = await res.json();
      setAnnotations(data.annotations || []);
    }
  }

  async function saveAnnotations(docId: string, ann: Annotation[]) {
    await fetch(`/api/docs/${docId}/annotations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, projectId, annotations: ann }),
    });
  }

  function handleTextSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setPopover(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 5) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Get paragraph index
    let paragraphIndex = 0;
    let node = range.startContainer as Node;
    while (node && node !== contentRef.current) {
      if (node.nodeName === "P" || node.nodeName === "H1" || node.nodeName === "H2" || node.nodeName === "H3") {
        const parent = contentRef.current;
        if (parent) {
          const children = Array.from(parent.children);
          paragraphIndex = children.indexOf(node as Element);
        }
        break;
      }
      node = node.parentNode as Node;
    }

    setPopover({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      selectedText,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      paragraphIndex,
    });
  }

  function handleAnnotate() {
    if (!popover || !activeDocId) return;
    setAnnotationText("");
  }

  async function saveAnnotation() {
    if (!popover || !activeDocId || !annotationText.trim()) return;

    const annotation: Annotation = {
      id: generateId(),
      docId: activeDocId,
      projectId,
      selectionText: popover.selectedText,
      startOffset: popover.startOffset,
      endOffset: popover.endOffset,
      paragraphIndex: popover.paragraphIndex,
      note: annotationText,
      createdAt: now(),
    };

    const updated = [...annotations, annotation];
    setAnnotations(updated);
    await saveAnnotations(activeDocId, updated);
    setPopover(null);
    setAnnotationText("");
  }

  function handleSendToMap() {
    if (!popover) return;
    onSendToMap({
      data: {
        title: popover.selectedText.split(" ").slice(0, 8).join(" "),
        body: popover.selectedText.slice(0, 280),
        tag: "hold",
        annotation: popover.selectedText.length > 280 ? popover.selectedText : "",
        linkedDocId: activeDocId || undefined,
        createdAt: now(),
        updatedAt: now(),
      },
    });
    setPopover(null);
  }

  async function handleFileUpload(file: File) {
    const imported = await onDocImport(file);
    setActiveDocId(imported.id);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".md")) {
      handleFileUpload(file);
    }
  }

  // Render doc content with annotation highlights
  function renderContent() {
    if (!docContent) return null;

    const paragraphs = docContent.split("\n").filter((l) => l !== undefined);

    return paragraphs.map((line, i) => {
      const lineAnnotations = annotations.filter((a) => a.paragraphIndex === i);

      if (line.startsWith("# ")) {
        return <h1 key={i} className="text-xl font-semibold mt-6 mb-3 text-[var(--ink)]">{line.slice(2)}</h1>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={i} className="text-lg font-semibold mt-5 mb-2 text-[var(--ink)]">{line.slice(3)}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={i} className="text-base font-medium mt-4 mb-2 text-[var(--ink)]">{line.slice(4)}</h3>;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return <li key={i} className="text-[13px] text-[var(--ink-2)] leading-relaxed ml-4">{line.slice(2)}</li>;
      }
      if (line.startsWith("---")) {
        return <hr key={i} className="border-[var(--border)] my-4" />;
      }
      if (!line.trim()) {
        return <div key={i} className="h-3" />;
      }

      let content: React.ReactNode = line;

      if (lineAnnotations.length > 0) {
        content = (
          <span
            className="annotation-highlight"
            onClick={() => setShowAnnotation(lineAnnotations[0].id)}
          >
            {line}
            <MessageSquare size={10} className="inline ml-1 text-[#B45309] align-middle" />
          </span>
        );
      }

      return (
        <p key={i} className="text-[13px] text-[var(--ink-2)] leading-relaxed mb-2">
          {content}
        </p>
      );
    });
  }

  if (docs.length === 0) {
    return (
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl m-6 transition-colors",
          isDragging ? "border-[#1A1A1A] bg-[var(--surface-3)]" : "border-[var(--border)]"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <FileText size={32} className="text-[var(--muted-3)] mb-3" />
        <p className="text-[13px] font-medium text-[var(--ink)] mb-1">No documents</p>
        <p className="text-[11px] text-[var(--muted)] mb-4">
          Import a Markdown file to annotate
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 bg-[#1A1A1A] text-white text-[12px] font-medium px-4 py-2 rounded-md hover:bg-[var(--ink-2)] transition-colors"
        >
          <Upload size={13} />
          Import .md file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Doc tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)] overflow-x-auto">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center group flex-shrink-0">
            <button
              onClick={() => setActiveDocId(doc.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-t text-[12px] transition-colors",
                activeDocId === doc.id
                  ? "bg-[var(--surface)] border border-b-white border-[var(--border)] text-[var(--ink)] font-medium -mb-px"
                  : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              )}
            >
              <FileText size={11} />
              {doc.title}
            </button>
            <button
              onClick={() => {
                if (confirm(`Remove "${doc.title}"?`)) {
                  onDocDelete(doc.id);
                  if (activeDocId === doc.id) {
                    const remaining = docs.filter((d) => d.id !== doc.id);
                    setActiveDocId(remaining[0]?.id || null);
                  }
                }
              }}
              className="opacity-0 group-hover:opacity-100 ml-0.5 text-[var(--muted)] hover:text-red-500 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className="ml-2 flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex-shrink-0"
          title="Import another document"
        >
          <Plus size={11} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {/* Doc content */}
      <div className="flex-1 overflow-y-auto relative">
        <div
          ref={contentRef}
          className="prose-mindframe px-8 py-6 max-w-2xl mx-auto"
          onMouseUp={handleTextSelection}
        >
          {renderContent()}
        </div>

        {/* Selection popover */}
        {popover && (
          <div
            className="absolute z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden"
            style={{
              left: popover.x,
              top: popover.y,
              transform: "translate(-50%, -100%) translateY(-8px)",
            }}
          >
            {annotationText !== undefined && annotationText === "" && popover ? (
              <div className="flex items-center">
                <button
                  onClick={handleAnnotate}
                  className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors border-r border-[var(--border)]"
                >
                  <MessageSquare size={12} />
                  Annotate
                </button>
                <button
                  onClick={handleSendToMap}
                  className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <ArrowRight size={12} />
                  Send to map
                </button>
              </div>
            ) : (
              <div className="p-3 w-64">
                <textarea
                  autoFocus
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  placeholder="Your annotation..."
                  rows={3}
                  className="w-full text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded p-2 outline-none focus:border-[var(--ink)] resize-none mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveAnnotation}
                    className="flex-1 bg-[#1A1A1A] text-white text-[11px] font-medium py-1.5 rounded hover:bg-[var(--ink-2)] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setPopover(null)}
                    className="px-3 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--border)] rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Annotation detail */}
        {showAnnotation && (
          <div
            className="fixed inset-0 z-40 flex items-end justify-center p-6 pointer-events-none"
          >
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-4 max-w-md w-full pointer-events-auto">
              <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                  Annotation
                </span>
                <button
                  onClick={() => setShowAnnotation(null)}
                  className="text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-[12px] text-[var(--ink-2)] leading-relaxed bg-[#FEF3C7] px-3 py-2 rounded mb-2 italic">
                "{annotations.find((a) => a.id === showAnnotation)?.selectionText}"
              </p>
              <p className="text-[13px] text-[var(--ink)]">
                {annotations.find((a) => a.id === showAnnotation)?.note}
              </p>
              <button
                onClick={() => {
                  const ann = annotations.find((a) => a.id === showAnnotation);
                  if (!ann) return;
                  onSendToMap({
                    data: {
                      title: ann.selectionText.split(" ").slice(0, 8).join(" "),
                      body: ann.selectionText.slice(0, 280),
                      annotation: ann.note,
                      tag: "hold",
                      linkedDocId: activeDocId || undefined,
                      createdAt: now(),
                      updatedAt: now(),
                    },
                  });
                  setShowAnnotation(null);
                }}
                className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--ink)] hover:text-[#2D6A4F] font-medium"
              >
                <ArrowRight size={11} />
                Send to map
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Annotations summary bar */}
      {annotations.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <p className="text-[11px] text-[var(--muted)]">
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""} in this document
          </p>
        </div>
      )}
    </div>
  );
}
