import type { AIServiceProvider, ProviderAvailability, AnswerResponse, Flashcard } from './types';
import type { Note, UserSettings } from '../../schemas/types';
import { ChromeBuiltinAIProvider } from './builtinProvider';
import { CloudAIProvider } from './cloudProvider';
import { FallbackAIProvider } from './fallbackProvider';
import { SettingsRepository } from '../../repositories/settingsRepository';

const MAX_INPUT_CHARS = 24000; // ~6000 tokens safe limit

export class AIService {
  private static builtinProvider = new ChromeBuiltinAIProvider();
  private static cloudProvider: CloudAIProvider | null = null;
  private static fallbackProvider = new FallbackAIProvider();

  static async getActiveProvider(): Promise<{ provider: AIServiceProvider; availability: ProviderAvailability }> {
    const settings = await SettingsRepository.getSettings();

    if (settings.ai.provider === 'cloud' && settings.ai.optInCloudProcessing) {
      if (!this.cloudProvider) {
        this.cloudProvider = new CloudAIProvider(settings.ai);
      } else {
        this.cloudProvider.updateSettings(settings.ai);
      }
      const avail = await this.cloudProvider.checkAvailability();
      if (avail.available) {
        return { provider: this.cloudProvider, availability: avail };
      }
    }

    if (settings.ai.provider === 'builtin') {
      const avail = await this.builtinProvider.checkAvailability();
      if (avail.available) {
        return { provider: this.builtinProvider, availability: avail };
      }
    }

    const avail = await this.fallbackProvider.checkAvailability();
    return { provider: this.fallbackProvider, availability: avail };
  }

  private static sanitizeInput(text: string): string {
    if (!text) return '';
    if (text.length > MAX_INPUT_CHARS) {
      return text.slice(0, MAX_INPUT_CHARS) + '\n\n...[Content truncated for processing]';
    }
    return text;
  }

  static async summarize(text: string): Promise<string> {
    const clean = this.sanitizeInput(text);
    const { provider } = await this.getActiveProvider();
    return provider.summarize(clean);
  }

  static async extractKeyPoints(text: string): Promise<string[]> {
    const clean = this.sanitizeInput(text);
    const { provider } = await this.getActiveProvider();
    return provider.extractKeyPoints(clean);
  }

  static async extractActionItems(text: string): Promise<string[]> {
    const clean = this.sanitizeInput(text);
    const { provider } = await this.getActiveProvider();
    return provider.extractActionItems(clean);
  }

  static async answerQuestion(question: string, contextNotes: Note[]): Promise<AnswerResponse> {
    const { provider } = await this.getActiveProvider();
    return provider.answerQuestion(question, contextNotes);
  }

  static async suggestTags(text: string): Promise<string[]> {
    const clean = this.sanitizeInput(text);
    const { provider } = await this.getActiveProvider();
    return provider.suggestTags(clean);
  }

  static async generateFlashcards(text: string): Promise<Flashcard[]> {
    const clean = this.sanitizeInput(text);
    const { provider } = await this.getActiveProvider();
    return provider.generateFlashcards(clean);
  }
}
