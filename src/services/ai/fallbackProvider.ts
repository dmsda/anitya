import type { AIServiceProvider, ProviderAvailability, AnswerResponse, Flashcard } from './types';
import type { Note } from '../../schemas/types';

export class FallbackAIProvider implements AIServiceProvider {
  readonly id = 'fallback';
  readonly name = 'Acitya Local Rule-Based (Always Available)';

  async checkAvailability(): Promise<ProviderAvailability> {
    return {
      available: true,
      status: 'readily',
      message: 'Local heuristic engine ready (100% offline & private).',
    };
  }

  async summarize(text: string): Promise<string> {
    const sentences = this.splitSentences(text);
    if (sentences.length <= 3) return text.trim();

    // Score sentences by word frequency
    const scores = this.scoreSentences(sentences);
    const topSentences = sentences
      .map((s, i) => ({ sentence: s, score: scores[i] ?? 0, index: i }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(5, Math.ceil(sentences.length * 0.3)))
      .sort((a, b) => a.index - b.index)
      .map((item) => item.sentence);

    return topSentences.join(' ');
  }

  async extractKeyPoints(text: string): Promise<string[]> {
    const sentences = this.splitSentences(text);
    if (sentences.length === 0) return [];

    const scores = this.scoreSentences(sentences);
    const points = sentences
      .map((s, i) => ({ sentence: s, score: scores[i] ?? 0, index: i }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(5, sentences.length))
      .sort((a, b) => a.index - b.index)
      .map((item) => item.sentence);

    return points;
  }

  async extractActionItems(text: string): Promise<string[]> {
    const actionKeywords = [
      'todo',
      'action',
      'must',
      'should',
      'need to',
      'perlu',
      'harus',
      'wajib',
      'akan',
      'implement',
      'create',
      'build',
      'review',
      'follow up',
      'check',
    ];

    const lines = text.split('\n');
    const actions: string[] = [];

    for (const line of lines) {
      const clean = line.replace(/^[-*•\d.]+\s*/, '').trim();
      if (!clean) continue;
      const lower = clean.toLowerCase();
      if (actionKeywords.some((kw) => lower.includes(kw))) {
        actions.push(clean);
      }
    }

    if (actions.length === 0) {
      // Fallback: take imperative sentences
      const sentences = this.splitSentences(text);
      for (const s of sentences) {
        const lower = s.toLowerCase();
        if (actionKeywords.some((kw) => lower.includes(kw))) {
          actions.push(s);
          if (actions.length >= 4) break;
        }
      }
    }

    return actions.length > 0 ? actions : ['Review notes and organize key takeaways.'];
  }

  async answerQuestion(question: string, contextNotes: Note[]): Promise<AnswerResponse> {
    const qWords = question
      .toLowerCase()
      .replace(/[?.,]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const matches: Array<{ note: Note; sentence: string; score: number }> = [];

    for (const note of contextNotes) {
      const text = `${note.title}. ${note.contentMarkdown}`;
      const sentences = this.splitSentences(text);
      for (const s of sentences) {
        const sLower = s.toLowerCase();
        let score = 0;
        for (const word of qWords) {
          if (sLower.includes(word)) score += 1;
        }
        if (score > 0) {
          matches.push({ note, sentence: s, score });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return {
        answer: 'Tidak ditemukan informasi relevan dalam catatan yang tersedia untuk menjawab pertanyaan ini.',
        references: [],
      };
    }

    const topMatches = matches.slice(0, 3);
    const answer = topMatches.map((m) => `• ${m.sentence}`).join('\n\n');
    const refMap = new Map<string, Note>();
    topMatches.forEach((m) => refMap.set(m.note.id, m.note));

    const references = Array.from(refMap.values()).map((n) => ({
      id: n.id,
      title: n.title,
      sourceUrl: n.sourceUrl,
      type: n.type,
    }));

    return { answer, references };
  }

  async suggestTags(text: string): Promise<string[]> {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by', 'with',
      'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'pada', 'adalah', 'sebagai', 'dengan',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    const freq = new Map<string, number>();
    words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);
  }

  async generateFlashcards(text: string): Promise<Flashcard[]> {
    const sentences = this.splitSentences(text);
    const flashcards: Flashcard[] = [];

    for (const s of sentences) {
      if (s.includes(' is ') || s.includes(' are ') || s.includes(' adalah ') || s.includes(' yaitu ')) {
        const parts = s.split(/\b(is|are|adalah|yaitu)\b/i);
        const subject = parts[0]?.trim() || '';
        if (parts.length >= 3 && subject.length > 3) {
          flashcards.push({
            front: `Apa itu ${subject}?`,
            back: s.trim(),
          });
          if (flashcards.length >= 4) break;
        }
      }
    }

    if (flashcards.length === 0 && sentences.length > 0 && sentences[0]) {
      flashcards.push({
        front: 'Poin utama materi',
        back: sentences[0],
      });
    }

    return flashcards;
  }

  private splitSentences(text: string): string[] {
    return text
      .replace(/\n+/g, '. ')
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  private scoreSentences(sentences: string[]): number[] {
    const wordCounts = new Map<string, number>();
    for (const s of sentences) {
      const words = s.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      for (const w of words) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    }

    return sentences.map((s) => {
      const words = s.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      let score = 0;
      for (const w of words) {
        score += wordCounts.get(w) || 0;
      }
      return words.length > 0 ? score / words.length : 0;
    });
  }
}
