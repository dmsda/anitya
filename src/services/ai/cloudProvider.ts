import type { AIServiceProvider, ProviderAvailability, AnswerResponse, Flashcard } from './types';
import type { Note, AISettings } from '../../schemas/types';
import { FallbackAIProvider } from './fallbackProvider';

export class CloudAIProvider implements AIServiceProvider {
  readonly id = 'cloud';
  readonly name = 'Cloud LLM (OpenAI / Gemini Compatible)';
  private settings: AISettings;
  private fallback = new FallbackAIProvider();

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  updateSettings(settings: AISettings): void {
    this.settings = settings;
  }

  async checkAvailability(): Promise<ProviderAvailability> {
    if (!this.settings.optInCloudProcessing) {
      return {
        available: false,
        status: 'no',
        message: 'Cloud AI processing is disabled. You must explicitly opt-in in Settings.',
      };
    }

    if (!this.settings.cloudApiKey || this.settings.cloudApiKey.trim() === '') {
      return {
        available: false,
        status: 'no',
        message: 'No Cloud API key provided. Please configure your API key in Settings.',
      };
    }

    return {
      available: true,
      status: 'readily',
      message: `Cloud provider configured (${this.settings.cloudModel || 'gemini-2.5-flash'}).`,
    };
  }

  private async callLlm(prompt: string, systemPrompt?: string): Promise<string> {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      throw new Error(availability.message);
    }

    const apiKey = this.settings.cloudApiKey!;
    const model = this.settings.cloudModel || 'gemini-2.5-flash';
    const baseUrl = this.settings.cloudBaseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: this.settings.temperature ?? 0.3,
        max_tokens: this.settings.maxTokens ?? 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloud API request failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  async summarize(text: string): Promise<string> {
    try {
      return await this.callLlm(
        `Please summarize the following text concisely:\n\n${text}`,
        'You are a professional research assistant. Provide clear, accurate summaries.'
      );
    } catch (e) {
      console.warn('[Acitya] Cloud summarize failed, using fallback:', e);
      return this.fallback.summarize(text);
    }
  }

  async extractKeyPoints(text: string): Promise<string[]> {
    try {
      const res = await this.callLlm(
        `Extract 4 to 6 key takeaways from the following text. Return each bullet on a new line starting with -:\n\n${text}`
      );
      return res
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter((l) => l.length > 0);
    } catch {
      return this.fallback.extractKeyPoints(text);
    }
  }

  async extractActionItems(text: string): Promise<string[]> {
    try {
      const res = await this.callLlm(
        `Extract actionable tasks and action items from the following text. Return each item on a new line starting with -:\n\n${text}`
      );
      return res
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter((l) => l.length > 0);
    } catch {
      return this.fallback.extractActionItems(text);
    }
  }

  async answerQuestion(question: string, contextNotes: Note[]): Promise<AnswerResponse> {
    try {
      const contextText = contextNotes
        .map((n, i) => `[Document ${i + 1}: ${n.title}]\n${n.contentMarkdown}`)
        .join('\n\n---\n\n');

      const answer = await this.callLlm(
        `Context Documents:\n${contextText}\n\nQuestion: ${question}\n\nAnswer:`,
        'Answer strictly based on the provided context. If unknown from context, state so. Do not invent facts.'
      );

      const references = contextNotes.slice(0, 3).map((n) => ({
        id: n.id,
        title: n.title,
        sourceUrl: n.sourceUrl,
        type: n.type,
      }));

      return { answer, references };
    } catch {
      return this.fallback.answerQuestion(question, contextNotes);
    }
  }

  async suggestTags(text: string): Promise<string[]> {
    try {
      const res = await this.callLlm(
        `Suggest 4 relevant tags for this text. Return comma-separated lowercase tags only:\n\n${text}`
      );
      return res
        .split(/[,;\n]/)
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter((t) => t.length > 0)
        .slice(0, 5);
    } catch {
      return this.fallback.suggestTags(text);
    }
  }

  async generateFlashcards(text: string): Promise<Flashcard[]> {
    try {
      const res = await this.callLlm(
        `Create 3 to 4 flashcards from this text in valid JSON array format: [{"front": "Question/Term", "back": "Answer/Definition"}]. Return JSON only:\n\n${text}`
      );
      const match = res.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {
      // fallback
    }
    return this.fallback.generateFlashcards(text);
  }
}
