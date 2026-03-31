// ─── Storage Layer with Redis Support ─────────────────────────────────────────
// Uses Upstash Redis in production (Vercel), falls back to file system locally

import { promises as fs } from "fs";
import path from "path";
import type {
  Workspace,
  Project,
  Library,
  DocAnnotations,
} from "@/types";

// ─── Redis Client ─────────────────────────────────────────────────────────────

let redis: import("@upstash/redis").Redis | null = null;

async function getRedis() {
  if (redis) return redis;

  // Only use Redis if credentials are available (production)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import("@upstash/redis");
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redis;
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      return null;
    }
  }

  return null;
}

function isProduction() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// ─── File System Helpers (Local Development) ──────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

async function readJSONFile<T>(filepath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filepath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJSONFile<T>(filepath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Workspace Operations ─────────────────────────────────────────────────────

export async function listWorkspaces(): Promise<Workspace[]> {
  const client = await getRedis();

  if (client) {
    try {
      // Redis: get all workspace keys
      const keys = await client.keys("workspace:*");
      if (keys.length === 0) return [];

      const workspaces = await Promise.all(
        keys.map(async (key) => {
          const data = await client.get<Workspace>(key);
          return data;
        })
      );

      return (workspaces.filter(Boolean) as Workspace[]).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch (error) {
      console.error("Redis listWorkspaces error:", error);
      // Fall through to file system fallback
    }
  }

  // File system fallback
  const dir = path.join(DATA_DIR, "workspaces");
  await ensureDir(dir);
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const workspaces = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJSONFile<Workspace>(path.join(dir, f)))
  );
  return (workspaces.filter(Boolean) as Workspace[]).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const client = await getRedis();

  if (client) {
    return client.get<Workspace>(`workspace:${id}`);
  }

  return readJSONFile<Workspace>(
    path.join(DATA_DIR, "workspaces", `workspace-${id}.json`)
  );
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const client = await getRedis();

  if (client) {
    await client.set(`workspace:${workspace.id}`, workspace);
    return;
  }

  await writeJSONFile(
    path.join(DATA_DIR, "workspaces", `workspace-${workspace.id}.json`),
    workspace
  );
}

export async function deleteWorkspace(id: string): Promise<void> {
  const client = await getRedis();

  if (client) {
    await client.del(`workspace:${id}`);
    return;
  }

  try {
    await fs.unlink(
      path.join(DATA_DIR, "workspaces", `workspace-${id}.json`)
    );
  } catch {}
}

// ─── Project Operations ───────────────────────────────────────────────────────

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const client = await getRedis();

  if (client) {
    try {
      const keys = await client.keys("project:*");
      if (keys.length === 0) return [];

      const projects = await Promise.all(
        keys.map(async (key) => {
          const data = await client.get<Project>(key);
          return data;
        })
      );

      return (projects.filter(Boolean) as Project[])
        .filter((p) => p.workspaceId === workspaceId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    } catch (error) {
      console.error("Redis listProjects error:", error);
      // Fall through to file system fallback
    }
  }

  // File system fallback
  const dir = path.join(DATA_DIR, "projects");
  await ensureDir(dir);
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const projects = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJSONFile<Project>(path.join(dir, f)))
  );
  return (projects.filter(Boolean) as Project[])
    .filter((p) => p.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export async function getProject(id: string): Promise<Project | null> {
  const client = await getRedis();

  if (client) {
    try {
      return await client.get<Project>(`project:${id}`);
    } catch (error) {
      console.error("Redis getProject error:", error);
      // Fall through to file system
    }
  }

  return readJSONFile<Project>(
    path.join(DATA_DIR, "projects", `project-${id}.json`)
  );
}

export async function saveProject(project: Project): Promise<void> {
  const client = await getRedis();

  if (client) {
    try {
      await client.set(`project:${project.id}`, project);
      return;
    } catch (error) {
      console.error("Redis saveProject error:", error);
      throw error; // Re-throw so caller knows it failed
    }
  }

  await writeJSONFile(
    path.join(DATA_DIR, "projects", `project-${project.id}.json`),
    project
  );
}

export async function deleteProject(id: string): Promise<void> {
  const client = await getRedis();

  if (client) {
    await client.del(`project:${id}`);
    return;
  }

  try {
    await fs.unlink(path.join(DATA_DIR, "projects", `project-${id}.json`));
  } catch {}
}

// ─── Doc Operations ───────────────────────────────────────────────────────────

export async function saveDoc(
  docId: string,
  content: string
): Promise<void> {
  const client = await getRedis();

  if (client) {
    await client.set(`doc:${docId}`, content);
    return;
  }

  const dir = path.join(DATA_DIR, "docs");
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, `doc-${docId}.md`), content, "utf-8");
}

export async function getDoc(docId: string): Promise<string | null> {
  const client = await getRedis();

  if (client) {
    return client.get<string>(`doc:${docId}`);
  }

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
  const client = await getRedis();

  if (client) {
    await client.del(`doc:${docId}`);
    await client.del(`annotations:${docId}`);
    return;
  }

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
  const client = await getRedis();

  if (client) {
    return client.get<DocAnnotations>(`annotations:${docId}`);
  }

  return readJSONFile<DocAnnotations>(
    path.join(DATA_DIR, "docs", `doc-${docId}.annotations.json`)
  );
}

export async function saveAnnotations(
  annotations: DocAnnotations
): Promise<void> {
  const client = await getRedis();

  if (client) {
    await client.set(`annotations:${annotations.docId}`, annotations);
    return;
  }

  const dir = path.join(DATA_DIR, "docs");
  await ensureDir(dir);
  await writeJSONFile(
    path.join(dir, `doc-${annotations.docId}.annotations.json`),
    annotations
  );
}

// ─── Library Operations ───────────────────────────────────────────────────────

export async function getLibrary(
  workspaceId: string
): Promise<Library> {
  const client = await getRedis();

  const defaultLibrary: Library = {
    workspaceId,
    entries: [],
    categories: ["Business Logic", "Service Rules", "Tech Constraints", "Design Decisions"],
  };

  if (client) {
    const data = await client.get<Library>(`library:${workspaceId}`);
    return data || defaultLibrary;
  }

  const data = await readJSONFile<Library>(
    path.join(DATA_DIR, "library", `library-${workspaceId}.json`)
  );
  return data || defaultLibrary;
}

export async function saveLibrary(library: Library): Promise<void> {
  const client = await getRedis();

  if (client) {
    await client.set(`library:${library.workspaceId}`, library);
    return;
  }

  const dir = path.join(DATA_DIR, "library");
  await ensureDir(dir);
  await writeJSONFile(
    path.join(dir, `library-${library.workspaceId}.json`),
    library
  );
}

// ─── Image Operations ─────────────────────────────────────────────────────────
// Note: Images still use file system - for production, consider using Vercel Blob

export async function saveImage(
  nodeId: string,
  filename: string,
  data: Buffer
): Promise<string> {
  const client = await getRedis();

  if (client) {
    // Store image as base64 in Redis (not ideal for large images, but works for small ones)
    const name = `${nodeId}-${filename}`;
    await client.set(`image:${name}`, data.toString("base64"));
    return `/api/images/${name}`;
  }

  const dir = path.join(DATA_DIR, "images");
  await ensureDir(dir);
  const name = `${nodeId}-${filename}`;
  await fs.writeFile(path.join(dir, name), data);
  return `/api/images/${name}`;
}

export async function getImage(name: string): Promise<Buffer | null> {
  const client = await getRedis();

  if (client) {
    const base64 = await client.get<string>(`image:${name}`);
    if (base64) {
      return Buffer.from(base64, "base64");
    }
    return null;
  }

  try {
    return await fs.readFile(path.join(DATA_DIR, "images", name));
  } catch {
    return null;
  }
}

// ─── Data Migration Helper ────────────────────────────────────────────────────

export async function migrateToRedis(): Promise<{ success: boolean; migrated: string[] }> {
  const client = await getRedis();
  if (!client) {
    return { success: false, migrated: [] };
  }

  const migrated: string[] = [];

  try {
    // Migrate workspaces
    const workspacesDir = path.join(DATA_DIR, "workspaces");
    const workspaceFiles = await fs.readdir(workspacesDir).catch(() => []);
    for (const file of workspaceFiles) {
      if (file.endsWith(".json")) {
        const workspace = await readJSONFile<Workspace>(path.join(workspacesDir, file));
        if (workspace) {
          await client.set(`workspace:${workspace.id}`, workspace);
          migrated.push(`workspace:${workspace.id}`);
        }
      }
    }

    // Migrate projects
    const projectsDir = path.join(DATA_DIR, "projects");
    const projectFiles = await fs.readdir(projectsDir).catch(() => []);
    for (const file of projectFiles) {
      if (file.endsWith(".json")) {
        const project = await readJSONFile<Project>(path.join(projectsDir, file));
        if (project) {
          await client.set(`project:${project.id}`, project);
          migrated.push(`project:${project.id}`);
        }
      }
    }

    // Migrate libraries
    const libraryDir = path.join(DATA_DIR, "library");
    const libraryFiles = await fs.readdir(libraryDir).catch(() => []);
    for (const file of libraryFiles) {
      if (file.endsWith(".json")) {
        const library = await readJSONFile<Library>(path.join(libraryDir, file));
        if (library) {
          await client.set(`library:${library.workspaceId}`, library);
          migrated.push(`library:${library.workspaceId}`);
        }
      }
    }

    // Migrate docs
    const docsDir = path.join(DATA_DIR, "docs");
    const docFiles = await fs.readdir(docsDir).catch(() => []);
    for (const file of docFiles) {
      if (file.endsWith(".md")) {
        const docId = file.replace("doc-", "").replace(".md", "");
        const content = await fs.readFile(path.join(docsDir, file), "utf-8");
        await client.set(`doc:${docId}`, content);
        migrated.push(`doc:${docId}`);
      } else if (file.includes(".annotations.json")) {
        const annotations = await readJSONFile<DocAnnotations>(path.join(docsDir, file));
        if (annotations) {
          await client.set(`annotations:${annotations.docId}`, annotations);
          migrated.push(`annotations:${annotations.docId}`);
        }
      }
    }

    return { success: true, migrated };
  } catch (error) {
    console.error("Migration error:", error);
    return { success: false, migrated };
  }
}
