import type { Note, Highlight, Collection, VideoNote } from '../../schemas/types';
import { NoteRepository } from '../../repositories/noteRepository';
import { HighlightRepository } from '../../repositories/highlightRepository';
import { CollectionRepository } from '../../repositories/collectionRepository';
import { VideoNoteRepository } from '../../repositories/videoNoteRepository';

export interface FullBackupData {
  version: number;
  exportedAt: string;
  notes: Note[];
  highlights: Highlight[];
  collections: Collection[];
  videoNotes: VideoNote[];
}

export class JsonExporter {
  static async exportAll(): Promise<FullBackupData> {
    const [notes, highlights, collections, videoNotes] = await Promise.all([
      NoteRepository.getAll(),
      HighlightRepository.getAll(),
      CollectionRepository.getAll(),
      VideoNoteRepository.getAll(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes,
      highlights,
      collections,
      videoNotes,
    };
  }

  static toJsonString(data: FullBackupData): string {
    return JSON.stringify(data, null, 2);
  }
}

export interface ImportResult {
  notesImported: number;
  highlightsImported: number;
  collectionsImported: number;
  videoNotesImported: number;
}

export class JsonImporter {
  static validateBackup(data: unknown): { valid: boolean; error?: string; cleanData?: FullBackupData } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Backup payload must be a JSON object.' };
    }

    const obj = data as Partial<FullBackupData>;

    if (typeof obj.version !== 'number' || obj.version < 1) {
      return { valid: false, error: 'Unsupported or missing backup version.' };
    }

    if (!Array.isArray(obj.notes)) {
      return { valid: false, error: 'Missing or invalid "notes" array in backup.' };
    }

    if (!Array.isArray(obj.highlights)) {
      return { valid: false, error: 'Missing or invalid "highlights" array in backup.' };
    }

    if (!Array.isArray(obj.collections)) {
      return { valid: false, error: 'Missing or invalid "collections" array in backup.' };
    }

    if (!Array.isArray(obj.videoNotes)) {
      return { valid: false, error: 'Missing or invalid "videoNotes" array in backup.' };
    }

    // Validate notes records
    for (const note of obj.notes) {
      if (!note.id || typeof note.title !== 'string' || typeof note.contentMarkdown !== 'string') {
        return { valid: false, error: `Invalid note record encountered (ID: ${note?.id || 'unknown'}).` };
      }
    }

    // Validate highlights records
    for (const hl of obj.highlights) {
      if (!hl.id || typeof hl.exactText !== 'string' || typeof hl.sourceUrl !== 'string') {
        return { valid: false, error: `Invalid highlight record encountered (ID: ${hl?.id || 'unknown'}).` };
      }
    }

    return {
      valid: true,
      cleanData: {
        version: obj.version,
        exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
        notes: obj.notes,
        highlights: obj.highlights,
        collections: obj.collections,
        videoNotes: obj.videoNotes,
      },
    };
  }

  static async importBackup(jsonString: string): Promise<ImportResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Malformed JSON syntax. Please verify the backup file is undamaged.');
    }

    const validation = this.validateBackup(parsed);
    if (!validation.valid || !validation.cleanData) {
      throw new Error(`Data validation failed: ${validation.error}`);
    }

    const data = validation.cleanData;
    const { getDB } = await import('../../repositories/db');
    const db = await getDB();
    const tx = db.transaction(['notes', 'highlights', 'collections', 'videoNotes'], 'readwrite');

    for (const col of data.collections) {
      await tx.objectStore('collections').put(col);
    }
    for (const note of data.notes) {
      await tx.objectStore('notes').put(note);
    }
    for (const hl of data.highlights) {
      await tx.objectStore('highlights').put(hl);
    }
    for (const vn of data.videoNotes) {
      await tx.objectStore('videoNotes').put(vn);
    }

    await tx.done;

    return {
      notesImported: data.notes.length,
      highlightsImported: data.highlights.length,
      collectionsImported: data.collections.length,
      videoNotesImported: data.videoNotes.length,
    };
  }
}

export class CsvExporter {
  static notesToCsv(notes: Note[]): string {
    const headers = ['ID', 'Title', 'Type', 'Domain', 'Source URL', 'Tags', 'Created At', 'Updated At'];
    const rows = notes.map((n) => [
      n.id,
      escapeCsv(n.title),
      n.type,
      n.sourceDomain || '',
      n.sourceUrl || '',
      escapeCsv(n.tags.join('; ')),
      new Date(n.createdAt).toISOString(),
      new Date(n.updatedAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static highlightsToCsv(highlights: Highlight[]): string {
    const headers = ['ID', 'Exact Text', 'Color', 'Annotation', 'Source URL', 'Status', 'Created At'];
    const rows = highlights.map((h) => [
      h.id,
      escapeCsv(h.exactText),
      h.color,
      escapeCsv(h.annotation || ''),
      h.sourceUrl,
      h.anchorStatus,
      new Date(h.createdAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

function escapeCsv(val: string): string {
  if (!val) return '""';
  const clean = val.replace(/"/g, '""');
  return `"${clean}"`;
}

export class HtmlExporter {
  static noteToHtml(note: Note, highlights: Highlight[] = []): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(note.title)} - Acitya Notes</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; background: #f8fafc; }
    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .meta { color: #64748b; font-size: 0.9em; margin-bottom: 24px; }
    .content { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    blockquote { border-left: 4px solid #6366f1; margin: 16px 0; padding: 8px 16px; background: #f1f5f9; border-radius: 0 6px 6px 0; }
    .tag { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 9999px; font-size: 0.8em; margin-right: 6px; }
    .highlight-box { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="content">
    <h1>${escapeHtml(note.title)}</h1>
    <div class="meta">
      <div>Source: <a href="${escapeHtml(note.sourceUrl || '#')}" target="_blank">${escapeHtml(note.sourceTitle || note.sourceUrl || 'Local Note')}</a></div>
      <div>Created: ${new Date(note.createdAt).toLocaleString()}</div>
      ${note.tags.length > 0 ? `<div style="margin-top:6px;">${note.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="body">
      ${escapeHtml(note.contentMarkdown).replace(/\n\n/g, '<p></p>').replace(/\n/g, '<br/>')}
    </div>
    ${
      highlights.length > 0
        ? `<div class="highlight-box">
        <h3>Highlights (${highlights.length})</h3>
        ${highlights
          .map(
            (hl) =>
              `<blockquote style="background:${hl.color}22; border-left-color:${hl.color};">
                <p><strong>"${escapeHtml(hl.exactText)}"</strong></p>
                ${hl.annotation ? `<p style="font-size:0.9em; color:#475569;"><em>Note: ${escapeHtml(hl.annotation)}</em></p>` : ''}
              </blockquote>`
          )
          .join('')}
      </div>`
        : ''
    }
  </div>
</body>
</html>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
