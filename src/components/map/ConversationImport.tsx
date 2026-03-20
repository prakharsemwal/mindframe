"use client";

import { useState } from "react";
import {
  X,
  MessageSquare,
  Check,
  ChevronRight,
  FileText,
  AlertCircle,
  Copy,
  Info,
} from "lucide-react";
import { cn, parseConversation, chunkAssistantTurn, autoTitle, generateId, now } from "@/lib/utils";
import type { DraftNode, MindMapNode } from "@/types";

interface ConversationImportProps {
  onImport: (nodes: MindMapNode[]) => void;
  onClose: () => void;
}

export function ConversationImport({ onImport, onClose }: ConversationImportProps) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<DraftNode[]>([]);
  const [error, setError] = useState("");

  function handleParse() {
    if (!text.trim()) return;
    setError("");

    const turns = parseConversation(text);
    const assistantTurns = turns.filter((t) => t.speaker === "assistant");
    const source = assistantTurns.length > 0 ? assistantTurns : turns;

    const chunks: string[] = [];
    for (const turn of source) {
      chunks.push(...chunkAssistantTurn(turn.content));
    }

    const nodes: DraftNode[] = chunks
      .filter((c) => c.length > 30)
      .slice(0, 30)
      .map((chunk) => ({
        id: generateId(),
        title: autoTitle(chunk),
        body: chunk.slice(0, 280),
        fullText: chunk,
        selected: true,
      }));

    if (nodes.length === 0) {
      setError("Nothing could be extracted — make sure you've copied the conversation text, not just the URL.");
      return;
    }

    setDrafts(nodes);
    setStep("review");
  }

  function toggleDraft(id: string) {
    setDrafts((d) => d.map((n) => (n.id === id ? { ...n, selected: !n.selected } : n)));
  }

  function handleImport() {
    const selected = drafts.filter((d) => d.selected);
    const centerX = 400;
    const centerY = 300;

    const nodes: MindMapNode[] = selected.map((draft, i) => {
      const cols = 4;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = centerX + (col - cols / 2) * 280 + (Math.random() - 0.5) * 30;
      const y = centerY + row * 220 + (Math.random() - 0.5) * 20;

      return {
        id: draft.id,
        type: "mindmap",
        position: { x, y },
        style: { width: 200 },
        data: {
          title: draft.title,
          body: draft.body,
          annotation: draft.fullText.length > 280 ? draft.fullText : "",
          tag: "hold",
          isDraft: true,
          source: "conversation",
          createdAt: now(),
          updatedAt: now(),
        },
      };
    });

    onImport(nodes);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-[var(--surface-2)] rounded flex items-center justify-center">
              <MessageSquare size={13} className="text-[var(--muted)]" />
            </div>
            <span className="text-[14px] font-semibold text-[var(--ink)]">
              Import Conversation
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X size={14} />
          </button>
        </div>

        {step === "input" && (
          <>
            <div className="px-6 py-4 flex-1 flex flex-col gap-4">
              {/* How-to callout */}
              <div className="flex gap-3 p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                <Info size={14} className="text-[var(--muted)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-[var(--ink)] mb-1">
                    How to copy a Claude conversation
                  </p>
                  <ol className="text-[11px] text-[var(--ink-3)] leading-relaxed space-y-0.5 list-decimal list-inside">
                    <li>Open the conversation on claude.ai</li>
                    <li>
                      Select all text on the page{" "}
                      <kbd className="text-[10px] bg-[var(--surface)] border border-[var(--border)] rounded px-1 py-0.5">⌘A</kbd>
                    </li>
                    <li>
                      Copy{" "}
                      <kbd className="text-[10px] bg-[var(--surface)] border border-[var(--border)] rounded px-1 py-0.5">⌘C</kbd>
                    </li>
                    <li>Paste below</li>
                  </ol>
                  <p className="text-[11px] text-[var(--muted)] mt-2 flex items-center gap-1">
                    <AlertCircle size={10} />
                    Share links don't work — Claude loads conversations via JavaScript, so the URL alone can't be fetched.
                  </p>
                </div>
              </div>

              {/* Paste area */}
              <div className="flex-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] block mb-1.5">
                  Paste conversation text
                </label>
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(""); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleParse();
                  }}
                  placeholder="Paste the full conversation text here. The parser looks for Human/Assistant speaker labels but also works with unlabelled text — just paste whatever you copied."
                  rows={11}
                  className="w-full text-[12px] text-[var(--ink)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 outline-none focus:border-[var(--ink)] resize-none leading-relaxed placeholder:text-[var(--muted-2)]"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-red-700 leading-relaxed">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
              <p className="text-[11px] text-[var(--muted)]">
                {text.length > 0
                  ? `${text.split(/\s+/).filter(Boolean).length} words — ⌘↵ to parse`
                  : "Paste conversation text above"}
              </p>
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="flex items-center gap-2 bg-[#1A1A1A] text-white text-[12px] font-medium px-4 py-2 rounded-md hover:bg-[var(--ink-2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Parse conversation
                <ChevronRight size={13} />
              </button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[var(--ink)]">
                  {drafts.filter((d) => d.selected).length} of {drafts.length} chunks selected
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  Deselect chunks you don't want on the map
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDrafts((d) => d.map((n) => ({ ...n, selected: true })))}
                  className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  All
                </button>
                <button
                  onClick={() => setDrafts((d) => d.map((n) => ({ ...n, selected: false })))}
                  className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  None
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
              {drafts.map((draft, i) => (
                <div
                  key={draft.id}
                  onClick={() => toggleDraft(draft.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    draft.selected
                      ? "border-[#1A1A1A] bg-[var(--surface)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                      draft.selected
                        ? "bg-[#1A1A1A] border-[#1A1A1A]"
                        : "border-[var(--border-2)] bg-[var(--surface)]"
                    )}
                  >
                    {draft.selected && <Check size={9} strokeWidth={3} className="text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-0.5">
                      Chunk {i + 1}
                    </span>
                    <input
                      value={draft.title}
                      onChange={(e) => {
                        e.stopPropagation();
                        setDrafts((d) =>
                          d.map((n) => n.id === draft.id ? { ...n, title: e.target.value } : n)
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[12px] font-medium text-[var(--ink)] bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--ink)] outline-none w-full mb-1"
                    />
                    <p className="text-[11px] text-[var(--ink-3)] leading-relaxed line-clamp-2">
                      {draft.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
              <button
                onClick={() => setStep("input")}
                className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)]"
              >
                ← Back
              </button>
              <button
                onClick={handleImport}
                disabled={drafts.filter((d) => d.selected).length === 0}
                className="flex items-center gap-2 bg-[#1A1A1A] text-white text-[12px] font-medium px-4 py-2 rounded-md hover:bg-[var(--ink-2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import {drafts.filter((d) => d.selected).length} nodes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
