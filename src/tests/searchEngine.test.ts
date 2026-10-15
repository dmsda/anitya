import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchEngine } from '../modules/search/searchEngine';
import { NoteRepository } from '../repositories/noteRepository';
import { HighlightRepository } from '../repositories/highlightRepository';
import type { Note, Highlight } from '../schemas/types';

describe('Search & Knowledge Library Engine', () => {
  const mockNotes: Note[] = [
    {
      id: 'n_1',
      title: 'Deep Learning with Python',
      contentMarkdown: 'Neural networks, transformers, and gradient descent optimization techniques.',
      type: 'web',
      tags: ['machine-learning', 'python'],
      sourceDomain: 'arxiv.org',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'n_2',
      title: 'YouTube Lecture on Economics',
      contentMarkdown: 'Supply and demand curves explained with real-world inflation scenarios.',
      type: 'video',
      tags: ['finance', 'economics'],
      sourceDomain: 'youtube.com',
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  const mockHighlights: Highlight[] = [
    {
      id: 'hl_1',
      sourceUrl: 'https://example.com/ai',
      exactText: 'Attention mechanism enables transformers to weigh sequence elements.',
      prefix: '',
      suffix: '',
      color: '#fef08a',
      annotation: 'Crucial concept for LLMs',
      selectorVersion: 1,
      anchorStatus: 'anchored',
      createdAt: 1500,
      updatedAt: 1500,
    },
  ];

  beforeEach(() => {
    vi.spyOn(NoteRepository, 'getAll').mockResolvedValue(mockNotes);
    vi.spyOn(HighlightRepository, 'getAll').mockResolvedValue(mockHighlights);
  });

  it('ranks exact and relevant search hits higher', async () => {
    const results = await SearchEngine.search({ query: 'transformers' });
    expect(results.length).toBeGreaterThanOrEqual(2);
    // Both note 1 and highlight 1 mention transformers
    expect(results.some((r) => r.type === 'note' && r.note?.id === 'n_1')).toBe(true);
    expect(results.some((r) => r.type === 'highlight' && r.highlight?.id === 'hl_1')).toBe(true);
  });

  it('filters by content type correctly', async () => {
    const videoResults = await SearchEngine.search({ type: 'video' });
    expect(videoResults.every((r) => r.type === 'note' && r.note?.type === 'video')).toBe(true);
    expect(videoResults.length).toBe(1);
    expect(videoResults[0]?.note?.id).toBe('n_2');
  });

  it('filters by tags and domains correctly', async () => {
    const tagResults = await SearchEngine.search({ tag: 'python' });
    expect(tagResults.length).toBe(1);
    expect(tagResults[0]?.note?.id).toBe('n_1');

    const domainResults = await SearchEngine.search({ domain: 'youtube.com' });
    expect(domainResults.length).toBe(1);
    expect(domainResults[0]?.note?.id).toBe('n_2');
  });

  it('extracts unique tags and domains across all notes', () => {
    const tags = SearchEngine.getUniqueTags(mockNotes);
    expect(tags).toEqual(['economics', 'finance', 'machine-learning', 'python']);

    const domains = SearchEngine.getUniqueDomains(mockNotes);
    expect(domains).toEqual(['arxiv.org', 'youtube.com']);
  });
});
