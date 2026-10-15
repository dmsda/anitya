import { getDB } from './db';
import type { Note, NoteType } from '../schemas/types';

export class NoteRepository {
  static async getAll(): Promise<Note[]> {
    const db = await getDB();
    const notes = await db.getAllFromIndex('notes', 'by-updatedAt');
    return notes.reverse(); // newest first
  }

  static async getById(id: string): Promise<Note | undefined> {
    const db = await getDB();
    return db.get('notes', id);
  }

  static async getByType(type: NoteType): Promise<Note[]> {
    const db = await getDB();
    const notes = await db.getAllFromIndex('notes', 'by-type', type);
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async getBySourceUrl(sourceUrl: string): Promise<Note[]> {
    const db = await getDB();
    const notes = await db.getAllFromIndex('notes', 'by-sourceUrl', sourceUrl);
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async getByCollection(collectionId: string): Promise<Note[]> {
    const db = await getDB();
    const notes = await db.getAllFromIndex('notes', 'by-collection', collectionId);
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async save(note: Note): Promise<Note> {
    const db = await getDB();
    const updatedNote: Note = {
      ...note,
      updatedAt: Date.now(),
      createdAt: note.createdAt || Date.now(),
    };
    await db.put('notes', updatedNote);
    return updatedNote;
  }

  static async create(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note> {
    const now = Date.now();
    const newNote: Note = {
      id: data.id || 'note_' + Math.random().toString(36).substring(2, 9) + '_' + now,
      title: data.title || 'Untitled Note',
      contentMarkdown: data.contentMarkdown || '',
      sourceUrl: data.sourceUrl,
      sourceTitle: data.sourceTitle,
      sourceDomain: data.sourceDomain,
      type: data.type,
      collectionId: data.collectionId,
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDB();
    await db.put('notes', newNote);
    return newNote;
  }

  static async delete(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['notes', 'highlights', 'videoNotes', 'screenshots'], 'readwrite');

    // 1. Delete primary note
    await tx.objectStore('notes').delete(id);

    // 2. Cascade delete child video notes
    const vnoteIndex = tx.objectStore('videoNotes').index('by-noteId');
    let vnoteCursor = await vnoteIndex.openCursor(IDBKeyRange.only(id));
    while (vnoteCursor) {
      await vnoteCursor.delete();
      vnoteCursor = await vnoteCursor.continue();
    }

    // 3. Cascade delete screenshots to reclaim quota
    const shotIndex = tx.objectStore('screenshots').index('by-noteId');
    let shotCursor = await shotIndex.openCursor(IDBKeyRange.only(id));
    while (shotCursor) {
      await shotCursor.delete();
      shotCursor = await shotCursor.continue();
    }

    // 4. Unlink highlights from this note without deleting page annotations
    const hlIndex = tx.objectStore('highlights').index('by-noteId');
    let hlCursor = await hlIndex.openCursor(IDBKeyRange.only(id));
    while (hlCursor) {
      const hl = hlCursor.value;
      delete hl.noteId;
      hl.updatedAt = Date.now();
      await hlCursor.update(hl);
      hlCursor = await hlCursor.continue();
    }

    await tx.done;
  }

  static async search(query: string, tag?: string, type?: NoteType): Promise<Note[]> {
    const notes = await this.getAll();
    const q = query.trim().toLowerCase();

    return notes.filter((n) => {
      if (type && n.type !== type) return false;
      if (tag && !n.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
      if (!q) return true;

      const titleMatch = n.title.toLowerCase().includes(q);
      const contentMatch = n.contentMarkdown.toLowerCase().includes(q);
      const tagMatch = n.tags.some((t) => t.toLowerCase().includes(q));
      const sourceMatch = (n.sourceTitle?.toLowerCase().includes(q) || n.sourceUrl?.toLowerCase().includes(q)) ?? false;

      return titleMatch || contentMatch || tagMatch || sourceMatch;
    });
  }
}
