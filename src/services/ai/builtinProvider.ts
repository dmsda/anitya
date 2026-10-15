import type { AIServiceProvider, ProviderAvailability, AnswerResponse, Flashcard } from './types';
import type { Note } from '../../schemas/types';
import { FallbackAIProvider } from './fallbackProvider';

// Window AI type declarations
declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create(options?: { systemPrompt?: string }): Promise<{
          prompt(text: string): Promise<string>;
          destroy(): void;
        }>;
      };
      summarizer?: {
        capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create(options?: { type?: string; format?: string; length?: string }): Promise<{
          summarize(text: string): Promise<string>;
          destroy(): void;
        }>;
      };
    };
  }
}

export class ChromeBuiltinAIProvider implements AIServiceProvider {
  readonly id = 'builtin';
  readonly name = 'Chrome Built-in AI (Gemini Nano)';
  private fallback = new FallbackAIProvider();

  async checkAvailability(): Promise<ProviderAvailability> {
    if (typeof window === 'undefined' || !window.ai) {
      return {
        available: false,
        status: 'no',
        message: 'Chrome Built-in AI is not detected in this browser. Running local heuristic fallback.',
      };
    }

    try {
      if (window.ai.languageModel) {
        const caps = await window.ai.languageModel.capabilities();
        if (caps.available === 'readily') {
          return {
            available: true,
            status: 'readily',
            message: 'Gemini Nano is downloaded and ready on your device.',
          };
        } else if (caps.available === 'after-download') {
          return {
            available: true,
            status: 'after-download',
            message: 'Gemini Nano is supported but downloading model components...',
          };
        }
      }

      if (window.ai.summarizer) {
        const caps = await window.ai.summarizer.capabilities();
        if (caps.available === 'readily' || caps.available === 'after-download') {
          return {
            available: true,
            status: caps.available,
            message: 'Chrome Summarizer API is ready.',
          };
        }
      }

      return {
        available: false,
        status: 'no',
        message: 'Built-in AI capabilities returned unavailable.',
      };
    } catch (err) {
      return {
        available: false,
        status: 'no',
        message: `Error checking AI capabilities: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async summarize(text: string): Promise<string> {
    // 1. Try Summarizer API
    if (window.ai?.summarizer) {
      try {
        const caps = await window.ai.summarizer.capabilities();
        if (caps.available !== 'no') {
          const summarizer = await window.ai.summarizer.create({ type: 'key-points', length: 'medium' });
          const res = await summarizer.summarize(text);
          summarizer.destroy();
          return res;
        }
      } catch (e) {
        console.warn('Summarizer API failed, trying languageModel:', e);
      }
    }

    // 2. Try Prompt API
    if (window.ai?.languageModel) {
      try {
        const caps = await window.ai.languageModel.capabilities();
        if (caps.available !== 'no') {
          const session = await window.ai.languageModel.create({
            systemPrompt: 'You are a concise, helpful research assistant. Summarize the following content in 3-5 clear bullet points or a concise paragraph.',
          });
          const res = await session.prompt(text);
          session.destroy();
          return res;
        }
      } catch (e) {
        console.warn('Prompt API failed, using local fallback:', e);
      }
    }

    // 3. Fallback
    return this.fallback.summarize(text);
  }

  async extractKeyPoints(text: string): Promise<string[]> {
    if (window.ai?.languageModel) {
      try {
        const session = await window.ai.languageModel.create({
          systemPrompt: 'Extract 3 to 5 key bullet points from the text. Return only the bullet points, one per line starting with -.',
        });
        const res = await session.prompt(text);
        session.destroy();
        return res
          .split('\n')
          .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
          .filter((l) => l.length > 0);
      } catch {
        // fallback
      }
    }
    return this.fallback.extractKeyPoints(text);
  }

  async extractActionItems(text: string): Promise<string[]> {
    if (window.ai?.languageModel) {
      try {
        const session = await window.ai.languageModel.create({
          systemPrompt: 'Extract all actionable tasks, action items, or follow-ups from the text. Return each item on a separate line starting with -.',
        });
        const res = await session.prompt(text);
        session.destroy();
        return res
          .split('\n')
          .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
          .filter((l) => l.length > 0);
      } catch {
        // fallback
      }
    }
    return this.fallback.extractActionItems(text);
  }

  async answerQuestion(question: string, contextNotes: Note[]): Promise<AnswerResponse> {
    if (window.ai?.languageModel && contextNotes.length > 0) {
      try {
        const session = await window.ai.languageModel.create({
          systemPrompt: 'Answer the user question strictly using the provided context notes. If the answer is not in the context, clearly state that it is not covered. Do not hallucinate references.',
        });

        const contextText = contextNotes
          .map((n, i) => `[Source ${i + 1}: "${n.title}"]\n${n.contentMarkdown}`)
          .join('\n\n---\n\n');

        const prompt = `Context Notes:\n${contextText}\n\nQuestion: ${question}\n\nAnswer:`;
        const answer = await session.prompt(prompt);
        session.destroy();

        const references = contextNotes.slice(0, 3).map((n) => ({
          id: n.id,
          title: n.title,
          sourceUrl: n.sourceUrl,
          type: n.type,
        }));

        return { answer, references };
      } catch {
        // fallback
      }
    }
    return this.fallback.answerQuestion(question, contextNotes);
  }

  async suggestTags(text: string): Promise<string[]> {
    if (window.ai?.languageModel) {
      try {
        const session = await window.ai.languageModel.create({
          systemPrompt: 'Suggest 3 to 5 concise single-word topic tags for this content. Output comma separated tags only.',
        });
        const res = await session.prompt(text);
        session.destroy();
        return res
          .split(/[,;\n]/)
          .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
          .filter((t) => t.length > 0)
          .slice(0, 5);
      } catch {
        // fallback
      }
    }
    return this.fallback.suggestTags(text);
  }

  async generateFlashcards(text: string): Promise<Flashcard[]> {
    if (window.ai?.languageModel) {
      try {
        const session = await window.ai.languageModel.create({
          systemPrompt: 'Generate 3 flashcards from the text in JSON array format: [{"front": "Question/Concept", "back": "Answer/Explanation"}]. Return only valid JSON array.',
        });
        const res = await session.prompt(text);
        session.destroy();
        const jsonMatch = res.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        // fallback
      }
    }
    return this.fallback.generateFlashcards(text);
  }
}
