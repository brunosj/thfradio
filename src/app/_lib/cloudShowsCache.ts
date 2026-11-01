import { promises as fs } from 'fs';
import path from 'path';
import type { CloudShowTypes } from '@/types/ResponsesInterface';
import { fetchCloudShowsWithStatus } from './shows';

// ---------------------------------------------------------------------------
// Archive recordings (Mixcloud + SoundCloud), kept on the server:
// - served from memory, refreshed in the background every 6 hours;
// - a failed or incomplete fetch (e.g. SoundCloud 401) never replaces a good
//   list, it's retried after 15 minutes;
// - the last good list is also written to .next/cache, so a restart or deploy
//   starts with the full archive instead of fetching (or failing) first.
// ---------------------------------------------------------------------------

const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;
const FILE = path.join(process.cwd(), '.next', 'cache', 'thf-cloud-shows.json');

type Entry = { shows: CloudShowTypes[]; fetchedAt: number; complete: boolean };

let memory: Entry | null = null;
let nextRefreshAt = 0;
let loadedFromDisk = false;
let inflight: Promise<Entry> | null = null;

async function readDisk(): Promise<Entry | null> {
  try {
    const data = JSON.parse(await fs.readFile(FILE, 'utf8')) as Entry;
    return Array.isArray(data?.shows) && data.shows.length ? data : null;
  } catch {
    return null;
  }
}

async function writeDisk(entry: Entry) {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(entry));
  } catch (error) {
    console.error('cloudShowsCache: could not write', FILE, error);
  }
}

function refresh(): Promise<Entry> {
  inflight ??= (async () => {
    const { shows, complete } = await fetchCloudShowsWithStatus();
    const keepOld = !complete && memory && memory.shows.length > shows.length;
    if (keepOld) {
      console.error(
        `cloudShowsCache: incomplete fetch (${shows.length}), keeping last good list (${memory!.shows.length})`,
      );
      nextRefreshAt = Date.now() + RETRY_MS;
      return memory!;
    }
    memory = { shows, fetchedAt: Date.now(), complete };
    nextRefreshAt = Date.now() + (complete ? MAX_AGE_MS : RETRY_MS);
    if (complete) await writeDisk(memory);
    return memory;
  })()
    .catch((error) => {
      console.error('cloudShowsCache: refresh failed', error);
      nextRefreshAt = Date.now() + RETRY_MS;
      if (memory) return memory;
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** All archive recordings; never waits on SoundCloud once a list exists. */
export async function getCloudShows(): Promise<CloudShowTypes[]> {
  if (!memory && !loadedFromDisk) {
    loadedFromDisk = true;
    const disk = await readDisk();
    if (disk) {
      memory = disk;
      nextRefreshAt = disk.fetchedAt + MAX_AGE_MS;
    }
  }
  if (!memory) return (await refresh()).shows;
  if (Date.now() >= nextRefreshAt) void refresh();
  return memory.shows;
}

/** New upload: fetch again in the background (the current list stays until then). */
export function refreshCloudShows(): void {
  void refresh();
}
