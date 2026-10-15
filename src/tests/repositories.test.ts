import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { NoteRepository } from '../repositories/noteRepository';
import { HighlightRepository } from '../repositories/highlightRepository';
import { VideoNoteRepository } from '../repositories/videoNoteRepository';
import { ScreenshotRepository } from '../repositories/screenshotRepository';
import { CollectionRepository } from '../repositories/collectionRepository';
import { clearAllLocalData } from '../repositories/db';

describe('IndexedDB Repositories Layer', () => {
  beforeEach(async () => {
    await clearAllLocalData();
  });

  it('performs CRUD operations for notes', async () => {
    // Create
    const note = await NoteRepository.create({
      title: 'First Architecture Note',
      contentMarkdown: '# Architecture\nLocal-first and privacy-focused.',
      type: 'quick',
      tags: ['architecture', 'privacy'],
    });

    expect(note.id).toBeDefined();
    expect(note.title).toBe('First Architecture Note');

    // Read
    const fetched = await NoteRepository.getById(note.id);
    expect(fetched).toBeDefined();
    expect(fetched?.tags).toContain('architecture');

    // Update
    fetched!.title = 'Updated Architecture Note';
    await NoteRepository.save(fetched!);

    const updated = await NoteRepository.getById(note.id);
    expect(updated?.title).toBe('Updated Architecture Note');

    // Delete
    await NoteRepository.delete(note.id);
    const deleted = await NoteRepository.getById(note.id);
    expect(deleted).toBeUndefined();
  });

  it('manages highlights with W3C metadata and status', async () => {
    const hl = await HighlightRepository.create({
      sourceUrl: 'https://example.com/w3c',
      exactText: 'Web Annotation standard',
      prefix: 'Following ',
      suffix: ' guidelines.',
      color: '#fef08a',
      annotation: 'Important spec',
      anchorStatus: 'anchored',
      selectorVersion: 1,
    });

    expect(hl.id).toBeDefined();

    // Query by sourceUrl
    const list = await HighlightRepository.getBySourceUrl('https://example.com/w3c');
    expect(list.length).toBe(1);
    expect(list[0]?.exactText).toBe('Web Annotation standard');

    // Update status to unresolved
    await HighlightRepository.updateStatus(hl.id, 'unresolved');
    const updated = await HighlightRepository.getById(hl.id);
    expect(updated?.anchorStatus).toBe('unresolved');
  });

  it('stores video notes and preserves reaction offset and timestamps', async () => {
    const vnote = await VideoNoteRepository.create({
      noteId: 'note_video_1',
      videoId: 'v12345',
      videoUrl: 'https://youtube.com/watch?v=v12345',
      timestampSeconds: 125,
      timestampOffset: 5,
      text: 'Key insight in the lecture',
    });

    expect(vnote.id).toBeDefined();
    expect(vnote.timestampSeconds).toBe(125);
    expect(vnote.timestampOffset).toBe(5);

    const list = await VideoNoteRepository.getByVideoId('v12345');
    expect(list.length).toBe(1);
    expect(list[0]?.text).toBe('Key insight in the lecture');
  });

  it('creates and organizes notebooks into collections', async () => {
    const col = await CollectionRepository.create({
      name: 'Computer Science',
      description: 'Lectures and articles on CS',
      color: '#6366f1',
    });

    expect(col.id).toBeDefined();
    expect(col.name).toBe('Computer Science');

    const all = await CollectionRepository.getAll();
    expect(all.length).toBe(1);
  });

  it('erases all local data cleanly when requested by user', async () => {
    await NoteRepository.create({ title: 'To be erased', contentMarkdown: 'delete me', type: 'quick', tags: [] });
    await HighlightRepository.create({ sourceUrl: 'https://erase.me', exactText: 'gone', prefix: '', suffix: '', color: '#fff', anchorStatus: 'anchored', selectorVersion: 1 });

    const beforeNotes = await NoteRepository.getAll();
    expect(beforeNotes.length).toBe(1);

    await clearAllLocalData();

    const afterNotes = await NoteRepository.getAll();
    const afterHls = await HighlightRepository.getAll();
    expect(afterNotes.length).toBe(0);
    expect(afterHls.length).toBe(0);
  });

  it('cascades deletion: deletes child videoNotes and screenshots, and unlinks highlights when a note is deleted', async () => {
    // 1. Create parent note
    const note = await NoteRepository.create({
      title: 'Parent Note for Cascade Test',
      contentMarkdown: 'Testing cascade removal.',
      type: 'video',
      tags: ['cascade-test'],
    });

    // 2. Create child video note
    const vnote = await VideoNoteRepository.create({
      noteId: note.id,
      videoId: 'v_cascade_1',
      videoUrl: 'https://youtube.com/watch?v=v_cascade_1',
      timestampSeconds: 42,
      text: 'Cascade child note',
    });

    // 3. Create child screenshot
    const shot = await ScreenshotRepository.save({
      noteId: note.id,
      blob: new Blob(['fake_image_bytes'], { type: 'image/jpeg' }),
      width: 1280,
      height: 720,
      timestampSeconds: 42,
    });

    // 4. Create child highlight bound to this note
    const hl = await HighlightRepository.create({
      noteId: note.id,
      sourceUrl: 'https://example.com/cascade',
      exactText: 'Cascade highlight text',
      prefix: '',
      suffix: '',
      color: '#fef08a',
      anchorStatus: 'anchored',
      selectorVersion: 1,
    });

    // Verify initial relationship exists
    expect(await VideoNoteRepository.getByNoteId(note.id)).toHaveLength(1);
    expect(await ScreenshotRepository.getByNoteId(note.id)).toHaveLength(1);
    const hlBefore = await HighlightRepository.getById(hl.id);
    expect(hlBefore?.noteId).toBe(note.id);

    // 5. Delete parent note
    await NoteRepository.delete(note.id);

    // 6. Assertions: parent note is gone
    expect(await NoteRepository.getById(note.id)).toBeUndefined();

    // Associated video notes and screenshots are completely wiped
    expect(await VideoNoteRepository.getByNoteId(note.id)).toHaveLength(0);
    expect(await ScreenshotRepository.getByNoteId(note.id)).toHaveLength(0);
    expect(await ScreenshotRepository.getById(shot.id)).toBeUndefined();

    // Associated highlight is preserved for web page reading, but detached from note
    const hlAfter = await HighlightRepository.getById(hl.id);
    expect(hlAfter).toBeDefined();
    expect(hlAfter?.noteId).toBeUndefined();
  });
});
