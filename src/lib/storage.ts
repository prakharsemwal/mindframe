// ─── File-Based Storage Layer ────────────────────────────────────────────────
// All data is stored as JSON files in /data directory

import { promises as fs } from "fs";
import path from "path";
import type {
  Workspace,
  Project,
  Library,
  DocAnnotations,
  LibraryEntry,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

async function readJSON<T>(filepath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filepath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJSON<T>(filepath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Workspace Operations ─────────────────────────────────────────────────────

export async function listWorkspaces(): Promise<Workspace[]> {
  const dir = path.join(DATA_DIR, "workspaces");
  await ensureDir(dir);
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const workspaces = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJSON<Workspace>(path.join(dir, f)))
  );
  return (workspaces.filter(Boolean) as Workspace[]).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  return readJSON<Workspace>(
    path.join(DATA_DIR, "workspaces", `workspace-${id}.json`)
  );
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  await writeJSON(
    path.join(DATA_DIR, "workspaces", `workspace-${workspace.id}.json`),
    workspace
  );
}

export async function deleteWorkspace(id: string): Promise<void> {
  try {
    await fs.unlink(
      path.join(DATA_DIR, "workspaces", `workspace-${id}.json`)
    );
  } catch {}
}

// ─── Project Operations ───────────────────────────────────────────────────────

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const dir = path.join(DATA_DIR, "projects");
  await ensureDir(dir);
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const projects = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJSON<Project>(path.join(dir, f)))
  );
  return (projects.filter(Boolean) as Project[])
    .filter((p) => p.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export async function getProject(id: string): Promise<Project | null> {
  return readJSON<Project>(
    path.join(DATA_DIR, "projects", `project-${id}.json`)
  );
}

export async function saveProject(project: Project): Promise<void> {
  await writeJSON(
    path.join(DATA_DIR, "projects", `project-${project.id}.json`),
    project
  );
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await fs.unlink(path.join(DATA_DIR, "projects", `project-${id}.json`));
  } catch {}
}

// ─── Doc Operations ───────────────────────────────────────────────────────────

export async function saveDoc(
  docId: string,
  content: string
): Promise<void> {
  const dir = path.join(DATA_DIR, "docs");
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, `doc-${docId}.md`), content, "utf-8");
}

export async function getDoc(docId: string): Promise<string | null> {
  try {
    return await fs.readFile(
      path.join(DATA_DIR, "docs", `doc-${docId}.md`),
      "utf-8"
    );
  } catch {
    return null;
  }
}

export async function deleteDoc(docId: string): Promise<void> {
  try {
    await fs.unlink(path.join(DATA_DIR, "docs", `doc-${docId}.md`));
    await fs.unlink(
      path.join(DATA_DIR, "docs", `doc-${docId}.annotations.json`)
    );
  } catch {}
}

// ─── Annotation Operations ────────────────────────────────────────────────────

export async function getAnnotations(
  docId: string
): Promise<DocAnnotations | null> {
  return readJSON<DocAnnotations>(
    path.join(DATA_DIR, "docs", `doc-${docId}.annotations.json`)
  );
}

export async function saveAnnotations(
  annotations: DocAnnotations
): Promise<void> {
  const dir = path.join(DATA_DIR, "docs");
  await ensureDir(dir);
  await writeJSON(
    path.join(dir, `doc-${annotations.docId}.annotations.json`),
    annotations
  );
}

// ─── Library Operations ───────────────────────────────────────────────────────

export async function getLibrary(
  workspaceId: string
): Promise<Library> {
  const data = await readJSON<Library>(
    path.join(DATA_DIR, "library", `library-${workspaceId}.json`)
  );
  return (
    data || {
      workspaceId,
      entries: [],
      categories: ["Business Logic", "Service Rules", "Tech Constraints", "Design Decisions"],
    }
  );
}

export async function saveLibrary(library: Library): Promise<void> {
  const dir = path.join(DATA_DIR, "library");
  await ensureDir(dir);
  await writeJSON(
    path.join(dir, `library-${library.workspaceId}.json`),
    library
  );
}

// ─── Image Operations ─────────────────────────────────────────────────────────

export async function saveImage(
  nodeId: string,
  filename: string,
  data: Buffer
): Promise<string> {
  const dir = path.join(DATA_DIR, "images");
  await ensureDir(dir);
  const name = `${nodeId}-${filename}`;
  await fs.writeFile(path.join(dir, name), data);
  return `/api/images/${name}`;
}
