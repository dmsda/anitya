import type { Note, Highlight, NoteType } from '../../schemas/types';
import { NoteRepository } from '../../repositories/noteRepository';
import { HighlightRepository } from '../../repositories/highlightRepository';

export interface SearchFilter {
  query?: string;
  type?: NoteType;
  collectionId?: string;
  tag?: string;
  domain?: string;
  startDate?: number;
  endDate?: number;
  sortBy?: 'newest' | 'oldest' | 'relevance';
}

export interface SearchResultItem {
  type: 'note' | 'highlight';
  note?: Note;
  highlight?: Highlight;
  score: number;
}

export class SearchEngine {
  static async search(filter: SearchFilter): Promise<SearchResultItem[]> {
    const [allNotes, allHighlights] = await Promise.all([
      NoteRepository.getAll(),
      HighlightRepository.getAll(),
    ]);

    const q = (filter.query || '').trim().toLowerCase();
    const results: SearchResultItem[] = [];

    // Search Notes
    for (const note of allNotes) {
      if (filter.type && note.type !== filter.type) continue;
      if (filter.collectionId && note.collectionId !== filter.collectionId) continue;
      if (filter.tag && !note.tags.some((t) => t.toLowerCase() === filter.tag?.toLowerCase())) continue;
      if (filter.domain && note.sourceDomain?.toLowerCase() !== filter.domain.toLowerCase()) continue;
      if (filter.startDate && note.createdAt < filter.startDate) continue;
      if (filter.endDate && note.createdAt > filter.endDate) continue;

      let score = 0;
      if (!q) {
        score = 1;
      } else {
        const titleLower = note.title.toLowerCase();
        const contentLower = note.contentMarkdown.toLowerCase();

        if (titleLower.includes(q)) score += 10;
        if (contentLower.includes(q)) score += 5;
        if (note.tags.some((t) => t.toLowerCase().includes(q))) score += 4;
        if (note.sourceTitle?.toLowerCase().includes(q)) score += 2;
      }

      if (score > 0) {
        results.push({ type: 'note', note, score });
      }
    }

    // Search Highlights
    if ((!filter.type || filter.type === 'web') && !filter.collectionId && !filter.tag) {
      for (const hl of allHighlights) {
        if (filter.domain) {
          try {
            const hlDomain = new URL(hl.sourceUrl).hostname;
            if (hlDomain.toLowerCase() !== filter.domain.toLowerCase()) continue;
          } catch {
            continue;
          }
        }
        if (filter.startDate && hl.createdAt < filter.startDate) continue;
        if (filter.endDate && hl.createdAt > filter.endDate) continue;

        let score = 0;
        if (!q) {
          score = 0.8;
        } else {
          const exactLower = hl.exactText.toLowerCase();
          const annoLower = (hl.annotation || '').toLowerCase();

          if (annoLower.includes(q)) score += 8;
          if (exactLower.includes(q)) score += 5;
        }

        if (score > 0) {
          results.push({ type: 'highlight', highlight: hl, score });
        }
      }
    }

    // Sorting
    const sort = filter.sortBy || 'newest';
    results.sort((a, b) => {
      if (sort === 'relevance') {
        return b.score - a.score;
      }
      const timeA = a.type === 'note' ? a.note!.updatedAt : a.highlight!.createdAt;
      const timeB = b.type === 'note' ? b.note!.updatedAt : b.highlight!.createdAt;
      return sort === 'oldest' ? timeA - timeB : timeB - timeA;
    });

    return results;
  }

  static getUniqueTags(notes: Note[]): string[] {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }

  static getUniqueDomains(notes: Note[]): string[] {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.sourceDomain) set.add(n.sourceDomain);
    });
    return Array.from(set).sort();
  }
}
