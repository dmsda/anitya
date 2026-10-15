import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Note, Highlight, VideoNote, TranscriptSegment, Screenshot, Collection, UserSettings } from '../schemas/types';

export const DB_NAME = 'acitya_db';
export const DB_VERSION = 1;

export interface AcityaDBSchema extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      'by-updatedAt': number;
      'by-type': string;
      'by-collection': string;
      'by-sourceUrl': string;
    };
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: {
      'by-sourceUrl': string;
      'by-noteId': string;
      'by-createdAt': number;
    };
  };
  videoNotes: {
    key: string;
    value: VideoNote;
    indexes: {
      'by-noteId': string;
      'by-videoId': string;
      'by-timestamp': number;
    };
  };
  transcriptSegments: {
    key: string;
    value: TranscriptSegment;
    indexes: {
      'by-videoId': string;
      'by-startMs': number;
    };
  };
  screenshots: {
    key: string;
    value: Screenshot;
    indexes: {
      'by-noteId': string;
      'by-createdAt': number;
    };
  };
  collections: {
    key: string;
    value: Collection;
    indexes: {
      'by-name': string;
      'by-updatedAt': number;
    };
  };
  settings: {
    key: string;
    value: { id: string; settings: UserSettings };
  };
}

let dbInstance: IDBPDatabase<AcityaDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<AcityaDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<AcityaDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 1. notes store
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('by-updatedAt', 'updatedAt');
        noteStore.createIndex('by-type', 'type');
        noteStore.createIndex('by-collection', 'collectionId');
        noteStore.createIndex('by-sourceUrl', 'sourceUrl');
      }

      // 2. highlights store
      if (!db.objectStoreNames.contains('highlights')) {
        const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
        highlightStore.createIndex('by-sourceUrl', 'sourceUrl');
        highlightStore.createIndex('by-noteId', 'noteId');
        highlightStore.createIndex('by-createdAt', 'createdAt');
      }

      // 3. videoNotes store
      if (!db.objectStoreNames.contains('videoNotes')) {
        const videoNoteStore = db.createObjectStore('videoNotes', { keyPath: 'id' });
        videoNoteStore.createIndex('by-noteId', 'noteId');
        videoNoteStore.createIndex('by-videoId', 'videoId');
        videoNoteStore.createIndex('by-timestamp', 'timestampSeconds');
      }

      // 4. transcriptSegments store
      if (!db.objectStoreNames.contains('transcriptSegments')) {
        const transcriptStore = db.createObjectStore('transcriptSegments', { keyPath: 'id' });
        transcriptStore.createIndex('by-videoId', 'videoId');
        transcriptStore.createIndex('by-startMs', 'startMs');
      }

      // 5. screenshots store
      if (!db.objectStoreNames.contains('screenshots')) {
        const screenshotStore = db.createObjectStore('screenshots', { keyPath: 'id' });
        screenshotStore.createIndex('by-noteId', 'noteId');
        screenshotStore.createIndex('by-createdAt', 'createdAt');
      }

      // 6. collections store
      if (!db.objectStoreNames.contains('collections')) {
        const collectionStore = db.createObjectStore('collections', { keyPath: 'id' });
        collectionStore.createIndex('by-name', 'name');
        collectionStore.createIndex('by-updatedAt', 'updatedAt');
      }

      // 7. settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });

  dbInstance.onclose = () => {
    dbInstance = null;
  };
  dbInstance.onversionchange = () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  };

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['notes', 'highlights', 'videoNotes', 'transcriptSegments', 'screenshots', 'collections'],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('notes').clear(),
    tx.objectStore('highlights').clear(),
    tx.objectStore('videoNotes').clear(),
    tx.objectStore('transcriptSegments').clear(),
    tx.objectStore('screenshots').clear(),
    tx.objectStore('collections').clear(),
    tx.done,
  ]);
}
