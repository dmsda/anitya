import { getDB } from './db';
import type { Screenshot } from '../schemas/types';

export class ScreenshotRepository {
  static async getById(id: string): Promise<Screenshot | undefined> {
    const db = await getDB();
    return db.get('screenshots', id);
  }

  static async getByNoteId(noteId: string): Promise<Screenshot[]> {
    const db = await getDB();
    const list = await db.getAllFromIndex('screenshots', 'by-noteId', noteId);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  static async save(data: {
    noteId?: string;
    blob: Blob;
    mimeType?: string;
    width: number;
    height: number;
    timestampSeconds: number;
  }): Promise<Screenshot> {
    const now = Date.now();
    const screenshot: Screenshot = {
      id: 'shot_' + Math.random().toString(36).substring(2, 9) + '_' + now,
      noteId: data.noteId,
      blob: data.blob,
      mimeType: data.mimeType || 'image/jpeg',
      width: data.width,
      height: data.height,
      timestampSeconds: data.timestampSeconds,
      createdAt: now,
    };

    const db = await getDB();
    await db.put('screenshots', screenshot);
    return screenshot;
  }

  static async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('screenshots', id);
  }

  /**
   * Generates a temporary object URL for displaying the Blob in the UI.
   * Remember to call URL.revokeObjectURL when component unmounts.
   */
  static createBlobUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }
}
