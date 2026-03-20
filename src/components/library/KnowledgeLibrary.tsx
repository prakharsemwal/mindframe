"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn, formatRelativeDate, generateId, now } from "@/lib/utils";
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import type { Library, LibraryEntry } from "@/types";

interface KnowledgeLibraryProps {
  library: Library;
  onSave: (library: Library) => void;
}

const DEFAULT_CATEGORIES = [
  "Business Logic",
  "Service Rules",
  "Tech Constraints",
  "Design Decisions",
];

export function KnowledgeLibrary({ library, onSave }: KnowledgeLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LibraryEntry | null>(null);
  const [editing, setEditing] = useState<LibraryEntry | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<LibraryEntry>>({
    title: "",
    category: library.categories[0] || DEFAULT_CATEGORIES[0],
    body: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const categories = library.categories.length > 0
    ? library.categories
    : DEFAULT_CATEGORIES;

  const filteredEntries = library.entries.filter((entry) => {
    const matchesSearch =
      !search ||
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.body.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !activeCategory || entry.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  function saveEntry() {
    if (!editing?.title.trim()) return;
    const updated = library.entries.map((e) =>
      e.id === editing.id ? { ...editing, updatedAt: now() } : e
    );
    onSave({ ...library, entries: updated });
    setSelectedEntry({ ...editing, updatedAt: now() });
    setEditing(null);
  }

  function createEntry() {
    if (!newEntry.title?.trim()) return;
    const entry: LibraryEntry = {
      id: generateId(),
      workspaceId: library.workspaceId,
      title: newEntry.title.trim(),
      category: newEntry.category || DEFAULT_CATEGORIES[0],
      body: newEntry.body || "",
      createdAt: now(),
      updatedAt: now(),
    };
    onSave({ ...library, entries: [...library.entries, entry] });
    setShowNewEntry(false);
    setNewEntry({ title: "", category: library.categories[0] || DEFAULT_CATEGORIES[0], body: "" });
    setSelectedEntry(entry);
  }

  function deleteEntry(id: string) {
    onSave({ ...library, entries: library.entries.filter((e) => e.id !== id) });
    if (selectedEntry?.id === id) setSelectedEntry(null);
  }

  function addCategory() {
    if (!newCategory.trim() || library.categories.includes(newCategory.trim())) {
      setShowNewCategory(false);
      setNewCategory("");
      return;
    }
    onSave({ ...library, categories: [...library.categories, newCategory.trim()] });
    setNewCategory("");
    setShowNewCategory(false);
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-[var(--border)] flex flex-col flex-shrink-0">
        {/* Search */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5">
            <Search size={12} className="text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              className="flex-1 text-[12px] bg-transparent outline-none text-[var(--ink)] placeholder:text-[var(--muted)]"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
              Categories
            </span>
            <button onClick={() => setShowNewCategory(true)} className="text-[var(--muted)] hover:text-[var(--ink)]">
              <Plus size={11} />
            </button>
          </div>

          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "w-full text-left px-2 py-1 rounded text-[12px] transition-colors mb-0.5",
              !activeCategory ? "bg-[#1A1A1A] text-white font-medium" : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
            )}
          >
            All ({library.entries.length})
          </button>

          {categories.map((cat) => {
            const count = library.entries.filter((e) => e.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  "w-full text-left px-2 py-1 rounded text-[12px] transition-colors flex items-center justify-between mb-0.5",
                  activeCategory === cat ? "bg-[#1A1A1A] text-white font-medium" : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                )}
              >
                <span className="truncate">{cat}</span>
                <span className={cn("text-[10px] ml-2", activeCategory === cat ? "text-white/60" : "text-[var(--muted)]")}>
                  {count}
                </span>
              </button>
            );
          })}

          {showNewCategory && (
            <div className="flex items-center gap-1 mt-1">
              <input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCategory();
                  if (e.key === "Escape") { setShowNewCategory(false); setNewCategory(""); }
                }}
                placeholder="Category name"
                className="flex-1 text-[11px] bg-[var(--surface-2)] border border-[var(--border)] rounded px-1.5 py-0.5 outline-none"
              />
              <button onClick={addCategory}><Check size={11} className="text-[var(--ink)]" /></button>
              <button onClick={() => { setShowNewCategory(false); setNewCategory(""); }}>
                <X size={11} className="text-[var(--muted)]" />
              </button>
            </div>
          )}
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredEntries.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[11px] text-[var(--muted)]">
                {search ? "No results" : "No entries yet"}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => { setSelectedEntry(entry); setEditing(null); setShowNewEntry(false); }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors",
                  selectedEntry?.id === entry.id && "bg-[var(--surface-2)]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-medium text-[var(--ink)] leading-tight">{entry.title}</p>
                  <ChevronRight size={11} className="text-[var(--muted)] mt-0.5 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--muted)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded">
                    {entry.category}
                  </span>
                  <span className="text-[10px] text-[var(--muted-2)]">
                    {formatRelativeDate(entry.updatedAt)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-[var(--border)]">
          <button
            onClick={() => { setShowNewEntry(true); setSelectedEntry(null); setEditing(null); }}
            className="w-full flex items-center justify-center gap-1.5 bg-[#1A1A1A] text-white text-[12px] font-medium py-2 rounded-md hover:bg-[var(--ink-2)] transition-colors"
          >
            <Plus size={12} />
            New entry
          </button>
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 overflow-y-auto">
        {showNewEntry && (
          <NewEntryForm
            categories={categories}
            entry={newEntry}
            onChange={setNewEntry}
            onSave={createEntry}
            onCancel={() => setShowNewEntry(false)}
          />
        )}

        {selectedEntry && !showNewEntry && (
          <EntryDetail
            entry={editing || selectedEntry}
            isEditing={!!editing}
            onEdit={() => setEditing({ ...selectedEntry })}
            onChange={(field, val) => setEditing((e) => e ? { ...e, [field]: val } : null)}
            onSave={saveEntry}
            onCancelEdit={() => setEditing(null)}
            onDelete={() => deleteEntry(selectedEntry.id)}
          />
        )}

        {!selectedEntry && !showNewEntry && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <BookOpen size={32} className="text-[var(--muted-3)] mb-3" />
            <p className="text-[13px] font-medium text-[var(--ink)] mb-1">Knowledge Library</p>
            <p className="text-[12px] text-[var(--muted)] leading-relaxed">
              Store business logic, design rules, and constraints that inform decisions across all projects in this workspace.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New entry form ────────────────────────────────────────────────────────────

function NewEntryForm({
  categories,
  entry,
  onChange,
  onSave,
  onCancel,
}: {
  categories: string[];
  entry: Partial<LibraryEntry>;
  onChange: (e: Partial<LibraryEntry>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold text-[var(--ink)] mb-1">New entry</h2>
        <p className="text-[12px] text-[var(--muted)]">Add a piece of knowledge to your library</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] block mb-1.5">
            Title
          </label>
          <input
            autoFocus
            value={entry.title || ""}
            onChange={(e) => onChange({ ...entry, title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
            placeholder="Entry title"
            className="w-full text-[14px] font-medium bg-transparent border-b border-[var(--border)] pb-1 outline-none focus:border-[var(--ink)] text-[var(--ink)]"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] block mb-1.5">
            Category
          </label>
          <select
            value={entry.category || ""}
            onChange={(e) => onChange({ ...entry, category: e.target.value })}
            className="text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 outline-none text-[var(--ink)]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] block mb-1.5">
            Content
          </label>
          <MarkdownEditor
            value={entry.body || ""}
            onChange={(val) => onChange({ ...entry, body: val })}
            placeholder="Document the rule, logic, or constraint... Markdown is supported."
            minRows={12}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onSave}
            disabled={!entry.title?.trim()}
            className="bg-[#1A1A1A] text-white text-[12px] font-medium px-4 py-2 rounded-md hover:bg-[var(--ink-2)] transition-colors disabled:opacity-40"
          >
            Create entry
          </button>
          <button
            onClick={onCancel}
            className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)] px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Entry detail / editor ─────────────────────────────────────────────────────

function EntryDetail({
  entry,
  isEditing,
  onEdit,
  onChange,
  onSave,
  onCancelEdit,
  onDelete,
}: {
  entry: LibraryEntry;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (field: keyof LibraryEntry, val: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={entry.title}
              onChange={(e) => onChange("title", e.target.value)}
              className="text-[20px] font-semibold bg-transparent border-b border-[#1A1A1A] pb-1 outline-none text-[var(--ink)] w-full"
            />
          ) : (
            <h1 className="text-[20px] font-semibold text-[var(--ink)] leading-tight">
              {entry.title}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-[var(--muted)] bg-[var(--surface-3)] px-2 py-0.5 rounded">
              {entry.category}
            </span>
            <span className="text-[11px] text-[var(--muted-2)]">
              Updated {formatRelativeDate(entry.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-4 flex-shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                className="flex items-center gap-1.5 text-[12px] font-medium text-white bg-[#1A1A1A] px-3 py-1.5 rounded hover:bg-[var(--ink-2)] transition-colors"
              >
                <Check size={12} />
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)] px-3 py-1.5"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] rounded"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => { if (confirm("Delete this entry?")) onDelete(); }}
                className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-red-500 hover:bg-[var(--surface-2)] rounded"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {isEditing ? (
        <MarkdownEditor
          value={entry.body}
          onChange={(val) => onChange("body", val)}
          placeholder="Document the rule, logic, or constraint... Markdown is supported."
          minRows={16}
        />
      ) : (
        <div className="prose-mindframe">
          {entry.body ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {entry.body}
            </ReactMarkdown>
          ) : (
            <p className="text-[13px] text-[var(--muted)] italic">
              No content yet. Click edit to add content.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
