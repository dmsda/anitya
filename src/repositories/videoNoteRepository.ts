import { getDB } from './db';
import type { VideoNote } from '../schemas/types';

export class VideoNoteRepository {
  static async getAll(): Promise<VideoNote[]> {
    const db = await getDB();
    const notes = await db.getAll('videoNotes');
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  }

  static async getById(id: string): Promise<VideoNote | undefined> {
    const db = await getDB();
    return db.get('videoNotes', id);
  }

  static async getByVideoId(videoId: string): Promise<VideoNote[]> {
    const db = await getDB();
    const notes = await db.getAllFromIndex('videoNotes', 'by-videoId', videoId);
    return notes.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  }

  static async getByNoteId(noteId: string): Promise<VideoNote[]> {
    const db = await getDB();
    const notes = await db.getAllFromIndex('videoNotes', 'by-noteId', noteId);
    return notes.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  }

  static async create(
    data: Omit<VideoNote, 'id' | 'createdAt' | 'timestampOffset'> & { id?: string; timestampOffset?: number }
  ): Promise<VideoNote> {
    const now = Date.now();
    const note: VideoNote = {
      id: data.id || 'vnote_' + Math.random().toString(36).substring(2, 9) + '_' + now,
      noteId: data.noteId,
      videoId: data.videoId,
      videoUrl: data.videoUrl,
      timestampSeconds: Math.max(0, data.timestampSeconds),
      timestampOffset: data.timestampOffset || 0,
      text: data.text,
      screenshotId: data.screenshotId,
      createdAt: now,
    };
    const db = await getDB();
    await db.put('videoNotes', note);
    return note;
  }

  static async update(id: string, text: string): Promise<VideoNote | undefined> {
    const db = await getDB();
    const note = await db.get('videoNotes', id);
    if (!note) return undefined;
    note.text = text;
    await db.put('videoNotes', note);
    return note;
  }

  static async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('videoNotes', id);
  }
}
