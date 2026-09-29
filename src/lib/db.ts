import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { overflow, planVisit, type Visit } from "./history.ts";

export interface HistoryEntry extends Visit {
  id: number;
}

export interface Bookmark {
  url: string;
  title: string;
  createdAt: number;
}

interface PhosphurDB extends DBSchema {
  history: {
    key: number;
    value: Visit & { id?: number };
    indexes: { visitedAt: number };
  };
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { createdAt: number };
  };
}

export type DataKind = "history" | "bookmarks";

/** Fires `change` with `detail` = the store that changed, so open views can refresh. */
export const dataEvents = new EventTarget();

function changed(kind: DataKind): void {
  dataEvents.dispatchEvent(new CustomEvent<DataKind>("change", { detail: kind }));
}

let dbPromise: Promise<IDBPDatabase<PhosphurDB>> | null = null;

function db(): Promise<IDBPDatabase<PhosphurDB>> {
  dbPromise ??= openDB<PhosphurDB>("phosphur", 1, {
    upgrade(database) {
      const history = database.createObjectStore("history", { keyPath: "id", autoIncrement: true });
      history.createIndex("visitedAt", "visitedAt");
      const bookmarks = database.createObjectStore("bookmarks", { keyPath: "url" });
      bookmarks.createIndex("createdAt", "createdAt");
    },
  });
  return dbPromise;
}

/** Records a page visit, collapsing consecutive duplicates and trimming to the cap. */
export async function recordVisit(visit: Visit): Promise<void> {
  const tx = (await db()).transaction("history", "readwrite");
  const index = tx.store.index("visitedAt");
  const lastCursor = await index.openCursor(null, "prev");
  const plan = planVisit(lastCursor?.value, visit);

  if (plan === "update-title" && lastCursor) {
    await lastCursor.update({ ...lastCursor.value, title: visit.title });
  } else if (plan === "add") {
    await tx.store.add(visit);
    let excess = overflow(await tx.store.count());
    let cursor = excess > 0 ? await index.openCursor() : null;
    while (cursor && excess > 0) {
      await cursor.delete();
      excess--;
      cursor = await cursor.continue();
    }
  }
  await tx.done;
  if (plan !== "skip") changed("history");
}

/** Most recent history first, optionally filtered by a case-insensitive query. */
export async function listHistory(limit = 200, query = ""): Promise<HistoryEntry[]> {
  const needle = query.trim().toLowerCase();
  const results: HistoryEntry[] = [];
  let cursor = await (
    await db()
  )
    .transaction("history")
    .store.index("visitedAt")
    .openCursor(null, "prev");
  while (cursor && results.length < limit) {
    const entry = cursor.value as HistoryEntry;
    if (
      !needle ||
      entry.title.toLowerCase().includes(needle) ||
      entry.url.toLowerCase().includes(needle)
    ) {
      results.push(entry);
    }
    cursor = await cursor.continue();
  }
  return results;
}

export async function deleteHistoryEntry(id: number): Promise<void> {
  await (await db()).delete("history", id);
  changed("history");
}

export async function clearHistory(): Promise<void> {
  await (await db()).clear("history");
  changed("history");
}

/** Bookmarks, newest first. */
export async function listBookmarks(): Promise<Bookmark[]> {
  const all = await (await db()).getAllFromIndex("bookmarks", "createdAt");
  return all.reverse();
}

export async function isBookmarked(url: string): Promise<boolean> {
  return (await (await db()).getKey("bookmarks", url)) !== undefined;
}

/** Adds or removes a bookmark; resolves to whether the URL is now bookmarked. */
export async function toggleBookmark(url: string, title: string): Promise<boolean> {
  const database = await db();
  const exists = (await database.getKey("bookmarks", url)) !== undefined;
  if (exists) await database.delete("bookmarks", url);
  else await database.put("bookmarks", { url, title: title || url, createdAt: Date.now() });
  changed("bookmarks");
  return !exists;
}

export async function removeBookmark(url: string): Promise<void> {
  await (await db()).delete("bookmarks", url);
  changed("bookmarks");
}
