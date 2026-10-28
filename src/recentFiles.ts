/**
 * History of opened files, kept in IndexedDB. Entries store a *reference* to the file
 * (a FileSystemFileHandle where the browser provides one), never its contents, so a
 * 2GB PDF costs a few bytes here and is reopened straight from disk.
 */
export interface RecentFile {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  openedAt: number;
  /** Last page viewed, restored on reopen. */
  page: number;
  handle?: FileSystemFileHandle;
}

const DB_NAME = "velo-pdf";
const STORE = "recent";
const MAX_ENTRIES = 30;

export const recentId = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const request = op(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listRecent(): Promise<RecentFile[]> {
  const all = await run<RecentFile[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.openedAt - a.openedAt);
}

export async function getRecent(id: string): Promise<RecentFile | undefined> {
  return run<RecentFile | undefined>("readonly", (s) => s.get(id));
}

export async function saveRecent(file: File, handle?: FileSystemFileHandle): Promise<RecentFile> {
  const id = recentId(file);
  const previous = await getRecent(id);
  const entry: RecentFile = {
    id,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    openedAt: Date.now(),
    page: previous?.page ?? 1,
    handle: handle ?? previous?.handle,
  };
  await run("readwrite", (s) => s.put(entry));
  const all = await listRecent();
  for (const old of all.slice(MAX_ENTRIES)) await removeRecent(old.id);
  return entry;
}

export async function updatePage(id: string, page: number): Promise<void> {
  const entry = await getRecent(id);
  if (entry && entry.page !== page) await run("readwrite", (s) => s.put({ ...entry, page }));
}

export async function removeRecent(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

export async function clearRecent(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}

/** Gets the file behind a history entry, asking for read permission again if needed. */
export async function fileFromRecent(entry: RecentFile): Promise<File> {
  const handle = entry.handle;
  if (!handle) throw new Error("No saved reference for this file. Open it again from disk.");
  const options = { mode: "read" as const };
  if ((await handle.queryPermission?.(options)) !== "granted" &&
      (await handle.requestPermission?.(options)) !== "granted") {
    throw new Error("Permission to read the file was denied.");
  }
  return handle.getFile();
}
