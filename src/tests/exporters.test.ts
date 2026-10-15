import { describe, it, expect } from 'vitest';
import { MarkdownExporter } from '../modules/export/markdownExporter';
import { CsvExporter } from '../modules/export/jsonExporter';
import { TranscriptExporters } from '../modules/transcript/exporters';
import type { Note, Highlight, VideoNote, TranscriptSegment } from '../schemas/types';

describe('Export Center Modules', () => {
  const dummyNote: Note = {
    id: 'note_123',
    title: 'Acitya Research Guide',
    contentMarkdown: 'This is the main body of our test note.',
    sourceUrl: 'https://example.com/research',
    sourceTitle: 'Example Research Page',
    sourceDomain: 'example.com',
    type: 'web',
    tags: ['research', 'ai'],
    createdAt: 1700000000000,
    updatedAt: 1700000500000,
  };

  const dummyHighlights: Highlight[] = [
    {
      id: 'hl_1',
      sourceUrl: 'https://example.com/research',
      exactText: 'Local-first architecture guarantees privacy.',
      prefix: 'Why? ',
      suffix: ' Furthermore...',
      color: '#fef08a',
      annotation: 'Key principle',
      selectorVersion: 1,
      anchorStatus: 'anchored',
      createdAt: 1700000100000,
      updatedAt: 1700000100000,
    },
  ];

  const dummyVideoNotes: VideoNote[] = [
    {
      id: 'vn_1',
      noteId: 'note_123',
      videoId: 'vid_abc',
      videoUrl: 'https://youtube.com/watch?v=vid_abc',
      timestampSeconds: 65,
      timestampOffset: 5,
      text: 'Explanation of prompt engineering',
      createdAt: 1700000200000,
    },
  ];

  it('generates valid Obsidian-compatible YAML frontmatter in Markdown export', () => {
    const md = MarkdownExporter.exportNote(dummyNote, dummyHighlights, dummyVideoNotes);
    expect(md).toContain('---');
    expect(md).toContain('title: "Acitya Research Guide"');
    expect(md).toContain('source: "https://example.com/research"');
    expect(md).toContain('type: "web"');
    expect(md).toContain('- research');
    expect(md).toContain('- ai');
    expect(md).toContain('# Acitya Research Guide');
    expect(md).toContain('## Highlights (1)');
    expect(md).toContain('Local-first architecture guarantees privacy.');
    expect(md).toContain('## Video Notes (1)');
    expect(md).toContain('01:05');
  });

  it('generates CSV string with proper header and row escaping', () => {
    const csv = CsvExporter.notesToCsv([dummyNote]);
    expect(csv).toContain('ID,Title,Type,Domain,Source URL,Tags,Created At,Updated At');
    expect(csv).toContain('Acitya Research Guide');
    expect(csv).toContain('research; ai');
  });

  it('exports transcript segments into valid WebVTT and SubRip formats', () => {
    const segments: TranscriptSegment[] = [
      { id: '1', videoId: 'v1', startMs: 1500, endMs: 4000, text: 'Hello and welcome.' },
      { id: '2', videoId: 'v1', startMs: 4200, endMs: 7000, text: 'Today we discuss AI.' },
    ];

    const vtt = TranscriptExporters.toVtt(segments);
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('00:00:01.500 --> 00:00:04.000');
    expect(vtt).toContain('Hello and welcome.');

    const srt = TranscriptExporters.toSrt(segments);
    expect(srt).toContain('00:00:01,500 --> 00:00:04,000');
  });
});
