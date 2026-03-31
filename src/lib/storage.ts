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
// Uses Upstash REST API which is stateless - safe to create per-request in serverless

let Redis: typeof import("@upstash/redis").Redis | null = null;

async function loadRedis() {
  if (Redis === null) {
    try {
      const module = await import("@upstash/redis");
      Redis = module.Redis;
    } catch (error) {
      console.error("Failed to load @upstash/redis:", error);
      Redis = undefined as any; // Mark as failed
    }
  }
  return Redis;
}

async function getRedis(): Promise<import("@upstash/redis").Redis | null> {
  // Only use Redis if credentials are available (production/Vercel)
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const RedisClass = await loadRedis();
  if (!RedisClass) {
    return null;
  }

  try {
    // Upstash REST client is stateless, safe to create per-request
    return new RedisClass({ url, token });
  } catch (error) {
    console.error("Failed to create Redis client:", error);
    return null;
  }
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
      // Redis mode - don't fall back to file system on error
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
      throw error;
    }
  }

  // File system fallback (local development only)
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
    try {
      return await client.get<Workspace>(`workspace:${id}`);
    } catch (error) {
      console.error("Redis getWorkspace error:", error);
      throw error;
    }
  }

  return readJSONFile<Workspace>(
    path.join(DATA_DIR, "workspaces", `workspace-${id}.json`)
  );
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const client = await getRedis();

  if (client) {
    try {
      await client.set(`workspace:${workspace.id}`, workspace);
      return;
    } catch (error) {
      console.error("Redis saveWorkspace error:", error);
      throw error;
    }
  }

  await writeJSONFile(
    path.join(DATA_DIR, "workspaces", `workspace-${workspace.id}.json`),
    workspace
  );
}

export async function deleteWorkspace(id: string): Promise<void> {
  const client = await getRedis();

  if (client) {
    try {
      await client.del(`workspace:${id}`);
      return;
    } catch (error) {
      console.error("Redis deleteWorkspace error:", error);
      throw error;
    }
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
      // Redis mode - don't fall back to file system on error
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
      throw error;
    }
  }

  // File system fallback (local development only)
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
      // Redis mode - don't fall back to file system on error
      return await client.get<Project>(`project:${id}`);
    } catch (error) {
      console.error("Redis getProject error:", error);
      throw error;
    }
  }

  // File system fallback (local development only)
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
    try {
      await client.del(`project:${id}`);
      return;
    } catch (error) {
      console.error("Redis deleteProject error:", error);
      throw error;
    }
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
    try {
      await client.set(`doc:${docId}`, content);
      return;
    } catch (error) {
      console.error("Redis saveDoc error:", error);
      throw error;
    }
  }

  const dir = path.join(DATA_DIR, "docs");
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, `doc-${docId}.md`), content, "utf-8");
}

export async function getDoc(docId: string): Promise<string | null> {
  const client = await getRedis();

  if (client) {
    try {
      return await client.get<string>(`doc:${docId}`);
    } catch (error) {
      console.error("Redis getDoc error:", error);
      throw error;
    }
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
    try {
      await client.del(`doc:${docId}`);
      await client.del(`annotations:${docId}`);
      return;
    } catch (error) {
      console.error("Redis deleteDoc error:", error);
      throw error;
    }
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
    try {
      return await client.get<DocAnnotations>(`annotations:${docId}`);
    } catch (error) {
      console.error("Redis getAnnotations error:", error);
      throw error;
    }
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
    try {
      await client.set(`annotations:${annotations.docId}`, annotations);
      return;
    } catch (error) {
      console.error("Redis saveAnnotations error:", error);
      throw error;
    }
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
    try {
      const data = await client.get<Library>(`library:${workspaceId}`);
      return data || defaultLibrary;
    } catch (error) {
      console.error("Redis getLibrary error:", error);
      throw error;
    }
  }

  const data = await readJSONFile<Library>(
    path.join(DATA_DIR, "library", `library-${workspaceId}.json`)
  );
  return data || defaultLibrary;
}

export async function saveLibrary(library: Library): Promise<void> {
  const client = await getRedis();

  if (client) {
    try {
      await client.set(`library:${library.workspaceId}`, library);
      return;
    } catch (error) {
      console.error("Redis saveLibrary error:", error);
      throw error;
    }
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
    try {
      // Store image as base64 in Redis (not ideal for large images, but works for small ones)
      const name = `${nodeId}-${filename}`;
      await client.set(`image:${name}`, data.toString("base64"));
      return `/api/images/${name}`;
    } catch (error) {
      console.error("Redis saveImage error:", error);
      throw error;
    }
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
    try {
      const base64 = await client.get<string>(`image:${name}`);
      if (base64) {
        return Buffer.from(base64, "base64");
      }
      return null;
    } catch (error) {
      console.error("Redis getImage error:", error);
      throw error;
    }
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
