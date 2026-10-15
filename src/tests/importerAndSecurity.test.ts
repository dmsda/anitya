import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { JsonImporter } from '../modules/export/jsonExporter';
import { NoteRepository } from '../repositories/noteRepository';
import { HighlightRepository } from '../repositories/highlightRepository';
import { clearAllLocalData } from '../repositories/db';

describe('JsonImporter & Security Sanitization Tests', () => {
  beforeEach(async () => {
    await clearAllLocalData();
  });

  it('validates and imports full backup JSON data into IndexedDB', async () => {
    const backupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: [
        {
          id: 'imported_note_1',
          title: 'Imported System Note',
          contentMarkdown: 'Testing backup restoration capabilities.',
          type: 'quick',
          tags: ['backup', 'imported'],
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        },
      ],
      highlights: [
        {
          id: 'imported_hl_1',
          sourceUrl: 'https://example.com/imported',
          exactText: 'Restored highlight text',
          prefix: '',
          suffix: '',
          color: '#fef08a',
          anchorStatus: 'anchored',
          selectorVersion: 1,
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        },
      ],
      collections: [
        {
          id: 'col_import',
          name: 'Imported Archive',
          color: '#6366f1',
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        },
      ],
      videoNotes: [],
    };

    const res = await JsonImporter.importBackup(JSON.stringify(backupPayload));
    expect(res.notesImported).toBe(1);
    expect(res.highlightsImported).toBe(1);
    expect(res.collectionsImported).toBe(1);

    const fetchedNote = await NoteRepository.getById('imported_note_1');
    expect(fetchedNote).toBeDefined();
    expect(fetchedNote?.title).toBe('Imported System Note');

    const fetchedHl = await HighlightRepository.getById('imported_hl_1');
    expect(fetchedHl).toBeDefined();
    expect(fetchedHl?.exactText).toBe('Restored highlight text');
  });

  it('rejects malformed or invalid backup files without touching storage', async () => {
    // 1. Invalid JSON syntax
    await expect(JsonImporter.importBackup('not valid json {[[')).rejects.toThrow('Malformed JSON syntax');

    // 2. Missing version
    await expect(
      JsonImporter.importBackup(JSON.stringify({ notes: [], highlights: [] }))
    ).rejects.toThrow('Unsupported or missing backup version');

    // 3. Corrupt note records
    await expect(
      JsonImporter.importBackup(
        JSON.stringify({
          version: 1,
          notes: [{ title: 'No ID note' }],
          highlights: [],
          collections: [],
          videoNotes: [],
        })
      )
    ).rejects.toThrow('Invalid note record');
  });

  it('escapes raw HTML characters safely to prevent injection', () => {
    function escapeHtml(str: string): string {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    const untrusted = '<script>alert("xss")</script><img src="x" onerror="evil()"/>&"\'';
    const safe = escapeHtml(untrusted);

    expect(safe).not.toContain('<script>');
    expect(safe).not.toContain('<img');
    expect(safe).toContain('&lt;script&gt;');
    expect(safe).toContain('&lt;img');
    expect(safe).toContain('&amp;');
    expect(safe).toContain('&quot;');
    expect(safe).toContain('&#39;');
  });
});
