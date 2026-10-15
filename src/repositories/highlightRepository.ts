import { getDB } from './db';
import type { Highlight } from '../schemas/types';

export class HighlightRepository {
  static async getAll(): Promise<Highlight[]> {
    const db = await getDB();
    const highlights = await db.getAllFromIndex('highlights', 'by-createdAt');
    return highlights.reverse();
  }

  static async getById(id: string): Promise<Highlight | undefined> {
    const db = await getDB();
    return db.get('highlights', id);
  }

  static async getBySourceUrl(sourceUrl: string): Promise<Highlight[]> {
    const db = await getDB();
    const highlights = await db.getAllFromIndex('highlights', 'by-sourceUrl', sourceUrl);
    return highlights.sort((a, b) => a.createdAt - b.createdAt);
  }

  static async getByNoteId(noteId: string): Promise<Highlight[]> {
    const db = await getDB();
    const highlights = await db.getAllFromIndex('highlights', 'by-noteId', noteId);
    return highlights.sort((a, b) => a.createdAt - b.createdAt);
  }

  static async save(highlight: Highlight): Promise<Highlight> {
    const db = await getDB();
    const updated: Highlight = {
      ...highlight,
      updatedAt: Date.now(),
      createdAt: highlight.createdAt || Date.now(),
    };
    await db.put('highlights', updated);
    return updated;
  }

  static async create(data: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Highlight> {
    const now = Date.now();
    const newHighlight: Highlight = {
      id: data.id || 'hl_' + Math.random().toString(36).substring(2, 9) + '_' + now,
      noteId: data.noteId,
      sourceUrl: data.sourceUrl,
      exactText: data.exactText,
      prefix: data.prefix || '',
      suffix: data.suffix || '',
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      color: data.color || '#fef08a',
      annotation: data.annotation,
      selectorVersion: data.selectorVersion || 1,
      anchorStatus: data.anchorStatus || 'anchored',
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDB();
    await db.put('highlights', newHighlight);
    return newHighlight;
  }

  static async updateStatus(id: string, anchorStatus: Highlight['anchorStatus']): Promise<void> {
    const db = await getDB();
    const hl = await db.get('highlights', id);
    if (hl) {
      hl.anchorStatus = anchorStatus;
      hl.updatedAt = Date.now();
      await db.put('highlights', hl);
    }
  }

  static async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('highlights', id);
  }

  static async deleteBySourceUrl(sourceUrl: string): Promise<void> {
    const items = await this.getBySourceUrl(sourceUrl);
    const db = await getDB();
    const tx = db.transaction('highlights', 'readwrite');
    for (const item of items) {
      tx.store.delete(item.id);
    }
    await tx.done;
  }
}
